"""Models for cattle herd management."""

from typing import ClassVar

from django.contrib.auth.models import User
from django.db import models


class Cattle(models.Model):
    """Model representing an individual cattle."""

    SEX_CHOICES: ClassVar[list[tuple[str, str]]] = [
        ("cow", "Cow"),
        ("bull", "Bull"),
        ("steer", "Steer"),
        ("heifer", "Heifer"),
        ("calf", "Calf"),
    ]

    STATUS_CHOICES: ClassVar[list[tuple[str, str]]] = [
        ("active", "Active"),
        ("archived", "Archived"),
    ]

    tag_number = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100, blank=True)
    sex = models.CharField(max_length=10, choices=SEX_CHOICES)
    dob = models.DateField(null=True, blank=True)
    color = models.CharField(max_length=50)
    breed = models.CharField(max_length=50)
    horn_status = models.CharField(max_length=50)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    sire = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sire_offspring",
    )
    dam = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dam_offspring",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        """Meta options for Cattle model."""

        verbose_name_plural = "Cattle"
        ordering: ClassVar[list[str]] = ["tag_number"]

    def __str__(self) -> str:
        """Return string representation of cattle."""
        return f"{self.tag_number} - {self.name or 'Unnamed'}"


class Photo(models.Model):
    """Model representing a photo of cattle."""

    file_path = models.ImageField(upload_to="cattle_photos/")
    capture_time = models.DateTimeField(null=True, blank=True)
    exif = models.JSONField(default=dict)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        """Meta options for Photo model."""

        ordering: ClassVar[list[str]] = ["-uploaded_at"]

    def __str__(self) -> str:
        """Return string representation of photo."""
        return f"Photo {self.id} - {self.uploaded_at.strftime('%Y-%m-%d %H:%M')}"


class PhotoCattle(models.Model):
    """Join table for many-to-many relationship between Photo and Cattle."""

    photo = models.ForeignKey(Photo, on_delete=models.CASCADE)
    cattle = models.ForeignKey(Cattle, on_delete=models.CASCADE)

    class Meta:
        """Meta options for PhotoCattle model."""

        unique_together: ClassVar[list[list[str]]] = [["photo", "cattle"]]
        verbose_name_plural = "Photo cattle relationships"

    def __str__(self) -> str:
        """Return string representation of photo-cattle relationship."""
        return f"{self.photo} - {self.cattle}"


class WeightLog(models.Model):
    """Model representing a weight measurement for cattle."""

    cattle = models.ForeignKey(Cattle, on_delete=models.CASCADE, related_name="weight_logs")
    measured_at = models.DateField()
    weight_kg = models.DecimalField(max_digits=5, decimal_places=1)
    method = models.CharField(max_length=24)

    class Meta:
        """Meta options for WeightLog model."""

        unique_together: ClassVar[list[list[str]]] = [["cattle", "measured_at"]]
        ordering: ClassVar[list[str]] = ["measured_at"]
        verbose_name = "Weight log"
        verbose_name_plural = "Weight logs"

    def __str__(self) -> str:
        """Return string representation of weight log."""
        return f"{self.cattle.tag_number} - {self.measured_at} - {self.weight_kg}kg"
