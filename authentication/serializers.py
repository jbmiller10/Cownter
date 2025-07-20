"""Authentication serializers for the cattle tracker application."""

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user model."""

    class Meta:
        """Metadata for UserSerializer."""

        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "is_staff", "is_active")
        read_only_fields = ("id", "is_staff", "is_active")


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""

    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs: dict) -> dict:
        """Validate user credentials."""
        username = attrs.get("username")
        password = attrs.get("password")

        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                msg = "Unable to authenticate with provided credentials"
                raise serializers.ValidationError(msg)
            if not user.is_active:
                msg = "User account is disabled"
                raise serializers.ValidationError(msg)
        else:
            msg = "Must include username and password"
            raise serializers.ValidationError(msg)

        attrs["user"] = user
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})
    password2 = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})

    class Meta:
        """Metadata for RegisterSerializer."""

        model = User
        fields = ("username", "password", "password2", "email", "first_name", "last_name")
        extra_kwargs = {
            "first_name": {"required": True},
            "last_name": {"required": True},
            "email": {"required": True},
        }

    def validate(self, attrs: dict) -> dict:
        """Validate registration data."""
        if attrs["password"] != attrs["password2"]:
            msg = "Password fields didn't match"
            raise serializers.ValidationError({"password": msg})
        return attrs

    def create(self, validated_data: dict) -> User:
        """Create new user account."""
        validated_data.pop("password2")
        user = User.objects.create_user(**validated_data)
        return user


class TokenResponseSerializer(serializers.Serializer):
    """Serializer for token response."""

    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True)