"""URL configuration for the herd app."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .viewsets import CattleViewSet, PhotoUploadView, PhotoViewSet

router = DefaultRouter()
router.register(r"cattle", CattleViewSet, basename="cattle")
router.register(r"photos", PhotoViewSet, basename="photo")

urlpatterns = [
    path("photos/upload/", PhotoUploadView.as_view(), name="photo-upload"),
    *router.urls,
]

