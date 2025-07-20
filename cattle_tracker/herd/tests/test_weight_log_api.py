"""Tests for WeightLog API endpoints."""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from ..models import Cattle, WeightLog

User = get_user_model()


class WeightLogAPITestCase(TestCase):
    """Test case for WeightLog API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="testpass123")
        self.client.force_authenticate(user=self.user)

        # Create test cattle
        self.cattle = Cattle.objects.create(
            tag_number="C001",
            name="Test Cow",
            sex="cow",
            dob=date(2020, 1, 1),
            color="Brown",
            breed="Angus",
        )

        # Create another cattle for testing
        self.cattle2 = Cattle.objects.create(
            tag_number="C002",
            name="Test Bull",
            sex="bull",
            dob=date(2019, 6, 15),
            color="Black",
            breed="Angus",
        )

        # Base URL for weight logs
        self.list_url = f"/api/cattle/{self.cattle.id}/weights/"

    def test_list_weight_logs_empty(self):
        """Test listing weight logs when none exist."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])

    def test_list_weight_logs_sorted(self):
        """Test weight logs are returned sorted by measured_at."""
        # Create weight logs in random order
        WeightLog.objects.create(
            cattle=self.cattle,
            measured_at=date(2024, 1, 15),
            weight_kg=Decimal("450.5"),
            method="scale",
        )
        WeightLog.objects.create(
            cattle=self.cattle,
            measured_at=date(2024, 1, 1),
            weight_kg=Decimal("440.0"),
            method="scale",
        )
        WeightLog.objects.create(
            cattle=self.cattle,
            measured_at=date(2024, 2, 1),
            weight_kg=Decimal("460.0"),
            method="scale",
        )

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(len(data), 3)
        # Check sorted by measured_at ascending
        self.assertEqual(data[0]["measured_at"], "2024-01-01")
        self.assertEqual(data[1]["measured_at"], "2024-01-15")
        self.assertEqual(data[2]["measured_at"], "2024-02-01")

    def test_list_weight_logs_cattle_not_found(self):
        """Test listing weight logs for non-existent cattle."""
        response = self.client.get("/api/cattle/9999/weights/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json()["detail"], "Cattle not found.")

    def test_create_weight_log_success(self):
        """Test creating a weight log successfully."""
        data = {
            "measured_at": "2024-01-15",
            "weight_kg": "450.5",
            "method": "scale",
        }

        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify response data
        response_data = response.json()
        self.assertEqual(response_data["measured_at"], "2024-01-15")
        self.assertEqual(response_data["weight_kg"], "450.5")
        self.assertEqual(response_data["method"], "scale")
        self.assertEqual(response_data["cattle"], self.cattle.id)

        # Verify database
        self.assertEqual(WeightLog.objects.count(), 1)
        weight_log = WeightLog.objects.first()
        self.assertEqual(weight_log.cattle, self.cattle)
        self.assertEqual(weight_log.weight_kg, Decimal("450.5"))

    def test_create_weight_log_list_reflects_immediately(self):
        """Test that list reflects new entry immediately after POST."""
        # Create a weight log
        data = {
            "measured_at": "2024-01-15",
            "weight_kg": "450.5",
            "method": "scale",
        }

        create_response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        # List should immediately reflect the new entry
        list_response = self.client.get(self.list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        list_data = list_response.json()
        self.assertEqual(len(list_data), 1)
        self.assertEqual(list_data[0]["measured_at"], "2024-01-15")
        self.assertEqual(list_data[0]["weight_kg"], "450.5")

    def test_create_weight_log_invalid_weight(self):
        """Test creating weight log with invalid weight (<=0)."""
        # Test zero weight
        data = {
            "measured_at": "2024-01-15",
            "weight_kg": "0",
            "method": "scale",
        }

        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Weight must be greater than 0 kg", response.json()["weight_kg"][0])

        # Test negative weight
        data["weight_kg"] = "-10.5"
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Weight must be greater than 0 kg", response.json()["weight_kg"][0])

    def test_create_weight_log_future_date(self):
        """Test creating weight log with future date."""
        future_date = date.today() + timedelta(days=1)
        data = {
            "measured_at": future_date.isoformat(),
            "weight_kg": "450.5",
            "method": "scale",
        }

        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Measurement date cannot be in the future", response.json()["measured_at"][0])

    def test_create_weight_log_duplicate_date(self):
        """Test creating weight log with duplicate date."""
        # Create first weight log
        WeightLog.objects.create(
            cattle=self.cattle,
            measured_at=date(2024, 1, 15),
            weight_kg=Decimal("450.5"),
            method="scale",
        )

        # Try to create another with same date
        data = {
            "measured_at": "2024-01-15",
            "weight_kg": "460.0",
            "method": "estimate",
        }

        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("A weight log already exists for this date", response.json()["detail"])

    def test_create_weight_log_cattle_not_found(self):
        """Test creating weight log for non-existent cattle."""
        data = {
            "measured_at": "2024-01-15",
            "weight_kg": "450.5",
            "method": "scale",
        }

        response = self.client.post("/api/cattle/9999/weights/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json()["detail"], "Cattle not found.")

    def test_delete_weight_log_success(self):
        """Test deleting a weight log successfully."""
        # Create a weight log
        weight_log = WeightLog.objects.create(
            cattle=self.cattle,
            measured_at=date(2024, 1, 15),
            weight_kg=Decimal("450.5"),
            method="scale",
        )

        url = f"/api/cattle/{self.cattle.id}/weights/{weight_log.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify deletion
        self.assertEqual(WeightLog.objects.count(), 0)

    def test_delete_weight_log_not_found(self):
        """Test deleting non-existent weight log returns 404."""
        url = f"/api/cattle/{self.cattle.id}/weights/9999/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json()["detail"], "Weight log not found.")

    def test_delete_weight_log_wrong_cattle(self):
        """Test deleting weight log with wrong cattle ID returns 404."""
        # Create weight log for cattle1
        weight_log = WeightLog.objects.create(
            cattle=self.cattle,
            measured_at=date(2024, 1, 15),
            weight_kg=Decimal("450.5"),
            method="scale",
        )

        # Try to delete using cattle2's ID
        url = f"/api/cattle/{self.cattle2.id}/weights/{weight_log.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Verify weight log still exists
        self.assertEqual(WeightLog.objects.count(), 1)

    def test_weight_logs_isolated_by_cattle(self):
        """Test that weight logs are properly isolated by cattle."""
        # Create weight logs for both cattle
        WeightLog.objects.create(
            cattle=self.cattle,
            measured_at=date(2024, 1, 15),
            weight_kg=Decimal("450.5"),
            method="scale",
        )
        WeightLog.objects.create(
            cattle=self.cattle2,
            measured_at=date(2024, 1, 15),
            weight_kg=Decimal("600.0"),
            method="scale",
        )

        # List for cattle1
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["weight_kg"], "450.5")

        # List for cattle2
        response = self.client.get(f"/api/cattle/{self.cattle2.id}/weights/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["weight_kg"], "600.0")

    def test_authentication_required(self):
        """Test that authentication is required for all endpoints."""
        self.client.force_authenticate(user=None)

        # Test list
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test create
        data = {
            "measured_at": "2024-01-15",
            "weight_kg": "450.5",
            "method": "scale",
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test delete
        response = self.client.delete(f"/api/cattle/{self.cattle.id}/weights/1/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
