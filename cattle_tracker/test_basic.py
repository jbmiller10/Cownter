"""
Basic tests to ensure Django setup is working correctly.
"""

import pytest
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User


class BasicTestCase(TestCase):
    """Basic test case to verify Django setup."""

    def test_admin_url_exists(self):
        """Test that admin URL is accessible."""
        response = self.client.get(reverse("admin:index"))
        # Should redirect to login (302) since we're not authenticated
        self.assertEqual(response.status_code, 302)

    def test_api_url_exists(self):
        """Test that API URL is accessible."""
        response = self.client.get("/api/")
        # Should return 200 for DRF browsable API
        self.assertEqual(response.status_code, 200)


@pytest.mark.django_db
def test_user_creation():
    """Test user creation works correctly."""
    user = User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123"
    )
    assert user.username == "testuser"
    assert user.email == "test@example.com"
    assert user.check_password("testpass123")