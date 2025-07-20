"""Tests for the herd app."""

from datetime import date

import pytest
from django.contrib.auth.models import User
from django.db import IntegrityError

from ..models import Cattle, Photo, PhotoCattle, WeightLog


@pytest.mark.django_db()
class TestCattleModel:
    """Test cases for the Cattle model."""

    def test_create_cattle(self) -> None:
        """Test creating a cattle instance."""
        cattle = Cattle.objects.create(
            tag_number="C001",
            name="Bessie",
            sex="cow",
            dob=date(2020, 1, 1),
            color="Brown",
            breed="Angus",
            horn_status="Polled",
        )
        assert cattle.tag_number == "C001"
        assert cattle.name == "Bessie"
        assert cattle.sex == "cow"
        assert cattle.status == "active"

    def test_cattle_string_representation(self) -> None:
        """Test string representation of cattle."""
        cattle = Cattle.objects.create(
            tag_number="C002",
            name="Ferdinand",
            sex="bull",
            color="Black",
            breed="Angus",
            horn_status="Horned",
        )
        assert str(cattle) == "C002 - Ferdinand"

    def test_cattle_without_name(self) -> None:
        """Test cattle without a name shows 'Unnamed'."""
        cattle = Cattle.objects.create(
            tag_number="C003",
            sex="heifer",
            color="Red",
            breed="Hereford",
            horn_status="Polled",
        )
        assert str(cattle) == "C003 - Unnamed"

    def test_unique_tag_number(self) -> None:
        """Test that tag numbers must be unique."""
        Cattle.objects.create(
            tag_number="C004",
            sex="steer",
            color="Black",
            breed="Angus",
            horn_status="Polled",
        )
        with pytest.raises(IntegrityError):
            Cattle.objects.create(
                tag_number="C004",
                sex="cow",
                color="Brown",
                breed="Jersey",
                horn_status="Horned",
            )

    def test_cattle_lineage(self) -> None:
        """Test cattle lineage relationships."""
        sire = Cattle.objects.create(
            tag_number="B001",
            name="Big Bull",
            sex="bull",
            color="Black",
            breed="Angus",
            horn_status="Polled",
        )
        dam = Cattle.objects.create(
            tag_number="C005",
            name="Mama Cow",
            sex="cow",
            color="Red",
            breed="Angus",
            horn_status="Polled",
        )
        calf = Cattle.objects.create(
            tag_number="C006",
            name="Baby",
            sex="calf",
            color="Black",
            breed="Angus",
            horn_status="Polled",
            sire=sire,
            dam=dam,
        )
        assert calf.sire == sire
        assert calf.dam == dam
        assert sire.sire_offspring.first() == calf
        assert dam.dam_offspring.first() == calf


@pytest.mark.django_db()
class TestPhotoModel:
    """Test cases for the Photo model."""

    def test_create_photo(self) -> None:
        """Test creating a photo instance."""
        user = User.objects.create_user(username="testuser", password="testpass123")
        photo = Photo.objects.create(
            file_path="cattle_photos/test.jpg",
            uploaded_by=user,
        )
        assert photo.uploaded_by == user
        assert photo.exif == {}
        assert photo.capture_time is None

    def test_photo_string_representation(self) -> None:
        """Test string representation of photo."""
        user = User.objects.create_user(username="testuser2", password="testpass123")
        photo = Photo.objects.create(
            file_path="cattle_photos/test2.jpg",
            uploaded_by=user,
        )
        # Test that the string contains Photo and the ID
        assert "Photo" in str(photo)
        assert str(photo.id) in str(photo)


