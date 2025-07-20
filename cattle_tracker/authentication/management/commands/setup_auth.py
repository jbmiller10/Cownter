"""Management command to set up authentication groups and default user."""

import os

from django.contrib.auth.models import Group, Permission, User
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    """Set up authentication groups and default user."""

    help = "Create authentication groups and default user from environment variables"

    def handle(self, *args, **options) -> None:
        """Execute the command."""
        with transaction.atomic():
            self._create_groups()
            self._create_default_user()

    def _create_groups(self) -> None:
        """Create admin and viewer groups with appropriate permissions."""
        # Create or get admin group
        admin_group, created = Group.objects.get_or_create(name="admin")
        if created:
            self.stdout.write(self.style.SUCCESS("Created 'admin' group"))

        # Create or get viewer group
        viewer_group, created = Group.objects.get_or_create(name="viewer")
        if created:
            self.stdout.write(self.style.SUCCESS("Created 'viewer' group"))

        # Get all permissions for cattle-related models
        cattle_permissions = Permission.objects.filter(
            content_type__app_label="herd",
        )

        # Admin group gets all permissions
        admin_group.permissions.set(cattle_permissions)
        self.stdout.write(self.style.SUCCESS(f"Assigned {cattle_permissions.count()} permissions to 'admin' group"))

        # Viewer group gets only view permissions
        view_permissions = cattle_permissions.filter(codename__startswith="view_")
        viewer_group.permissions.set(view_permissions)
        self.stdout.write(self.style.SUCCESS(f"Assigned {view_permissions.count()} view permissions to 'viewer' group"))

    def _create_default_user(self) -> None:
        """Create default user from environment variables."""
        username = os.environ.get("DEFAULT_USER_USERNAME")
        password = os.environ.get("DEFAULT_USER_PASSWORD")
        email = os.environ.get("DEFAULT_USER_EMAIL", "")
        group_name = os.environ.get("DEFAULT_USER_GROUP", "admin")

        if not username or not password:
            self.stdout.write(
                self.style.WARNING(
                    "Skipping default user creation: DEFAULT_USER_USERNAME and DEFAULT_USER_PASSWORD not set",
                ),
            )
            return

        # Check if user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f"User '{username}' already exists"))
            return

        # Create the user
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            is_staff=group_name == "admin",
            is_superuser=False,
        )

        # Add user to the appropriate group
        try:
            group = Group.objects.get(name=group_name)
            user.groups.add(group)
            self.stdout.write(
                self.style.SUCCESS(f"Created user '{username}' and added to '{group_name}' group"),
            )
        except Group.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"Group '{group_name}' does not exist"),
            )
