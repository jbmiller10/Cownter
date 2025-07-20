"""Custom permission classes for the cattle tracker application."""

from rest_framework import permissions


class IsAdminGroupMember(permissions.BasePermission):
    """Allow access only to users in the admin group."""

    def has_permission(self, request, view) -> bool:
        """Check if user is authenticated and in admin group."""
        return (
            request.user
            and request.user.is_authenticated
            and request.user.groups.filter(name="admin").exists()
        )


class IsViewerOrAdmin(permissions.BasePermission):
    """Allow viewers read-only access and admins full access."""

    def has_permission(self, request, view) -> bool:
        """Check permissions based on request method and user group."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Admin users have full access
        if request.user.groups.filter(name="admin").exists():
            return True

        # Viewer users have read-only access
        if request.user.groups.filter(name="viewer").exists():
            return request.method in permissions.SAFE_METHODS

        return False


class IsOwnerOrAdmin(permissions.BasePermission):
    """Allow owners and admins to access objects."""

    def has_object_permission(self, request, view, obj) -> bool:
        """Check object-level permissions."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Admin users have full access
        if request.user.groups.filter(name="admin").exists():
            return True

        # Check if object has an owner field and user is the owner
        if hasattr(obj, "owner") and obj.owner == request.user:
            return True

        # Check if object has a created_by field and user is the creator
        if hasattr(obj, "created_by") and obj.created_by == request.user:
            return True

        return False
