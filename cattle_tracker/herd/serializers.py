"""Serializers for the herd app."""

from datetime import date
from typing import Any, ClassVar

from rest_framework import serializers

from .models import Cattle, Photo, PhotoCattle, WeightLog
from django.db.models import Q


class CattleSerializer(serializers.ModelSerializer):
    """
    Serializer for Cattle model.

    Handles serialization/deserialization of cattle records with validation for:
    - Sex choices (cow, bull, steer, heifer, calf)
    - Status choices (active, archived)
    - Parent relationships (sire must be bull/steer, dam must be cow/heifer)
    - Self-parent prevention

    Includes read-only fields for parent tag numbers for convenience.
    """

    # Cache valid choices at class level to avoid recreation on each validation
    VALID_SEX_CHOICES: ClassVar[set[str]] = set(dict(Cattle.SEX_CHOICES).keys())
    VALID_STATUS_CHOICES: ClassVar[set[str]] = set(dict(Cattle.STATUS_CHOICES).keys())

    sire_tag = serializers.CharField(
        source="sire.tag_number",
        read_only=True,
        allow_null=True,
        help_text="Tag number of the sire (father)",
    )
    dam_tag = serializers.CharField(
        source="dam.tag_number",
        read_only=True,
        allow_null=True,
        help_text="Tag number of the dam (mother)",
    )

    class Meta:
        """Meta options for CattleSerializer."""

        model = Cattle
        fields: ClassVar[list[str]] = [
            "id",
            "tag_number",
            "name",
            "sex",
            "dob",
            "color",
            "breed",
            "horn_status",
            "status",
            "sire",
            "sire_tag",
            "dam",
            "dam_tag",
            "created_at",
            "updated_at",
        ]
        read_only_fields: ClassVar[list[str]] = ["created_at", "updated_at"]

    def validate_sex(self, value: str) -> str:
        """Validate sex choice."""
        if value not in self.VALID_SEX_CHOICES:
            valid_choices = ", ".join(sorted(self.VALID_SEX_CHOICES))
            msg = f"Invalid sex choice. Must be one of: {valid_choices}"
            raise serializers.ValidationError(msg)
        return value

    def validate_status(self, value: str) -> str:
        """Validate status choice."""
        if value not in self.VALID_STATUS_CHOICES:
            valid_choices = ", ".join(sorted(self.VALID_STATUS_CHOICES))
            msg = f"Invalid status choice. Must be one of: {valid_choices}"
            raise serializers.ValidationError(msg)
        return value

    def validate(self, attrs: dict) -> dict:
        """Validate cattle data."""
        # Ensure cattle cannot be its own parent
        if attrs.get("sire") and attrs.get("sire") == self.instance:
            raise serializers.ValidationError({"sire": "Cattle cannot be its own sire."})
        if attrs.get("dam") and attrs.get("dam") == self.instance:
            raise serializers.ValidationError({"dam": "Cattle cannot be its own dam."})

        # Validate sex-specific parentage rules
        if attrs.get("sire") and attrs["sire"].sex not in ["bull", "steer"]:
            raise serializers.ValidationError(
                {"sire": "Sire must be a bull or steer (formerly a bull)."},
            )
        if attrs.get("dam") and attrs["dam"].sex not in ["cow", "heifer"]:
            raise serializers.ValidationError({"dam": "Dam must be a cow or heifer."})

        return attrs


