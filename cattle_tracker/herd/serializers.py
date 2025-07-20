"""Serializers for the herd app."""

from typing import Any, ClassVar

from rest_framework import serializers

from .models import Cattle, Photo, PhotoCattle


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

