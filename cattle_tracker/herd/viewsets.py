"""ViewSets for the herd app."""

from typing import ClassVar

from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample, OpenApiParameter
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


@extend_schema_view(
    list=extend_schema(
        summary="List all cattle",
        description="Retrieve a paginated list of cattle with optional filtering and search.",
        parameters=[
            OpenApiParameter(
                name="sex",
                description="Filter by sex (cow, bull, steer, heifer, calf)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="color",
                description="Filter by color (partial match, case-insensitive)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="status",
                description="Filter by status (active, archived)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="dob_gte",
                description="Filter by date of birth (greater than or equal)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="dob_lte",
                description="Filter by date of birth (less than or equal)",
                required=False,
                type=str,
            ),
        ],
        examples=[
            OpenApiExample(
                "List active cows",
                value={
                    "count": 25,
                    "next": "http://api.example.com/api/cattle/?page=2",
                    "previous": None,
                    "results": [
                        {
                            "id": 1,
                            "tag_number": "C001",
                            "name": "Bessie",
                            "sex": "cow",
                            "dob": "2020-01-15",
                            "color": "Brown",
                            "breed": "Angus",
                            "horn_status": "Polled",
                            "status": "active",
                            "sire": None,
                            "sire_tag": None,
                            "dam": None,
                            "dam_tag": None,
                            "created_at": "2024-01-01T00:00:00Z",
                            "updated_at": "2024-01-01T00:00:00Z",
                        }
                    ],
                },
                response_only=True,
            ),
        ],
    ),
    create=extend_schema(
        summary="Create a new cattle record",
        description="Create a new cattle entry with required fields.",
        examples=[
            OpenApiExample(
                "Create cow with lineage",
                value={
                    "tag_number": "C002",
                    "name": "Daisy",
                    "sex": "cow",
                    "dob": "2021-03-20",
                    "color": "Black and White",
                    "breed": "Holstein",
                    "horn_status": "Dehorned",
                    "sire": 5,
                    "dam": 3,
                },
                request_only=True,
            ),
        ],
    ),
    retrieve=extend_schema(
        summary="Get cattle details",
        description="Retrieve detailed information about a specific cattle by ID.",
    ),
    update=extend_schema(
        summary="Update cattle record",
        description="Update all fields of a cattle record (PUT).",
    ),
    partial_update=extend_schema(
        summary="Partially update cattle record",
        description="Update specific fields of a cattle record (PATCH).",
    ),
    destroy=extend_schema(
        summary="Delete cattle record",
        description="Permanently delete a cattle record from the database.",
    ),
)
class CattleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Cattle model supporting all CRUD operations.
    
    Provides endpoints for managing cattle records including:
    - Listing with pagination, filtering, and search
    - Creating new cattle records
    - Retrieving individual cattle details
    - Updating cattle information
    - Deleting cattle records
    - Archiving cattle (custom action)
    
    All endpoints require authentication via Token or Session.
    """

    queryset = Cattle.objects.select_related("sire", "dam").all()
    serializer_class = CattleSerializer
    filterset_class = CattleFilter
    search_fields: ClassVar[list[str]] = ["tag_number", "name", "color", "breed"]
    ordering_fields: ClassVar[list[str]] = ["tag_number", "name", "dob", "created_at"]
    ordering: ClassVar[list[str]] = ["tag_number"]

    @extend_schema(
        summary="Archive a cattle record",
        description="Set the status of a cattle record to 'archived'. This is a soft delete operation.",
        responses={
            204: None,
            404: {"description": "Cattle not found"},
        },
        examples=[
            OpenApiExample(
                "Archive cattle",
                description="Archive cattle with ID 1",
                value=None,
                response_only=True,
                status_codes=["204"],
            ),
        ],
    )
    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):  # noqa: ARG002
        """
        Archive a cattle record by setting its status to 'archived'.
        
        This is a soft delete operation that preserves the record in the database
        but marks it as archived. Archived cattle will still appear in queries
        when filtering by status='archived'.
        
        Returns:
            Response: Empty response with 204 No Content status
        """
        cattle = self.get_object()
        cattle.status = "archived"
        cattle.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

