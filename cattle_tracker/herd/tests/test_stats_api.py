"""Tests for statistics API endpoints."""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from herd.models import Cattle, WeightLog


@pytest.fixture()
def api_client() -> APIClient:
    """Create an API client."""
    return APIClient()


@pytest.fixture()
def authenticated_client(api_client: APIClient) -> APIClient:
    """Create an authenticated API client."""
    user = User.objects.create_user(username="testuser", password="testpass123")
    token = Token.objects.create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return api_client


@pytest.fixture()
def cattle_with_stats() -> list[Cattle]:
    """Create cattle with various attributes for statistics testing."""
    today = date.today()
    cattle = []

    # Create diverse cattle for testing
    cattle_data = [
        # Active cattle
        {"tag_number": "S001", "sex": "cow", "color": "Brown", "breed": "Angus",
         "dob": today - timedelta(days=730), "status": "active"},  # 2 years old
        {"tag_number": "S002", "sex": "cow", "color": "Brown", "breed": "Angus",
         "dob": today - timedelta(days=1095), "status": "active"},  # 3 years old
        {"tag_number": "S003", "sex": "bull", "color": "Black", "breed": "Angus",
         "dob": today - timedelta(days=1460), "status": "active"},  # 4 years old
        {"tag_number": "S004", "sex": "heifer", "color": "Brown", "breed": "Jersey",
         "dob": today - timedelta(days=365), "status": "active"},  # 1 year old
        {"tag_number": "S005", "sex": "steer", "color": "Red", "breed": "Hereford",
         "dob": today - timedelta(days=548), "status": "active"},  # 1.5 years old
        {"tag_number": "S006", "sex": "calf", "color": "Black", "breed": "Angus",
         "dob": today - timedelta(days=90), "status": "active"},  # 3 months old
        # Archived cattle
        {"tag_number": "S007", "sex": "cow", "color": "White", "breed": "Holstein",
         "dob": today - timedelta(days=2190), "status": "archived"},  # 6 years old
        {"tag_number": "S008", "sex": "bull", "color": "Brown", "breed": "Jersey",
         "dob": today - timedelta(days=2555), "status": "archived"},  # 7 years old
        # Cattle without DOB (for avg age calculation)
        {"tag_number": "S009", "sex": "cow", "color": "Brown", "breed": "Angus",
         "dob": None, "status": "active"},
    ]

    for data in cattle_data:
        cattle_obj = Cattle.objects.create(
            tag_number=data["tag_number"],
            sex=data["sex"],
            color=data["color"],
            breed=data["breed"],
            dob=data["dob"],
            horn_status="Polled",
            status=data["status"],
        )
        cattle.append(cattle_obj)

    return cattle


@pytest.fixture()
def cattle_with_growth_data() -> list[Cattle]:
    """Create cattle with weight logs for growth testing."""
    today = date.today()
    cattle = []

    # Create calves born in 2023
    for i in range(3):
        calf = Cattle.objects.create(
            tag_number=f"G202300{i+1}",
            sex="calf",
            color="Brown",
            breed="Angus",
            dob=date(2023, 3, 1) + timedelta(days=i*30),
            horn_status="Polled",
            status="active",
        )
        cattle.append(calf)

        # Add weight logs at different ages
        birth_date = calf.dob
        for month in [0, 3, 6, 9, 12]:
            measured_date = birth_date + timedelta(days=month*30)
            if measured_date <= today:
                # Simulate growth: birth weight ~35kg, gain ~25kg/month
                weight = Decimal(35 + month * 25 + i * 2)
                WeightLog.objects.create(
                    cattle=calf,
                    measured_at=measured_date,
                    weight_kg=weight,
                    method="scale",
                )

    # Create calves born in 2024
    for i in range(2):
        calf = Cattle.objects.create(
            tag_number=f"G202400{i+1}",
            sex="calf",
            color="Black",
            breed="Jersey",
            dob=date(2024, 2, 1) + timedelta(days=i*45),
            horn_status="Polled",
            status="active",
        )
        cattle.append(calf)

        # Add weight logs
        birth_date = calf.dob
        for month in [0, 3, 6]:
            measured_date = birth_date + timedelta(days=month*30)
            if measured_date <= today:
                weight = Decimal(32 + month * 22 + i * 3)
                WeightLog.objects.create(
                    cattle=calf,
                    measured_at=measured_date,
                    weight_kg=weight,
                    method="tape",
                )

    return cattle


