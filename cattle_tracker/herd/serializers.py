"""Serializers for the herd app."""

from typing import ClassVar

from rest_framework import serializers

from .models import Cattle


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
            raise serializers.ValidationError(
                f"Invalid sex choice. Must be one of: {', '.join(sorted(self.VALID_SEX_CHOICES))}",
            )
        return value

    def validate_status(self, value: str) -> str:
        """Validate status choice."""
        if value not in self.VALID_STATUS_CHOICES:
            raise serializers.ValidationError(
                f"Invalid status choice. Must be one of: {', '.join(sorted(self.VALID_STATUS_CHOICES))}",
            )
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