class PhotoSerializer(serializers.ModelSerializer):
    """
    Serializer for Photo model.

    Provides full photo representation including:
    - Auto-generated URLs for original, display, and thumbnail versions
    - Capture time and EXIF data
    - Upload metadata
    - Tagged cattle information
    """

    original_url = serializers.SerializerMethodField(
        help_text="URL to original image",
    )
    display_url = serializers.SerializerMethodField(
        help_text="URL to display-sized image (max 1280px)",
    )
    thumb_url = serializers.SerializerMethodField(
        help_text="URL to thumbnail image (max 300px)",
    )
    tagged_cattle = serializers.SerializerMethodField(
        help_text="List of cattle tagged in this photo",
    )
    uploaded_by_username = serializers.CharField(
        source="uploaded_by.username",
        read_only=True,
        help_text="Username of uploader",
    )

    class Meta:
        """Meta options for PhotoSerializer."""

        model = Photo
        fields: ClassVar[list[str]] = [
            "id",
            "original_url",
            "display_url",
            "thumb_url",
            "capture_time",
            "exif",
            "uploaded_at",
            "uploaded_by",
            "uploaded_by_username",
            "tagged_cattle",
        ]
        read_only_fields: ClassVar[list[str]] = [
            "uploaded_at",
            "uploaded_by",
            "uploaded_by_username",
        ]

    def get_original_url(self, obj: Photo) -> str | None:
        """Get URL for original image."""
        request = self.context.get("request")
        if obj.file_path and request:
            return request.build_absolute_uri(obj.file_path.url)
        return None

    def get_display_url(self, obj: Photo) -> str | None:
        """Get URL for display-sized image."""
        request = self.context.get("request")
        if obj.file_path and request:
            path_parts = str(obj.file_path).split("/")
            path_parts[-1] = "display_1280.jpg"
            display_path = "/".join(path_parts)
            return request.build_absolute_uri(f"/media/{display_path}")
        return None

    def get_thumb_url(self, obj: Photo) -> str | None:
        """Get URL for thumbnail image."""
        request = self.context.get("request")
        if obj.file_path and request:
            path_parts = str(obj.file_path).split("/")
            path_parts[-1] = "thumb_300.jpg"
            thumb_path = "/".join(path_parts)
            return request.build_absolute_uri(f"/media/{thumb_path}")
        return None

    def get_tagged_cattle(self, obj: Photo) -> list[dict]:
        """Get list of cattle tagged in this photo."""
        cattle_ids = PhotoCattle.objects.filter(photo=obj).values_list("cattle_id", flat=True)
        cattle = Cattle.objects.filter(id__in=cattle_ids).values(
            "id",
            "tag_number",
            "name",
        )
        return list(cattle)


class PhotoUploadSerializer(serializers.Serializer):
    """
    Serializer for photo upload endpoint.

    Handles multipart image upload with validation for:
    - File size (max 10MB)
    - MIME type (JPEG or HEIC)
    - Required image field
    """

    MAX_FILE_SIZE: ClassVar[int] = 10 * 1024 * 1024  # 10MB
    ALLOWED_MIME_TYPES: ClassVar[list[str]] = ["image/jpeg"]

    # Add HEIC support if available
    try:
        import pyheif
        ALLOWED_MIME_TYPES.append("image/heic")
    except ImportError:
        pass

    image = serializers.ImageField(
        required=True,
        help_text="Image file to upload (JPEG or HEIC)",
    )

    def validate_image(self, value: Any) -> Any:
        """Validate uploaded image."""
        if value.size > self.MAX_FILE_SIZE:
            max_size_mb = self.MAX_FILE_SIZE // (1024 * 1024)
            msg = f"Image file too large. Maximum size is {max_size_mb}MB."
            raise serializers.ValidationError(msg)

        if value.content_type not in self.ALLOWED_MIME_TYPES:
            allowed_formats = ", ".join(self.ALLOWED_MIME_TYPES)
            msg = f"Invalid image format. Allowed formats: {allowed_formats}"
            raise serializers.ValidationError(msg)

        return value


class PhotoTagSerializer(serializers.Serializer):
    """
    Serializer for photo tagging endpoint.

    Handles bulk tagging of cattle in photos with:
    - Validation of cattle IDs
    - Idempotent operation (no duplicate tags)
    """

    cattle_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        allow_empty=True,
        help_text="List of cattle IDs to tag in this photo",
    )

    def validate_cattle_ids(self, value: list[int]) -> list[int]:
        """Validate that all cattle IDs exist."""
        if not value:
            return value

        existing_ids = set(
            Cattle.objects.filter(
                id__in=value,
                status="active",
            ).values_list("id", flat=True),
        )

        invalid_ids = [cattle_id for cattle_id in value if cattle_id not in existing_ids]

        if invalid_ids:
            invalid_ids_str = ", ".join(map(str, invalid_ids))
            msg = f"Invalid cattle IDs: {invalid_ids_str}"
            raise serializers.ValidationError(msg)

        return value


class CattleDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for Cattle model with frontend-compatible field names.
    
    Maps backend field names to frontend expectations:
    - tag_number -> ear_tag
    - dob -> date_of_birth
    - sire -> father
    - dam -> mother
    """
    
    ear_tag = serializers.CharField(source='tag_number')
    date_of_birth = serializers.DateField(source='dob')
    father = serializers.PrimaryKeyRelatedField(
        source='sire',
        queryset=Cattle.objects.all(),
        allow_null=True,
        required=False
    )
    mother = serializers.PrimaryKeyRelatedField(
        source='dam',
        queryset=Cattle.objects.all(),
        allow_null=True,
        required=False
    )
    father_details = serializers.SerializerMethodField()
    mother_details = serializers.SerializerMethodField()
    latest_weight = serializers.SerializerMethodField()
    age_in_months = serializers.SerializerMethodField()
    
    # Map sex values from backend to frontend format
    sex = serializers.SerializerMethodField()
    horn_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Cattle
        fields = [
            'id', 'ear_tag', 'name', 'sex', 'date_of_birth',
            'color', 'breed', 'horn_status', 'status',
            'father', 'father_details', 'mother', 'mother_details',
            'created_at', 'updated_at',
            'latest_weight', 'age_in_months'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_sex(self, obj):
        """Convert backend sex values to frontend format."""
        sex_mapping = {
            'cow': 'F',
            'heifer': 'F',
            'bull': 'M',
            'steer': 'M',
            'calf': 'M'  # Default to M for calf, could be enhanced
        }
        return sex_mapping.get(obj.sex, 'M')
    
    def get_horn_status(self, obj):
        """Convert horn status to uppercase."""
        return obj.horn_status.upper()
    
    def get_father_details(self, obj):
        """Get father details if available."""
        if obj.sire:
            return CattleBasicSerializer(obj.sire).data
        return None
    
    def get_mother_details(self, obj):
        """Get mother details if available."""
        if obj.dam:
            return CattleBasicSerializer(obj.dam).data
        return None
    
    def get_latest_weight(self, obj):
        """Get the most recent weight measurement."""
        latest_log = obj.weight_logs.order_by('-measured_at').first()
        return float(latest_log.weight_kg) if latest_log else None
    
    def get_age_in_months(self, obj):
        """Calculate age in months."""
        if obj.dob:
            from datetime import date
            today = date.today()
            months = (today.year - obj.dob.year) * 12 + today.month - obj.dob.month
            if today.day < obj.dob.day:
                months -= 1
            return max(0, months)
        return 0


class CattleBasicSerializer(serializers.ModelSerializer):
    """
    Basic serializer for Cattle with minimal fields and frontend field names.
    Used for nested representations.
    """
    
    ear_tag = serializers.CharField(source='tag_number')
    date_of_birth = serializers.DateField(source='dob')
    sex = serializers.SerializerMethodField()
    horn_status = serializers.SerializerMethodField()
    age_in_months = serializers.SerializerMethodField()
    
    class Meta:
        model = Cattle
        fields = [
            'id', 'ear_tag', 'name', 'sex', 'date_of_birth',
            'color', 'breed', 'horn_status', 'age_in_months',
            'created_at', 'updated_at'
        ]
    
    def get_sex(self, obj):
        """Convert backend sex values to frontend format."""
        sex_mapping = {
            'cow': 'F',
            'heifer': 'F',
            'bull': 'M',
            'steer': 'M',
            'calf': 'M'
        }
        return sex_mapping.get(obj.sex, 'M')
    
    def get_horn_status(self, obj):
        """Convert horn status to uppercase."""
        return obj.horn_status.upper()
    
    def get_age_in_months(self, obj):
        """Calculate age in months."""
        if obj.dob:
            from datetime import date
            today = date.today()
            months = (today.year - obj.dob.year) * 12 + today.month - obj.dob.month
            if today.day < obj.dob.day:
                months -= 1
            return max(0, months)
        return 0


class CattleLineageSerializer(serializers.ModelSerializer):
    """
    Serializer for cattle lineage information.
    
    Provides comprehensive family tree data including:
    - Current cattle details
    - Parents (sire and dam)
    - Grandparents (if available)
    - Siblings (sharing same sire or dam)
    - Offspring (where this cattle is sire or dam)
    """
    
    # Use frontend field names
    current = serializers.SerializerMethodField()
    parents = serializers.SerializerMethodField()
    grandparents = serializers.SerializerMethodField()
    siblings = serializers.SerializerMethodField()
    offspring = serializers.SerializerMethodField()
    
    class Meta:
        model = Cattle
        fields = ['current', 'parents', 'grandparents', 'siblings', 'offspring']
    
    def get_current(self, obj):
        """Get current cattle details."""
        return CattleDetailSerializer(obj).data
    
    def get_parents(self, obj):
        """Get parent details."""
        parents = {
            'father': None,
            'mother': None
        }
        
        if obj.sire:
            parents['father'] = CattleBasicSerializer(obj.sire).data
        if obj.dam:
            parents['mother'] = CattleBasicSerializer(obj.dam).data
            
        return parents
    
    def get_grandparents(self, obj):
        """Get grandparent details."""
        grandparents = {
            'paternal_grandfather': None,
            'paternal_grandmother': None,
            'maternal_grandfather': None,
            'maternal_grandmother': None
        }
        
        if obj.sire:
            if obj.sire.sire:
                grandparents['paternal_grandfather'] = CattleBasicSerializer(obj.sire.sire).data
            if obj.sire.dam:
                grandparents['paternal_grandmother'] = CattleBasicSerializer(obj.sire.dam).data
                
        if obj.dam:
            if obj.dam.sire:
                grandparents['maternal_grandfather'] = CattleBasicSerializer(obj.dam.sire).data
            if obj.dam.dam:
                grandparents['maternal_grandmother'] = CattleBasicSerializer(obj.dam.dam).data
                
        return grandparents
    
    def get_siblings(self, obj):
        """Get siblings (cattle sharing same sire or dam)."""
        siblings = []
        
        # Find cattle with same sire or dam, excluding self
        sibling_query = Q()
        if obj.sire:
            sibling_query |= Q(sire=obj.sire)
        if obj.dam:
            sibling_query |= Q(dam=obj.dam)
            
        if sibling_query:
            sibling_cattle = Cattle.objects.filter(sibling_query).exclude(id=obj.id).distinct()
            siblings = CattleBasicSerializer(sibling_cattle, many=True).data
            
        return siblings
    
    def get_offspring(self, obj):
        """Get offspring (cattle where this is sire or dam)."""
        offspring = []
        
        if obj.sex in ['bull', 'steer']:
            # This cattle is a potential sire
            offspring_cattle = obj.sire_offspring.all()
        elif obj.sex in ['cow', 'heifer']:
            # This cattle is a potential dam
            offspring_cattle = obj.dam_offspring.all()
        else:
            offspring_cattle = Cattle.objects.none()
            
        if offspring_cattle:
            offspring = CattleBasicSerializer(offspring_cattle, many=True).data
            
        return offspring


class WeightLogSerializer(serializers.ModelSerializer):
    """
    Serializer for WeightLog model.

    Handles serialization/deserialization of weight measurements with validation for:
    - weight_kg must be greater than 0
    - measured_at date cannot be in the future
    """

    class Meta:
        """Meta options for WeightLogSerializer."""

        model = WeightLog
        fields: ClassVar[list[str]] = [
            "id",
            "cattle",
            "measured_at",
            "weight_kg",
            "method",
        ]
        read_only_fields: ClassVar[list[str]] = ["id", "cattle"]

    def validate_weight_kg(self, value: float) -> float:
        """Validate weight is positive."""
        if value <= 0:
            msg = "Weight must be greater than 0 kg."
            raise serializers.ValidationError(msg)
        return value

    def validate_measured_at(self, value: date) -> date:
        """Validate measurement date is not in the future."""
        from datetime import UTC, datetime

        today = datetime.now(tz=UTC).date()
        if value > today:
            msg = "Measurement date cannot be in the future."
            raise serializers.ValidationError(msg)
        return value