@pytest.mark.django_db()
class TestPhotoCattleModel:
    """Test cases for the PhotoCattle model."""

    def test_create_photo_cattle_relationship(self) -> None:
        """Test creating a photo-cattle relationship."""
        user = User.objects.create_user(username="testuser3", password="testpass123")
        cattle = Cattle.objects.create(
            tag_number="C007",
            sex="cow",
            color="Brown",
            breed="Jersey",
            horn_status="Polled",
        )
        photo = Photo.objects.create(
            file_path="cattle_photos/test3.jpg",
            uploaded_by=user,
        )
        photo_cattle = PhotoCattle.objects.create(
            photo=photo,
            cattle=cattle,
        )
        assert photo_cattle.photo == photo
        assert photo_cattle.cattle == cattle

    def test_unique_together_constraint(self) -> None:
        """Test that photo-cattle pairs must be unique."""
        user = User.objects.create_user(username="testuser4", password="testpass123")
        cattle = Cattle.objects.create(
            tag_number="C008",
            sex="bull",
            color="Black",
            breed="Angus",
            horn_status="Horned",
        )
        photo = Photo.objects.create(
            file_path="cattle_photos/test4.jpg",
            uploaded_by=user,
        )
        PhotoCattle.objects.create(photo=photo, cattle=cattle)

        with pytest.raises(IntegrityError):
            PhotoCattle.objects.create(photo=photo, cattle=cattle)


@pytest.mark.django_db()
class TestWeightLogModel:
    """Test cases for the WeightLog model."""

    def test_create_weight_log(self) -> None:
        """Test creating a weight log instance."""
        cattle = Cattle.objects.create(
            tag_number="W001",
            name="Weight Test Cow",
            sex="cow",
            color="Brown",
            breed="Jersey",
            horn_status="Polled",
        )
        expected_weight = 450.5
        weight_log = WeightLog.objects.create(
            cattle=cattle,
            measured_at=date(2024, 1, 15),
            weight_kg=expected_weight,
            method="Scale",
        )
        assert weight_log.cattle == cattle
        assert weight_log.measured_at == date(2024, 1, 15)
        assert weight_log.weight_kg == expected_weight
        assert weight_log.method == "Scale"

    def test_weight_log_string_representation(self) -> None:
        """Test string representation of weight log."""
        cattle = Cattle.objects.create(
            tag_number="W002",
            sex="bull",
            color="Black",
            breed="Angus",
            horn_status="Horned",
        )
        weight_log = WeightLog.objects.create(
            cattle=cattle,
            measured_at=date(2024, 2, 1),
            weight_kg=650.0,
            method="Tape measure",
        )
        assert str(weight_log) == "W002 - 2024-02-01 - 650.0kg"

    def test_unique_cattle_date_constraint(self) -> None:
        """Test that cattle+date pairs must be unique."""
        cattle = Cattle.objects.create(
            tag_number="W003",
            sex="heifer",
            color="Red",
            breed="Hereford",
            horn_status="Polled",
        )
        WeightLog.objects.create(
            cattle=cattle,
            measured_at=date(2024, 3, 1),
            weight_kg=300.0,
            method="Visual estimate",
        )

        # Attempting to create another weight log for same cattle on same date should fail
        with pytest.raises(IntegrityError):
            WeightLog.objects.create(
                cattle=cattle,
                measured_at=date(2024, 3, 1),
                weight_kg=305.0,
                method="Scale",
            )

    def test_weight_log_ordering(self) -> None:
        """Test that weight logs are ordered by measured_at date."""
        cattle = Cattle.objects.create(
            tag_number="W004",
            sex="steer",
            color="Brown",
            breed="Angus",
            horn_status="Polled",
        )

        # Create weight logs in non-chronological order
        weight_log2 = WeightLog.objects.create(
            cattle=cattle,
            measured_at=date(2024, 2, 1),
            weight_kg=400.0,
            method="Scale",
        )
        weight_log1 = WeightLog.objects.create(
            cattle=cattle,
            measured_at=date(2024, 1, 1),
            weight_kg=350.0,
            method="Scale",
        )
        weight_log3 = WeightLog.objects.create(
            cattle=cattle,
            measured_at=date(2024, 3, 1),
            weight_kg=450.0,
            method="Scale",
        )

        # Verify they are retrieved in chronological order
        weight_logs = list(WeightLog.objects.filter(cattle=cattle))
        assert weight_logs[0] == weight_log1
        assert weight_logs[1] == weight_log2
        assert weight_logs[2] == weight_log3
