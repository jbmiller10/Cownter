"""Tests for authentication app."""

import pytest
from django.contrib.auth.models import Group, User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.fixture()
def api_client() -> APIClient:
    """Create an API client."""
    return APIClient()


@pytest.fixture()
def admin_user() -> User:
    """Create a user with admin permissions."""
    user = User.objects.create_user(
        username="adminuser",
        password="adminpass123",
        email="admin@test.com",
        is_staff=True,
    )
    admin_group, _ = Group.objects.get_or_create(name="admin")
    user.groups.add(admin_group)
    return user


@pytest.fixture()
def viewer_user() -> User:
    """Create a user with viewer permissions."""
    user = User.objects.create_user(
        username="vieweruser",
        password="viewerpass123",
        email="viewer@test.com",
    )
    viewer_group, _ = Group.objects.get_or_create(name="viewer")
    user.groups.add(viewer_group)
    return user


@pytest.mark.django_db()
class TestAuthentication:
    """Test authentication endpoints."""

    def test_login_success(self, api_client: APIClient, admin_user: User) -> None:
        """Test successful login."""
        url = reverse("authentication:login")
        response = api_client.post(
            url,
            {"username": "adminuser", "password": "adminpass123"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert "user" in response.data
        assert response.data["user"]["username"] == "adminuser"
        assert response.data["user"]["email"] == "admin@test.com"

    def test_login_invalid_credentials(self, api_client: APIClient) -> None:
        """Test login with invalid credentials."""
        url = reverse("authentication:login")
        response = api_client.post(
            url,
            {"username": "wronguser", "password": "wrongpass"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_missing_fields(self, api_client: APIClient) -> None:
        """Test login with missing fields."""
        url = reverse("authentication:login")

        # Missing password
        response = api_client.post(
            url,
            {"username": "testuser"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Missing username
        response = api_client.post(
            url,
            {"password": "testpass"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_success(self, api_client: APIClient) -> None:
        """Test successful user registration."""
        url = reverse("authentication:register")
        response = api_client.post(
            url,
            {
                "username": "newuser",
                "password": "newpass123",
                "password2": "newpass123",
                "email": "newuser@test.com",
                "first_name": "New",
                "last_name": "User",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert "access" in response.data
        assert "refresh" in response.data
        assert "user" in response.data
        assert response.data["user"]["username"] == "newuser"

        # Verify user was created
        assert User.objects.filter(username="newuser").exists()

    def test_register_password_mismatch(self, api_client: APIClient) -> None:
        """Test registration with mismatched passwords."""
        url = reverse("authentication:register")
        response = api_client.post(
            url,
            {
                "username": "newuser",
                "password": "newpass123",
                "password2": "differentpass",
                "email": "newuser@test.com",
                "first_name": "New",
                "last_name": "User",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data

    def test_register_duplicate_username(self, api_client: APIClient, admin_user: User) -> None:
        """Test registration with existing username."""
        url = reverse("authentication:register")
        response = api_client.post(
            url,
            {
                "username": "adminuser",  # Already exists
                "password": "newpass123",
                "password2": "newpass123",
                "email": "another@test.com",
                "first_name": "Another",
                "last_name": "User",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_token_refresh(self, api_client: APIClient, admin_user: User) -> None:
        """Test token refresh endpoint."""
        # First login to get tokens
        login_url = reverse("authentication:login")
        login_response = api_client.post(
            login_url,
            {"username": "adminuser", "password": "adminpass123"},
            format="json",
        )
        refresh_token = login_response.data["refresh"]

        # Test refresh
        refresh_url = reverse("authentication:token_refresh")
        response = api_client.post(
            refresh_url,
            {"refresh": refresh_token},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_token_verify(self, api_client: APIClient, admin_user: User) -> None:
        """Test token verification endpoint."""
        # First login to get tokens
        login_url = reverse("authentication:login")
        login_response = api_client.post(
            login_url,
            {"username": "adminuser", "password": "adminpass123"},
            format="json",
        )
        access_token = login_response.data["access"]

        # Test verify
        verify_url = reverse("authentication:token_verify")
        response = api_client.post(
            verify_url,
            {"token": access_token},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

    def test_logout(self, api_client: APIClient, admin_user: User) -> None:
        """Test logout endpoint."""
        # First login
        login_url = reverse("authentication:login")
        login_response = api_client.post(
            login_url,
            {"username": "adminuser", "password": "adminpass123"},
            format="json",
        )
        access_token = login_response.data["access"]
        refresh_token = login_response.data["refresh"]

        # Set authorization header
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Test logout
        logout_url = reverse("authentication:logout")
        response = api_client.post(
            logout_url,
            {"refresh": refresh_token},
            format="json",
        )

        assert response.status_code == status.HTTP_205_RESET_CONTENT

    def test_current_user_authenticated(self, api_client: APIClient, admin_user: User) -> None:
        """Test getting current user when authenticated."""
        # Login first
        login_url = reverse("authentication:login")
        login_response = api_client.post(
            login_url,
            {"username": "adminuser", "password": "adminpass123"},
            format="json",
        )
        access_token = login_response.data["access"]

        # Set authorization header
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Get current user
        user_url = reverse("authentication:current_user")
        response = api_client.get(user_url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "adminuser"
        assert response.data["email"] == "admin@test.com"
        assert response.data["is_staff"] is True

    def test_current_user_unauthenticated(self, api_client: APIClient) -> None:
        """Test getting current user when not authenticated."""
        user_url = reverse("authentication:current_user")
        response = api_client.get(user_url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db()
class TestPermissions:
    """Test permission enforcement."""

    def test_admin_can_create_cattle(self, api_client: APIClient, admin_user: User) -> None:
        """Test that admin users can create cattle."""
        # Login as admin
        login_url = reverse("authentication:login")
        login_response = api_client.post(
            login_url,
            {"username": "adminuser", "password": "adminpass123"},
            format="json",
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        # Try to create cattle
        url = "/api/cattle/"
        response = api_client.post(
            url,
            {
                "tag_number": "T001",
                "sex": "cow",
                "color": "Brown",
                "horn_status": "Polled",
                "breed": "Angus",
            },
            format="json",
        )

        if response.status_code != status.HTTP_201_CREATED:
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.data}")

        assert response.status_code == status.HTTP_201_CREATED

    def test_viewer_cannot_create_cattle(self, api_client: APIClient, viewer_user: User) -> None:
        """Test that viewer users cannot create cattle."""
        # Login as viewer
        login_url = reverse("authentication:login")
        login_response = api_client.post(
            login_url,
            {"username": "vieweruser", "password": "viewerpass123"},
            format="json",
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        # Try to create cattle
        url = "/api/cattle/"
        response = api_client.post(
            url,
            {
                "tag_number": "T001",
                "sex": "cow",
                "color": "Brown",
                "horn_status": "Polled",
                "breed": "Angus",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_viewer_can_read_cattle(self, api_client: APIClient, viewer_user: User) -> None:
        """Test that viewer users can read cattle data."""
        # Login as viewer
        login_url = reverse("authentication:login")
        login_response = api_client.post(
            login_url,
            {"username": "vieweruser", "password": "viewerpass123"},
            format="json",
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        # Try to list cattle
        url = "/api/cattle/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
