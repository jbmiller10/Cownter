"""Admin configuration for herd models."""

from typing import ClassVar

from django.contrib import admin

from .models import Cattle, Photo, PhotoCattle, WeightLog


class PhotoCattleInline(admin.TabularInline):
    """Inline admin for PhotoCattle relationship."""

    model = PhotoCattle
    extra = 1


class WeightLogInline(admin.TabularInline):
    """Inline admin for WeightLog entries."""

    model = WeightLog
    extra = 1
    fields: ClassVar[list[str]] = ["measured_at", "weight_kg", "method"]
    ordering: ClassVar[list[str]] = ["-measured_at"]


@admin.register(Cattle)
class CattleAdmin(admin.ModelAdmin):
    """Admin configuration for Cattle model."""

    list_display: ClassVar[list[str]] = [
        "tag_number",
        "name",
        "sex",
        "color",
        "breed",
        "status",
        "created_at",
    ]
    list_filter: ClassVar[list[str]] = ["sex", "color", "status", "breed"]
    search_fields: ClassVar[list[str]] = ["tag_number", "name"]
    ordering: ClassVar[list[str]] = ["tag_number"]
    date_hierarchy = "created_at"
    autocomplete_fields: ClassVar[list[str]] = ["sire", "dam"]
    readonly_fields: ClassVar[list[str]] = ["created_at", "updated_at"]

    fieldsets: ClassVar[list] = [
        (
            "Basic Information",
            {
                "fields": ["tag_number", "name", "sex", "dob"],
            },
        ),
        (
            "Physical Characteristics",
            {
                "fields": ["color", "breed", "horn_status"],
            },
        ),
        (
            "Lineage",
            {
                "fields": ["sire", "dam"],
            },
        ),
        (
            "Status",
            {
                "fields": ["status", "created_at", "updated_at"],
            },
        ),
    ]
    inlines: ClassVar[list] = [PhotoCattleInline, WeightLogInline]


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    """Admin configuration for Photo model."""

    list_display: ClassVar[list[str]] = ["id", "uploaded_by", "capture_time", "uploaded_at"]
    list_filter: ClassVar[list[str]] = ["uploaded_at", "uploaded_by"]
    search_fields: ClassVar[list[str]] = ["id"]
    ordering: ClassVar[list[str]] = ["-uploaded_at"]
    date_hierarchy = "uploaded_at"
    readonly_fields: ClassVar[list[str]] = ["uploaded_at", "exif"]
    inlines: ClassVar[list] = [PhotoCattleInline]


@admin.register(PhotoCattle)
class PhotoCattleAdmin(admin.ModelAdmin):
    """Admin configuration for PhotoCattle model."""

    list_display: ClassVar[list[str]] = ["photo", "cattle"]
    list_filter: ClassVar[list[str]] = ["cattle__sex", "cattle__status"]
    search_fields: ClassVar[list[str]] = ["cattle__tag_number", "cattle__name"]
    autocomplete_fields: ClassVar[list[str]] = ["photo", "cattle"]
