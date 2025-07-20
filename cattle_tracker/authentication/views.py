"""Authentication views for the cattle tracker application."""

from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)


class LoginView(APIView):
    """Handle user login and return JWT tokens."""

    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer

    def post(self, request) -> Response:
        """Process login request."""
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class RegisterView(generics.CreateAPIView):
    """Handle user registration."""

    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs) -> Response:
        """Create new user and return tokens."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    """Handle user logout by blacklisting refresh token."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request) -> Response:
        """Process logout request."""
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """Get or update current authenticated user."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self) -> User:
        """Return current authenticated user."""
        return self.request.user


class RefreshTokenView(TokenRefreshView):
    """Custom refresh token view with user data."""

    def post(self, request, *args, **kwargs) -> Response:
        """Process token refresh and include user data."""
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = request.user
            if user and user.is_authenticated:
                response.data["user"] = UserSerializer(user).data
        return response
