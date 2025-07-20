"""API tests for the herd app."""

from datetime import date

import pytest
from django.contrib.auth.models import Group, User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from herd.models import Cattle

# Constants for magic values
DEFAULT_PAGE_SIZE = 20
SMALL_TEST_SET_SIZE = 5
LARGE_TEST_SET_SIZE = 25
ACTIVE_CATTLE_COUNT = 3
DEFAULT_PASSWORD = "testpass123"  # noqa: S105


@pytest.fixture()
def api_client() -> APIClient:
    """Create an API client."""
    return APIClient()


@pytest.fixture()
def authenticated_client(api_client: APIClient) -> APIClient:
    """Create an authenticated API client."""
    user = User.objects.create_user(username="testuser", password=DEFAULT_PASSWORD)
    # Add user to viewer group for read permissions
    viewer_group, _ = Group.objects.get_or_create(name="viewer")
    user.groups.add(viewer_group)
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture()
def admin_client(api_client: APIClient) -> APIClient:
    """Create an authenticated API client with admin permissions."""
    user = User.objects.create_user(username="adminuser", password=DEFAULT_PASSWORD)
    # Add user to admin group for full permissions
    admin_group, _ = Group.objects.get_or_create(name="admin")
    user.groups.add(admin_group)
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture()
def sample_cattle() -> Cattle:
    """Create sample cattle for testing."""
    return Cattle.objects.create(
        tag_number="T001",
        name="Test Cow",
        sex="cow",
        dob=date(2020, 1, 1),
        color="Brown",
        breed="Angus",
        horn_status="Polled",
    )


@pytest.fixture()
def cattle_list() -> list[Cattle]:
    """Create a list of cattle for testing."""
    cattle = [
        Cattle.objects.create(
                tag_number=f"T00{i+2}",
                name=f"Test Cattle {i+2}",
                sex="cow" if i % 2 == 0 else "bull",
                dob=date(2020, i + 1, 1),
                color="Brown" if i % 2 == 0 else "Black",
                breed="Angus",
                horn_status="Polled",
                status="active" if i < ACTIVE_CATTLE_COUNT else "archived",
            )
        for i in range(SMALL_TEST_SET_SIZE)
    ]
    return cattle


