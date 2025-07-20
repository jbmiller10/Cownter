"""ViewSets for the herd app."""

from typing import ClassVar

from django_filters import rest_framework as filters
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Cattle
from .serializers import CattleSerializer


class CattleFilter(filters.FilterSet):
    """Filter class for Cattle queryset."""

    sex = filters.ChoiceFilter(choices=Cattle.SEX_CHOICES)
    color = filters.CharFilter(lookup_expr="icontains")
    status = filters.ChoiceFilter(choices=Cattle.STATUS_CHOICES)
    dob_gte = filters.DateFilter(field_name="dob", lookup_expr="gte")
    dob_lte = filters.DateFilter(field_name="dob", lookup_expr="lte")

    class Meta:
        """Meta options for CattleFilter."""

        model = Cattle
        fields: ClassVar[list[str]] = ["sex", "color", "status", "dob_gte", "dob_lte"]


class CattleViewSet(viewsets.ModelViewSet):
    """ViewSet for Cattle model supporting all CRUD operations."""

    queryset = Cattle.objects.all()
    serializer_class = CattleSerializer
    filterset_class = CattleFilter
    search_fields: ClassVar[list[str]] = ["tag_number", "name", "color", "breed"]
    ordering_fields: ClassVar[list[str]] = ["tag_number", "name", "dob", "created_at"]
    ordering: ClassVar[list[str]] = ["tag_number"]

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):  # noqa: ARG002
        """Archive a cattle record."""
        cattle = self.get_object()
        cattle.status = "archived"
        cattle.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

