"""Tests for photo upload and tagging API."""

from datetime import datetime
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from ..models import Cattle, Photo, PhotoCattle
from .fixtures.image_helpers import (
    create_large_jpeg,
    create_test_jpeg_with_exif,
    create_test_jpeg_without_exif,
    create_test_png,
)

# Constants
DEFAULT_PASSWORD = "testpass123"
TEST_CATTLE_COUNT = 3
SMALL_CATTLE_COUNT = 2

# Check if HEIC support is available
try:
    import pyheif  # noqa: F401
    HEIC_TESTS_ENABLED = True
except ImportError:
    HEIC_TESTS_ENABLED = False


@pytest.fixture()
def api_client() -> tuple[APIClient, User]:
    """Create authenticated API client."""
    client = APIClient()
    user = User.objects.create_user(username="testuser", password=DEFAULT_PASSWORD)
    token = Token.objects.create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client, user


@pytest.fixture()
def cattle_data() -> list[Cattle]:
    """Create test cattle."""
    cattle1 = Cattle.objects.create(
        tag_number="C001",
        name="Bessie",
        sex="cow",
        color="Brown",
        breed="Angus",
        horn_status="Polled",
    )
    cattle2 = Cattle.objects.create(
        tag_number="C002",
        name="Ferdinand",
        sex="bull",
        color="Black",
        breed="Angus",
        horn_status="Horned",
    )
    cattle3 = Cattle.objects.create(
        tag_number="C003",
        name="Daisy",
        sex="heifer",
        color="Black and White",
        breed="Holstein",
        horn_status="Dehorned",
    )
    return [cattle1, cattle2, cattle3]