@pytest.mark.django_db()
class TestSummaryStatsAPI:
    """Test cases for summary statistics endpoint."""

    def test_summary_stats_empty_db(self, api_client: APIClient) -> None:
        """Test summary stats with empty database."""
        url = reverse("stats-summary")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["totals"]["total"] == 0
        assert data["totals"]["active"] == 0
        assert data["totals"]["archived"] == 0
        assert all(count == 0 for count in data["bySex"].values())
        assert data["avgAge"] == 0

    def test_summary_stats_with_data(
        self,
        api_client: APIClient,
        cattle_with_stats: list[Cattle],
    ) -> None:
        """Test summary stats with seeded data."""
        url = reverse("stats-summary")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Check totals
        assert data["totals"]["total"] == 9
        assert data["totals"]["active"] == 7
        assert data["totals"]["archived"] == 2

        # Check sex distribution (only active cattle)
        assert data["bySex"]["cow"] == 3
        assert data["bySex"]["bull"] == 1
        assert data["bySex"]["steer"] == 1
        assert data["bySex"]["heifer"] == 1
        assert data["bySex"]["calf"] == 1

        # Check average age (calculated from 6 active cattle with DOB)
        # Ages in years: 2, 3, 4, 1, 1.5, 0.25 = 11.75/6 ≈ 1.96
        assert 1.8 <= data["avgAge"] <= 2.1  # Allow for date calculation variance

    def test_summary_stats_no_auth_required(self, api_client: APIClient) -> None:
        """Test that summary stats don't require authentication."""
        url = reverse("stats-summary")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db()
class TestColorDistributionAPI:
    """Test cases for color distribution endpoint."""

    def test_color_distribution_empty_db(self, api_client: APIClient) -> None:
        """Test color distribution with empty database."""
        url = reverse("stats-color")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["total"] == 0
        assert data["distribution"] == []

    def test_color_distribution_with_data(
        self,
        api_client: APIClient,
        cattle_with_stats: list[Cattle],
    ) -> None:
        """Test color distribution with seeded data."""
        url = reverse("stats-color")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Only active cattle are counted
        assert data["total"] == 7

        # Check distribution
        colors = {item["color"]: item for item in data["distribution"]}

        assert colors["Brown"]["count"] == 4
        assert colors["Brown"]["percentage"] == round(4/7 * 100, 1)

        assert colors["Black"]["count"] == 2
        assert colors["Black"]["percentage"] == round(2/7 * 100, 1)

        assert colors["Red"]["count"] == 1
        assert colors["Red"]["percentage"] == round(1/7 * 100, 1)

        # Should be sorted by count descending
        assert data["distribution"][0]["color"] == "Brown"

    def test_color_distribution_archived_excluded(
        self,
        api_client: APIClient,
        cattle_with_stats: list[Cattle],
    ) -> None:
        """Test that archived cattle are excluded from color distribution."""
        url = reverse("stats-color")
        response = api_client.get(url)

        data = response.json()
        colors = [item["color"] for item in data["distribution"]]

        # White color is only on archived cattle
        assert "White" not in colors


@pytest.mark.django_db()
class TestBreedDistributionAPI:
    """Test cases for breed distribution endpoint."""

    def test_breed_distribution_empty_db(self, api_client: APIClient) -> None:
        """Test breed distribution with empty database."""
        url = reverse("stats-breed")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["total"] == 0
        assert data["distribution"] == []

    def test_breed_distribution_with_data(
        self,
        api_client: APIClient,
        cattle_with_stats: list[Cattle],
    ) -> None:
        """Test breed distribution with seeded data."""
        url = reverse("stats-breed")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["total"] == 7

        # Check distribution
        breeds = {item["breed"]: item for item in data["distribution"]}

        assert breeds["Angus"]["count"] == 5
        assert breeds["Angus"]["percentage"] == round(5/7 * 100, 1)

        assert breeds["Jersey"]["count"] == 1
        assert breeds["Hereford"]["count"] == 1

        # Should be sorted by count descending
        assert data["distribution"][0]["breed"] == "Angus"


