"""Serializers for the herd app."""

from typing import ClassVar

from rest_framework import serializers

from .models import Cattle


class CattleSerializer(serializers.ModelSerializer):
    """Serializer for Cattle model."""

    sire_tag = serializers.CharField(source="sire.tag_number", read_only=True, allow_null=True)
    dam_tag = serializers.CharField(source="dam.tag_number", read_only=True, allow_null=True)

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
        valid_choices = dict(self.Meta.model.SEX_CHOICES).keys()
        if value not in valid_choices:
            raise serializers.ValidationError(
                f"Invalid sex choice. Must be one of: {', '.join(valid_choices)}",
            )
        return value

    def validate_status(self, value: str) -> str:
        """Validate status choice."""
        valid_choices = dict(self.Meta.model.STATUS_CHOICES).keys()
        if value not in valid_choices:
            raise serializers.ValidationError(
                f"Invalid status choice. Must be one of: {', '.join(valid_choices)}",
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

