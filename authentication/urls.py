"""URL patterns for authentication endpoints."""

from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView

from .views import CurrentUserView, LoginView, LogoutView, RefreshTokenView, RegisterView

app_name = "authentication"

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("register/", RegisterView.as_view(), name="register"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", RefreshTokenView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("user/", CurrentUserView.as_view(), name="current_user"),
]