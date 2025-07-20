"""URL configuration for the herd app."""

from rest_framework.routers import DefaultRouter

from .viewsets import CattleViewSet

router = DefaultRouter()
router.register(r"cattle", CattleViewSet, basename="cattle")

urlpatterns = router.urls