@pytest.mark.django_db()
class TestGrowthStatsAPI:
    """Test cases for growth statistics endpoint."""

    def test_growth_stats_missing_year(self, api_client: APIClient) -> None:
        """Test growth stats without year parameter."""
        url = reverse("stats-growth")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Year parameter is required" in response.json()["error"]

    def test_growth_stats_invalid_year(self, api_client: APIClient) -> None:
        """Test growth stats with invalid year parameter."""
        url = reverse("stats-growth")

        # Non-numeric year
        response = api_client.get(url, {"year": "abc"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid year parameter" in response.json()["error"]

        # Year too old
        response = api_client.get(url, {"year": "1899"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Future year
        response = api_client.get(url, {"year": str(date.today().year + 1)})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_growth_stats_no_cattle_in_year(self, api_client: APIClient) -> None:
        """Test growth stats for year with no cattle."""
        url = reverse("stats-growth")
        response = api_client.get(url, {"year": "2020"})

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["year"] == 2020
        assert data["cattleCount"] == 0
        assert data["growthData"] == []

    def test_growth_stats_with_data(
        self,
        api_client: APIClient,
        cattle_with_growth_data: list[Cattle],
    ) -> None:
        """Test growth stats with weight log data."""
        url = reverse("stats-growth")
        response = api_client.get(url, {"year": "2023"})

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["year"] == 2023
        assert data["cattleCount"] == 3

        # Check growth data
        growth_data = data["growthData"]
        assert len(growth_data) > 0

        # Verify data structure
        for entry in growth_data:
            assert "age_months" in entry
            assert "avg_weight" in entry
            assert "count" in entry
            assert isinstance(entry["age_months"], int)
            assert isinstance(entry["avg_weight"], (int, float))
            assert isinstance(entry["count"], int)

        # Data should be sorted by age
        ages = [entry["age_months"] for entry in growth_data]
        assert ages == sorted(ages)

        # Weights should increase with age (general trend)
        if len(growth_data) > 1:
            first_weight = growth_data[0]["avg_weight"]
            last_weight = growth_data[-1]["avg_weight"]
            assert last_weight > first_weight

    def test_growth_stats_calculation_accuracy(
        self,
        api_client: APIClient,
    ) -> None:
        """Test accuracy of growth calculations."""
        # Create specific test data
        calf = Cattle.objects.create(
            tag_number="CALC001",
            sex="calf",
            color="Brown",
            breed="Angus",
            dob=date(2023, 1, 1),
            horn_status="Polled",
            status="active",
        )

        # Add weight logs at exact ages
        WeightLog.objects.create(
            cattle=calf,
            measured_at=date(2023, 1, 1),  # 0 months
            weight_kg=Decimal("40.0"),
            method="scale",
        )
        WeightLog.objects.create(
            cattle=calf,
            measured_at=date(2023, 4, 1),  # ~3 months
            weight_kg=Decimal("100.0"),
            method="scale",
        )

        url = reverse("stats-growth")
        response = api_client.get(url, {"year": "2023"})

        data = response.json()
        growth_data = {item["age_months"]: item for item in data["growthData"]}

        # Check that we have data at expected ages
        assert 0 in growth_data
        assert growth_data[0]["avg_weight"] == 40.0

        # April 1 is exactly 90 days after Jan 1, which is ~2.95 months
        # The calculation uses 30.44 days/month, so 90/30.44 = 2.96, which rounds to 2
        assert 2 in growth_data or 3 in growth_data
        if 2 in growth_data:
            assert growth_data[2]["avg_weight"] == 100.0
        else:
            assert growth_data[3]["avg_weight"] == 100.0