@pytest.mark.django_db()
class TestPhotoUpload:
    """Test photo upload functionality."""

    def test_upload_jpeg_with_exif(self, api_client: tuple[APIClient, User]) -> None:
        """Test uploading JPEG with EXIF data."""
        client, user = api_client
        capture_time = datetime(2024, 1, 15, 14, 30)

        # Create test image
        image_data = create_test_jpeg_with_exif(capture_time=capture_time)
        image_file = SimpleUploadedFile(
            "test_photo.jpg",
            image_data.getvalue(),
            content_type="image/jpeg",
        )

        # Upload image
        url = reverse("photo-upload")
        response = client.post(url, {"image": image_file}, format="multipart")

        # Verify response
        assert response.status_code == status.HTTP_201_CREATED
        assert "id" in response.data
        assert "capture_time" in response.data
        assert "thumb_url" in response.data

        # Verify photo was created
        photo = Photo.objects.get(id=response.data["id"])
        assert photo.uploaded_by == user
        assert photo.capture_time.date() == capture_time.date()
        assert "DateTimeOriginal" in photo.exif

        # Verify files were created
        media_path = Path(photo.file_path.path).parent
        assert (media_path / "display_1280.jpg").exists()
        assert (media_path / "thumb_300.jpg").exists()

    def test_upload_jpeg_without_exif(self, api_client):
        """Test uploading JPEG without EXIF data."""
        client, user = api_client

        # Create test image
        image_data = create_test_jpeg_without_exif()
        image_file = SimpleUploadedFile(
            "test_photo_no_exif.jpg",
            image_data.getvalue(),
            content_type="image/jpeg",
        )

        # Upload image
        url = reverse("photo-upload")
        with patch("django.utils.timezone.now") as mock_now:
            mock_now.return_value = timezone.make_aware(datetime(2024, 1, 20, 10, 0))
            response = client.post(url, {"image": image_file}, format="multipart")

        # Verify response
        assert response.status_code == status.HTTP_201_CREATED

        # Verify photo uses current time when no EXIF
        photo = Photo.objects.get(id=response.data["id"])
        assert photo.capture_time.date() == datetime(2024, 1, 20).date()

    def test_upload_invalid_format(self, api_client):
        """Test uploading unsupported image format."""
        client, user = api_client

        # Create PNG image
        image_data = create_test_png()
        image_file = SimpleUploadedFile(
            "test_photo.png",
            image_data.getvalue(),
            content_type="image/png",
        )

        # Upload image
        url = reverse("photo-upload")
        response = client.post(url, {"image": image_file}, format="multipart")

        # Verify error
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid image format" in str(response.data)

    def test_upload_oversized_image(self, api_client):
        """Test uploading image exceeding size limit."""
        client, user = api_client

        # Create large image
        image_data = create_large_jpeg(size_mb=15)
        image_file = SimpleUploadedFile(
            "large_photo.jpg",
            image_data.getvalue(),
            content_type="image/jpeg",
        )

        # Upload image
        url = reverse("photo-upload")
        response = client.post(url, {"image": image_file}, format="multipart")

        # Verify error
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Image file too large" in str(response.data)

    def test_upload_no_auth(self):
        """Test uploading without authentication."""
        client = APIClient()

        # Create test image
        image_data = create_test_jpeg_with_exif()
        image_file = SimpleUploadedFile(
            "test_photo.jpg",
            image_data.getvalue(),
            content_type="image/jpeg",
        )

        # Upload image
        url = reverse("photo-upload")
        response = client.post(url, {"image": image_file}, format="multipart")

        # Verify auth required - SessionAuthentication returns 403 due to CSRF
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db()
class TestPhotoList:
    """Test photo listing functionality."""

    def test_list_photos(self, api_client):
        """Test listing photos with pagination."""
        client, user = api_client

        # Create test photos
        for i in range(25):
            Photo.objects.create(
                file_path=f"test/photo_{i}.jpg",
                capture_time=timezone.make_aware(datetime(2024, 1, i % 28 + 1)),
                uploaded_by=user,
            )

        # List photos
        url = reverse("photo-list")
        response = client.get(url)

        # Verify response
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 25
        assert len(response.data["results"]) == 20  # Default pagination
        assert response.data["next"] is not None

    def test_filter_by_capture_date(self, api_client):
        """Test filtering photos by capture date."""
        client, user = api_client

        # Create photos with different dates
        Photo.objects.create(
            file_path="photo1.jpg",
            capture_time=timezone.make_aware(datetime(2024, 1, 10)),
            uploaded_by=user,
        )
        Photo.objects.create(
            file_path="photo2.jpg",
            capture_time=timezone.make_aware(datetime(2024, 1, 15)),
            uploaded_by=user,
        )
        Photo.objects.create(
            file_path="photo3.jpg",
            capture_time=timezone.make_aware(datetime(2024, 1, 20)),
            uploaded_by=user,
        )

        # Filter by date range
        url = reverse("photo-list")
        response = client.get(url, {
            "capture_date_gte": "2024-01-12",
            "capture_date_lte": "2024-01-18",
        })

        # Verify results
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert "photo2.jpg" in response.data["results"][0]["original_url"]

    def test_filter_has_cattle(self, api_client, cattle_data):
        """Test filtering photos by whether they have tagged cattle."""
        client, user = api_client

        # Create photos
        photo1 = Photo.objects.create(
            file_path="photo1.jpg",
            capture_time=timezone.now(),
            uploaded_by=user,
        )
        photo2 = Photo.objects.create(
            file_path="photo2.jpg",
            capture_time=timezone.now(),
            uploaded_by=user,
        )

        # Tag cattle in photo1
        PhotoCattle.objects.create(photo=photo1, cattle=cattle_data[0])

        # Filter photos with cattle
        url = reverse("photo-list")
        response = client.get(url, {"has_cattle": "true"})

        # Verify results
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert "photo1.jpg" in response.data["results"][0]["original_url"]

        # Filter photos without cattle
        response = client.get(url, {"has_cattle": "false"})
        assert response.data["count"] == 1
        assert "photo2.jpg" in response.data["results"][0]["original_url"]


