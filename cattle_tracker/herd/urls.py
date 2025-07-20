"""URL configuration for the herd app."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .stats_views import breed_distribution, color_distribution, growth_stats, summary_stats
from .viewsets import CattleViewSet, PhotoUploadView, PhotoViewSet

router = DefaultRouter()
router.register(r"cattle", CattleViewSet, basename="cattle")
router.register(r"photos", PhotoViewSet, basename="photo")

urlpatterns = [
    path("photos/upload/", PhotoUploadView.as_view(), name="photo-upload"),
    # Statistics endpoints
    path("stats/summary/", summary_stats, name="stats-summary"),
    path("stats/color/", color_distribution, name="stats-color"),
    path("stats/breed/", breed_distribution, name="stats-breed"),
    path("stats/growth/", growth_stats, name="stats-growth"),
    *router.urls,
]