@pytest.mark.django_db()
class TestCattleListAPI:
    """Test cases for cattle list endpoint."""

    def test_list_cattle_unauthenticated(self, api_client: APIClient) -> None:
        """Test that unauthenticated requests are rejected."""
        url = reverse("cattle-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_cattle_authenticated(
        self,
        authenticated_client: APIClient,
        cattle_list: list[Cattle],  # noqa: ARG002
    ) -> None:
        """Test listing cattle with authentication."""
        url = reverse("cattle-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == SMALL_TEST_SET_SIZE
        assert len(response.data["results"]) == SMALL_TEST_SET_SIZE

    def test_list_cattle_pagination(self, authenticated_client: APIClient) -> None:
        """Test pagination of cattle list."""
        # Create 25 cattle
        for i in range(LARGE_TEST_SET_SIZE):
            Cattle.objects.create(
                tag_number=f"P{i:03d}",
                sex="cow",
                color="Brown",
                breed="Angus",
                horn_status="Polled",
            )

        url = reverse("cattle-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == LARGE_TEST_SET_SIZE
        assert len(response.data["results"]) == DEFAULT_PAGE_SIZE
        assert response.data["next"] is not None

    def test_filter_by_sex(
        self,
        authenticated_client: APIClient,
        cattle_list: list[Cattle],  # noqa: ARG002
    ) -> None:
        """Test filtering cattle by sex."""
        url = reverse("cattle-list")
        response = authenticated_client.get(url, {"sex": "cow"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == ACTIVE_CATTLE_COUNT
        for cattle in response.data["results"]:
            assert cattle["sex"] == "cow"

    def test_filter_by_color(
        self,
        authenticated_client: APIClient,
        cattle_list: list[Cattle],  # noqa: ARG002
    ) -> None:
        """Test filtering cattle by color."""
        url = reverse("cattle-list")
        response = authenticated_client.get(url, {"color": "Brown"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == ACTIVE_CATTLE_COUNT
        for cattle in response.data["results"]:
            assert "Brown" in cattle["color"]

    def test_filter_by_status(
        self,
        authenticated_client: APIClient,
        cattle_list: list[Cattle],  # noqa: ARG002
    ) -> None:
        """Test filtering cattle by status."""
        url = reverse("cattle-list")
        response = authenticated_client.get(url, {"status": "active"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == ACTIVE_CATTLE_COUNT
        for cattle in response.data["results"]:
            assert cattle["status"] == "active"

    def test_filter_by_dob_range(
        self,
        authenticated_client: APIClient,
        cattle_list: list[Cattle],  # noqa: ARG002
    ) -> None:
        """Test filtering cattle by date of birth range."""
        url = reverse("cattle-list")
        response = authenticated_client.get(
            url, {"dob_gte": "2020-01-01", "dob_lte": "2020-03-01"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == ACTIVE_CATTLE_COUNT

    def test_search_cattle(
        self,
        authenticated_client: APIClient,
        cattle_list: list[Cattle],  # noqa: ARG002
    ) -> None:
        """Test searching cattle by various fields."""
        url = reverse("cattle-list")
        # Search by tag number
        response = authenticated_client.get(url, {"search": "T003"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

        # Search by name
        response = authenticated_client.get(url, {"search": "Test Cattle 3"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_ordering_cattle(
        self,
        authenticated_client: APIClient,
        cattle_list: list[Cattle],  # noqa: ARG002
    ) -> None:
        """Test ordering cattle by different fields."""
        url = reverse("cattle-list")
        # Order by dob descending
        response = authenticated_client.get(url, {"ordering": "-dob"})
        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        for i in range(len(results) - 1):
            assert results[i]["dob"] >= results[i + 1]["dob"]


@pytest.mark.django_db()
class TestCattleRetrieveAPI:
    """Test cases for cattle retrieve endpoint."""

    def test_retrieve_cattle_unauthenticated(
        self,
        api_client: APIClient,
        sample_cattle: Cattle,
    ) -> None:
        """Test that unauthenticated requests are rejected."""
        url = reverse("cattle-detail", kwargs={"pk": sample_cattle.pk})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_cattle_authenticated(
        self,
        authenticated_client: APIClient,
        sample_cattle: Cattle,
    ) -> None:
        """Test retrieving a single cattle with authentication."""
        url = reverse("cattle-detail", kwargs={"pk": sample_cattle.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["ear_tag"] == "T001"
        assert response.data["name"] == "Test Cow"

    def test_retrieve_cattle_not_found(self, authenticated_client: APIClient) -> None:
        """Test retrieving non-existent cattle returns 404."""
        url = reverse("cattle-detail", kwargs={"pk": 99999})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_cattle_with_lineage(self, authenticated_client: APIClient) -> None:
        """Test retrieving cattle with sire and dam information."""
        sire = Cattle.objects.create(
            tag_number="S001", sex="bull", color="Black", breed="Angus", horn_status="Polled",
        )
        dam = Cattle.objects.create(
            tag_number="D001", sex="cow", color="Brown", breed="Angus", horn_status="Polled",
        )
        calf = Cattle.objects.create(
            tag_number="C001",
            sex="calf",
            color="Black",
            breed="Angus",
            horn_status="Polled",
            sire=sire,
            dam=dam,
        )

        url = reverse("cattle-detail", kwargs={"pk": calf.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["father"] == sire.pk
        assert response.data["father_details"]["ear_tag"] == "S001"
        assert response.data["mother"] == dam.pk
        assert response.data["mother_details"]["ear_tag"] == "D001"


@pytest.mark.django_db()
class TestCattleCreateAPI:
    """Test cases for cattle create endpoint."""

    def test_create_cattle_unauthenticated(self, api_client: APIClient) -> None:
        """Test that unauthenticated requests are rejected."""
        url = reverse("cattle-list")
        data = {
            "tag_number": "NEW001",
            "sex": "cow",
            "color": "Brown",
            "breed": "Angus",
            "horn_status": "Polled",
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_cattle_authenticated(self, admin_client: APIClient) -> None:
        """Test creating cattle with valid data."""
        url = reverse("cattle-list")
        data = {
            "tag_number": "NEW001",
            "name": "New Cow",
            "sex": "cow",
            "dob": "2021-05-15",
            "color": "Brown",
            "breed": "Jersey",
            "horn_status": "Polled",
        }
        response = admin_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["tag_number"] == "NEW001"
        assert response.data["name"] == "New Cow"
        assert response.data["status"] == "active"  # Default status

        # Verify in database
        cattle = Cattle.objects.get(tag_number="NEW001")
        assert cattle.name == "New Cow"

    def test_create_cattle_minimal_data(self, admin_client):
        """Test creating cattle with minimal required data."""
        url = reverse("cattle-list")
        data = {
            "tag_number": "MIN001",
            "sex": "heifer",
            "color": "Red",
            "breed": "Hereford",
            "horn_status": "Horned",
        }
        response = admin_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == ""  # Blank by default

    def test_create_cattle_duplicate_tag(self, admin_client, sample_cattle):
        """Test creating cattle with duplicate tag number fails."""
        url = reverse("cattle-list")
        data = {
            "tag_number": "T001",  # Already exists
            "sex": "bull",
            "color": "Black",
            "breed": "Angus",
            "horn_status": "Polled",
        }
        response = admin_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "tag_number" in response.data

    def test_create_cattle_invalid_sex(self, admin_client):
        """Test creating cattle with invalid sex choice."""
        url = reverse("cattle-list")
        data = {
            "tag_number": "INV001",
            "sex": "invalid",
            "color": "Brown",
            "breed": "Angus",
            "horn_status": "Polled",
        }
        response = admin_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "sex" in response.data

    def test_create_cattle_with_lineage(self, admin_client):
        """Test creating cattle with sire and dam."""
        sire = Cattle.objects.create(
            tag_number="S002", sex="bull", color="Black", breed="Angus", horn_status="Polled",
        )
        dam = Cattle.objects.create(
            tag_number="D002", sex="cow", color="Brown", breed="Angus", horn_status="Polled",
        )

        url = reverse("cattle-list")
        data = {
            "tag_number": "C002",
            "sex": "calf",
            "color": "Black",
            "breed": "Angus",
            "horn_status": "Polled",
            "sire": sire.pk,
            "dam": dam.pk,
        }
        response = admin_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["sire"] == sire.pk
        assert response.data["dam"] == dam.pk

    def test_create_cattle_invalid_sire_sex(self, admin_client):
        """Test creating cattle with non-bull/steer as sire fails."""
        invalid_sire = Cattle.objects.create(
            tag_number="INV_S", sex="cow", color="Brown", breed="Angus", horn_status="Polled",
        )

        url = reverse("cattle-list")
        data = {
            "tag_number": "C003",
            "sex": "calf",
            "color": "Black",
            "breed": "Angus",
            "horn_status": "Polled",
            "sire": invalid_sire.pk,
        }
        response = admin_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "sire" in response.data

    def test_create_cattle_invalid_dam_sex(self, admin_client):
        """Test creating cattle with non-cow/heifer as dam fails."""
        invalid_dam = Cattle.objects.create(
            tag_number="INV_D", sex="bull", color="Black", breed="Angus", horn_status="Polled",
        )

        url = reverse("cattle-list")
        data = {
            "tag_number": "C004",
            "sex": "calf",
            "color": "Brown",
            "breed": "Angus",
            "horn_status": "Polled",
            "dam": invalid_dam.pk,
        }
        response = admin_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "dam" in response.data

    def test_create_cattle_invalid_status(self, admin_client):
        """Test creating cattle with invalid status choice."""
        url = reverse("cattle-list")
        data = {
            "tag_number": "INV002",
            "sex": "cow",
            "color": "Brown",
            "breed": "Angus",
            "horn_status": "Polled",
            "status": "invalid_status",
        }
        response = admin_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "status" in response.data


@pytest.mark.django_db()
class TestCattleUpdateAPI:
    """Test cases for cattle update endpoints."""

    def test_update_cattle_unauthenticated(self, api_client, sample_cattle):
        """Test that unauthenticated requests are rejected."""
        url = reverse("cattle-detail", kwargs={"pk": sample_cattle.pk})
        data = {"name": "Updated Name"}
        response = api_client.patch(url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_partial_update_cattle(self, admin_client, sample_cattle):
        """Test partial update (PATCH) of cattle."""
        url = reverse("cattle-detail", kwargs={"pk": sample_cattle.pk})
        data = {"name": "Updated Cow", "color": "Black and White"}
        response = admin_client.patch(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated Cow"
        assert response.data["color"] == "Black and White"

        # Verify other fields unchanged
        assert response.data["tag_number"] == "T001"
        assert response.data["sex"] == "cow"

    def test_full_update_cattle(self, admin_client, sample_cattle):
        """Test full update (PUT) of cattle."""
        url = reverse("cattle-detail", kwargs={"pk": sample_cattle.pk})
        data = {
            "tag_number": "T001",  # Must provide all required fields
            "name": "Fully Updated",
            "sex": "cow",
            "dob": "2020-06-15",
            "color": "Spotted",
            "breed": "Holstein",
            "horn_status": "Dehorned",
        }
        response = admin_client.put(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Fully Updated"
        assert response.data["breed"] == "Holstein"

    def test_update_cattle_invalid_data(self, admin_client, sample_cattle):
        """Test updating cattle with invalid data."""
        url = reverse("cattle-detail", kwargs={"pk": sample_cattle.pk})
        data = {"sex": "invalid_sex"}
        response = admin_client.patch(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "sex" in response.data

    def test_update_cattle_self_parent(self, admin_client, sample_cattle):
        """Test that cattle cannot be its own parent."""
        url = reverse("cattle-detail", kwargs={"pk": sample_cattle.pk})
        data = {"sire": sample_cattle.pk}
        response = admin_client.patch(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "sire" in response.data

        # Also test for dam
        data = {"dam": sample_cattle.pk}
        response = admin_client.patch(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "dam" in response.data


@pytest.mark.django_db()
class TestCattleDeleteAPI:
    """Test cases for cattle delete endpoint."""

    def test_delete_cattle_unauthenticated(self, api_client, sample_cattle):
        """Test that unauthenticated requests are rejected."""
        url = reverse("cattle-detail", kwargs={"pk": sample_cattle.pk})
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_cattle_authenticated(self, admin_client, sample_cattle):
        """Test deleting cattle."""
        cattle_id = sample_cattle.pk
        url = reverse("cattle-detail", kwargs={"pk": cattle_id})
        response = admin_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify deletion
        assert not Cattle.objects.filter(pk=cattle_id).exists()

    def test_delete_cattle_not_found(self, admin_client):
        """Test deleting non-existent cattle returns 404."""
        url = reverse("cattle-detail", kwargs={"pk": 99999})
        response = admin_client.delete(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db()
class TestCattleArchiveAction:
    """Test cases for cattle archive custom action."""

    def test_archive_cattle_unauthenticated(self, api_client, sample_cattle):
        """Test that unauthenticated requests are rejected."""
        url = reverse("cattle-archive", kwargs={"pk": sample_cattle.pk})
        response = api_client.post(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_archive_cattle_authenticated(self, admin_client, sample_cattle):
        """Test archiving cattle."""
        url = reverse("cattle-archive", kwargs={"pk": sample_cattle.pk})
        response = admin_client.post(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify status changed
        sample_cattle.refresh_from_db()
        assert sample_cattle.status == "archived"

    def test_archive_already_archived_cattle(self, admin_client):
        """Test archiving already archived cattle."""
        cattle = Cattle.objects.create(
            tag_number="ARCH001",
            sex="steer",
            color="Brown",
            breed="Angus",
            horn_status="Polled",
            status="archived",
        )

        url = reverse("cattle-archive", kwargs={"pk": cattle.pk})
        response = admin_client.post(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT  # Still successful

        cattle.refresh_from_db()
        assert cattle.status == "archived"

    def test_archive_cattle_not_found(self, admin_client):
        """Test archiving non-existent cattle returns 404."""
        url = reverse("cattle-archive", kwargs={"pk": 99999})
        response = admin_client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db()
class TestCattleAPIIntegration:
    """Integration tests for cattle API."""

    def test_full_crud_cycle(self, admin_client):
        """Test complete CRUD cycle for cattle."""
        # Create
        create_url = reverse("cattle-list")
        create_data = {
            "tag_number": "CYCLE001",
            "name": "Cycle Test",
            "sex": "heifer",
            "color": "Brown",
            "breed": "Jersey",
            "horn_status": "Polled",
        }
        create_response = admin_client.post(create_url, create_data)
        assert create_response.status_code == status.HTTP_201_CREATED
        cattle_id = create_response.data["id"]

        # Read
        detail_url = reverse("cattle-detail", kwargs={"pk": cattle_id})
        read_response = admin_client.get(detail_url)
        assert read_response.status_code == status.HTTP_200_OK
        assert read_response.data["name"] == "Cycle Test"

        # Update
        update_data = {"name": "Updated Cycle Test", "sex": "cow"}
        update_response = admin_client.patch(detail_url, update_data)
        assert update_response.status_code == status.HTTP_200_OK
        assert update_response.data["name"] == "Updated Cycle Test"
        assert update_response.data["sex"] == "cow"

        # Archive
        archive_url = reverse("cattle-archive", kwargs={"pk": cattle_id})
        archive_response = admin_client.post(archive_url)
        assert archive_response.status_code == status.HTTP_204_NO_CONTENT

        # Verify archived
        verify_response = admin_client.get(detail_url)
        assert verify_response.status_code == status.HTTP_200_OK
        assert verify_response.data["status"] == "archived"

        # Delete
        delete_response = admin_client.delete(detail_url)
        assert delete_response.status_code == status.HTTP_204_NO_CONTENT

        # Verify deleted
        verify_deleted_response = admin_client.get(detail_url)
        assert verify_deleted_response.status_code == status.HTTP_404_NOT_FOUND

    def test_complex_filtering_scenario(self, authenticated_client):
        """Test complex filtering with multiple parameters."""
        # Create diverse cattle
        cattle_data = [
            {
                "tag_number": "F001",
                "sex": "cow",
                "color": "Brown",
                "dob": "2020-01-01",
                "breed": "Jersey",
                "horn_status": "Polled",
                "status": "active",
            },
            {
                "tag_number": "F002",
                "sex": "bull",
                "color": "Black",
                "dob": "2020-06-01",
                "breed": "Angus",
                "horn_status": "Horned",
                "status": "active",
            },
            {
                "tag_number": "F003",
                "sex": "cow",
                "color": "Brown and White",
                "dob": "2021-01-01",
                "breed": "Holstein",
                "horn_status": "Polled",
                "status": "archived",
            },
            {
                "tag_number": "F004",
                "sex": "heifer",
                "color": "Red",
                "dob": "2021-06-01",
                "breed": "Hereford",
                "horn_status": "Polled",
                "status": "active",
            },
        ]

        for data in cattle_data:
            Cattle.objects.create(**data)

        # Test multiple filters
        url = reverse("cattle-list")
        response = authenticated_client.get(
            url,
            {"sex": "cow", "status": "active", "dob_gte": "2020-01-01", "dob_lte": "2020-12-31"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["tag_number"] == "F001"


@pytest.mark.django_db()
class TestCattleLineageAPI:
    """Test cases for cattle lineage endpoint."""

    def test_lineage_unauthenticated(self, api_client, sample_cattle):
        """Test that unauthenticated requests are rejected."""
        url = reverse("cattle-lineage", kwargs={"pk": sample_cattle.pk})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_lineage_simple_cattle(self, authenticated_client, sample_cattle):
        """Test lineage for cattle with no relatives."""
        url = reverse("cattle-lineage", kwargs={"pk": sample_cattle.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        
        # Check structure
        assert "current" in response.data
        assert "parents" in response.data
        assert "grandparents" in response.data
        assert "siblings" in response.data
        assert "offspring" in response.data
        
        # Verify current cattle data with frontend field names
        assert response.data["current"]["ear_tag"] == "T001"
        assert response.data["current"]["name"] == "Test Cow"
        assert response.data["current"]["sex"] == "F"  # Mapped from 'cow' to 'F'
        
        # No relatives
        assert response.data["parents"]["father"] is None
        assert response.data["parents"]["mother"] is None
        assert response.data["siblings"] == []
        assert response.data["offspring"] == []

    def test_lineage_with_parents(self, authenticated_client):
        """Test lineage for cattle with parents."""
        # Create parents
        sire = Cattle.objects.create(
            tag_number="SIRE001",
            name="Thunder",
            sex="bull",
            color="Black",
            breed="Angus",
            horn_status="Horned",
            dob=date(2018, 1, 1),
        )
        dam = Cattle.objects.create(
            tag_number="DAM001",
            name="Daisy",
            sex="cow",
            color="Brown",
            breed="Angus",
            horn_status="Polled",
            dob=date(2018, 6, 1),
        )
        
        # Create offspring
        calf = Cattle.objects.create(
            tag_number="CALF001",
            name="Junior",
            sex="bull",
            color="Black",
            breed="Angus",
            horn_status="Polled",
            sire=sire,
            dam=dam,
            dob=date(2021, 3, 15),
        )
        
        url = reverse("cattle-lineage", kwargs={"pk": calf.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        
        # Check parents with frontend field names
        assert response.data["parents"]["father"]["ear_tag"] == "SIRE001"
        assert response.data["parents"]["father"]["name"] == "Thunder"
        assert response.data["parents"]["father"]["sex"] == "M"  # Mapped from 'bull' to 'M'
        
        assert response.data["parents"]["mother"]["ear_tag"] == "DAM001"
        assert response.data["parents"]["mother"]["name"] == "Daisy"
        assert response.data["parents"]["mother"]["sex"] == "F"  # Mapped from 'cow' to 'F'

    def test_lineage_with_grandparents(self, authenticated_client):
        """Test lineage for cattle with grandparents."""
        # Create grandparents
        paternal_grandsire = Cattle.objects.create(
            tag_number="PGS001",
            sex="bull",
            color="Red",
            breed="Hereford",
            horn_status="Horned",
        )
        paternal_granddam = Cattle.objects.create(
            tag_number="PGD001",
            sex="cow",
            color="White",
            breed="Charolais",
            horn_status="Polled",
        )
        
        # Create parents
        sire = Cattle.objects.create(
            tag_number="SIRE002",
            sex="bull",
            color="Mixed",
            breed="Cross",
            horn_status="Polled",
            sire=paternal_grandsire,
            dam=paternal_granddam,
        )
        dam = Cattle.objects.create(
            tag_number="DAM002",
            sex="cow",
            color="Brown",
            breed="Angus",
            horn_status="Polled",
        )
        
        # Create offspring
        calf = Cattle.objects.create(
            tag_number="CALF002",
            sex="heifer",
            color="Mixed",
            breed="Cross",
            horn_status="Polled",
            sire=sire,
            dam=dam,
        )
        
        url = reverse("cattle-lineage", kwargs={"pk": calf.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        
        # Check grandparents
        assert response.data["grandparents"]["paternal_grandfather"]["ear_tag"] == "PGS001"
        assert response.data["grandparents"]["paternal_grandmother"]["ear_tag"] == "PGD001"
        assert response.data["grandparents"]["maternal_grandfather"] is None
        assert response.data["grandparents"]["maternal_grandmother"] is None

    def test_lineage_with_siblings(self, authenticated_client):
        """Test lineage for cattle with siblings."""
        # Create parents
        sire = Cattle.objects.create(
            tag_number="SIRE003",
            sex="bull",
            color="Black",
            breed="Angus",
            horn_status="Horned",
        )
        dam = Cattle.objects.create(
            tag_number="DAM003",
            sex="cow",
            color="Brown",
            breed="Angus",
            horn_status="Polled",
        )
        
        # Create multiple offspring (siblings)
        calf1 = Cattle.objects.create(
            tag_number="CALF003",
            name="First",
            sex="bull",
            color="Black",
            breed="Angus",
            horn_status="Polled",
            sire=sire,
            dam=dam,
        )
        calf2 = Cattle.objects.create(
            tag_number="CALF004",
            name="Second",
            sex="heifer",
            color="Brown",
            breed="Angus",
            horn_status="Polled",
            sire=sire,
            dam=dam,
        )
        calf3 = Cattle.objects.create(
            tag_number="CALF005",
            name="Third",
            sex="bull",
            color="Mixed",
            breed="Angus",
            horn_status="Horned",
            sire=sire,  # Same sire, different dam (half-sibling)
            dam=None,
        )
        
        url = reverse("cattle-lineage", kwargs={"pk": calf1.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        
        # Check siblings (should include full siblings and half-siblings)
        siblings = response.data["siblings"]
        assert len(siblings) == 2  # calf2 and calf3
        
        sibling_tags = [s["ear_tag"] for s in siblings]
        assert "CALF004" in sibling_tags
        assert "CALF005" in sibling_tags
        assert "CALF003" not in sibling_tags  # Should not include self

    def test_lineage_with_offspring(self, authenticated_client):
        """Test lineage for cattle with offspring."""
        # Create a mature cow
        cow = Cattle.objects.create(
            tag_number="COW001",
            name="Matriarch",
            sex="cow",
            color="Brown",
            breed="Jersey",
            horn_status="Polled",
        )
        
        # Create offspring
        offspring1 = Cattle.objects.create(
            tag_number="OFF001",
            sex="heifer",
            color="Brown",
            breed="Jersey",
            horn_status="Polled",
            dam=cow,
        )
        offspring2 = Cattle.objects.create(
            tag_number="OFF002",
            sex="bull",
            color="Brown",
            breed="Jersey",
            horn_status="Polled",
            dam=cow,
        )
        
        url = reverse("cattle-lineage", kwargs={"pk": cow.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        
        # Check offspring
        offspring = response.data["offspring"]
        assert len(offspring) == 2
        
        offspring_tags = [o["ear_tag"] for o in offspring]
        assert "OFF001" in offspring_tags
        assert "OFF002" in offspring_tags

    def test_lineage_not_found(self, authenticated_client):
        """Test lineage for non-existent cattle returns 404."""
        url = reverse("cattle-lineage", kwargs={"pk": 99999})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