@pytest.mark.django_db()
class TestPhotoTagging:
    """Test photo tagging functionality."""

    def test_tag_cattle_in_photo(self, api_client, cattle_data):
        """Test tagging cattle in a photo."""
        client, user = api_client

        # Create photo
        photo = Photo.objects.create(
            file_path="test_photo.jpg",
            capture_time=timezone.now(),
            uploaded_by=user,
        )

        # Tag cattle
        url = reverse("photo-tags", kwargs={"pk": photo.id})
        cattle_ids = [cattle_data[0].id, cattle_data[1].id]
        response = client.post(url, {"cattle_ids": cattle_ids}, format="json")

        # Verify response
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["tagged_cattle"]) == 2

        # Verify database
        tags = PhotoCattle.objects.filter(photo=photo)
        assert tags.count() == 2
        assert set(tags.values_list("cattle_id", flat=True)) == set(cattle_ids)

    def test_tag_idempotency(self, api_client, cattle_data):
        """Test that tagging is idempotent."""
        client, user = api_client

        # Create photo with existing tag
        photo = Photo.objects.create(
            file_path="test_photo.jpg",
            capture_time=timezone.now(),
            uploaded_by=user,
        )
        PhotoCattle.objects.create(photo=photo, cattle=cattle_data[0])

        # Tag same cattle again plus new one
        url = reverse("photo-tags", kwargs={"pk": photo.id})
        cattle_ids = [cattle_data[0].id, cattle_data[1].id]
        response = client.post(url, {"cattle_ids": cattle_ids}, format="json")

        # Verify no duplicates
        assert response.status_code == status.HTTP_200_OK
        tags = PhotoCattle.objects.filter(photo=photo)
        assert tags.count() == 2

    def test_remove_all_tags(self, api_client, cattle_data):
        """Test removing all tags from a photo."""
        client, user = api_client

        # Create photo with tags
        photo = Photo.objects.create(
            file_path="test_photo.jpg",
            capture_time=timezone.now(),
            uploaded_by=user,
        )
        PhotoCattle.objects.create(photo=photo, cattle=cattle_data[0])
        PhotoCattle.objects.create(photo=photo, cattle=cattle_data[1])

        # Remove all tags
        url = reverse("photo-tags", kwargs={"pk": photo.id})
        response = client.post(url, {"cattle_ids": []}, format="json")

        # Verify tags removed
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["tagged_cattle"]) == 0
        assert PhotoCattle.objects.filter(photo=photo).count() == 0

    def test_tag_invalid_cattle(self, api_client):
        """Test tagging with invalid cattle IDs."""
        client, user = api_client

        # Create photo
        photo = Photo.objects.create(
            file_path="test_photo.jpg",
            capture_time=timezone.now(),
            uploaded_by=user,
        )

        # Try to tag non-existent cattle
        url = reverse("photo-tags", kwargs={"pk": photo.id})
        response = client.post(url, {"cattle_ids": [999, 1000]}, format="json")

        # Verify error
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid cattle IDs" in str(response.data)

    def test_tag_archived_cattle(self, api_client, cattle_data):
        """Test that archived cattle cannot be tagged."""
        client, user = api_client

        # Archive a cattle
        cattle = cattle_data[0]
        cattle.status = "archived"
        cattle.save()

        # Create photo
        photo = Photo.objects.create(
            file_path="test_photo.jpg",
            capture_time=timezone.now(),
            uploaded_by=user,
        )

        # Try to tag archived cattle
        url = reverse("photo-tags", kwargs={"pk": photo.id})
        response = client.post(url, {"cattle_ids": [cattle.id]}, format="json")

        # Verify error
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid cattle IDs" in str(response.data)


@pytest.mark.django_db()
class TestPhotoDetail:
    """Test photo detail functionality."""

    def test_get_photo_detail(self, api_client, cattle_data):
        """Test retrieving photo details."""
        client, user = api_client

        # Create photo with tags
        photo = Photo.objects.create(
            file_path="test_photo.jpg",
            capture_time=timezone.now(),
            uploaded_by=user,
            exif={"Make": "Test Camera", "Model": "Test Model"},
        )
        PhotoCattle.objects.create(photo=photo, cattle=cattle_data[0])

        # Get photo detail
        url = reverse("photo-detail", kwargs={"pk": photo.id})
        response = client.get(url)

        # Verify response
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == photo.id
        assert response.data["original_url"] is not None
        assert response.data["display_url"] is not None
        assert response.data["thumb_url"] is not None
        assert len(response.data["tagged_cattle"]) == 1
        assert response.data["exif"]["Make"] == "Test Camera"
        assert response.data["uploaded_by_username"] == "testuser"

    def test_delete_photo(self, api_client, tmp_path):
        """Test deleting a photo."""
        client, user = api_client

        # Create photo with mock files
        photo = Photo.objects.create(
            file_path="2024/01/test/original.jpg",
            capture_time=timezone.now(),
            uploaded_by=user,
        )

        # Mock file paths
        with patch.object(Path, "exists", return_value=True), \
             patch.object(Path, "unlink") as mock_unlink:

            # Delete photo
            url = reverse("photo-detail", kwargs={"pk": photo.id})
            response = client.delete(url)

            # Verify response
            assert response.status_code == status.HTTP_204_NO_CONTENT

            # Verify files were attempted to be deleted
            assert mock_unlink.call_count == 3  # original + 2 derivatives

        # Verify photo deleted from database
        assert Photo.objects.filter(id=photo.id).count() == 0
