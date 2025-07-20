"""Tests for the herd app."""

from datetime import date

import pytest
from django.contrib.auth.models import User
from django.db import IntegrityError

from .models import Cattle, Photo, PhotoCattle


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
