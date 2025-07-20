"""ViewSets for the herd app."""

from pathlib import Path
from typing import Any, ClassVar

from django.db import transaction
from django_filters import rest_framework as filters
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    extend_schema,
    extend_schema_view,
)
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.permissions import IsViewerOrAdmin
from .models import Cattle, Photo, PhotoCattle, WeightLog
from .serializers import (
    CattleSerializer,
    CattleDetailSerializer,
    CattleLineageSerializer,
    PhotoSerializer,
    PhotoTagSerializer,
    PhotoUploadSerializer,
    WeightLogSerializer,
)
from .utils.image_processing import (
    extract_exif_data,
    get_capture_time,
    save_image_derivatives,
)


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
                        },
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
    - Lineage information (custom action)

    All endpoints require authentication via Token or Session.
    """

    queryset = Cattle.objects.select_related("sire", "dam").all()
    serializer_class = CattleSerializer  # Default serializer
    filterset_class = CattleFilter
    search_fields: ClassVar[list[str]] = ["tag_number", "name", "color", "breed"]
    ordering_fields: ClassVar[list[str]] = ["tag_number", "name", "dob", "created_at"]
    ordering: ClassVar[list[str]] = ["tag_number"]
    permission_classes = [IsViewerOrAdmin]
    
    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action in ['retrieve', 'lineage']:
            # Use frontend-compatible serializer for detail views
            return CattleDetailSerializer
        return CattleSerializer

    @extend_schema(
        summary="Archive a cattle record",
        description="Set cattle status to 'archived'. This is a soft delete operation.",
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
    def archive(self, request: Any, pk: int | None = None) -> Response:  # noqa: ARG002
        """
        Archive a cattle record by setting its status to 'archived'.

        This is a soft delete operation that preserves the record in the database
        but marks it as archived. Archived cattle will still appear in queries
        when filtering by status='archived'.

        Returns
        -------
            Response: Empty response with 204 No Content status

        """
        cattle = self.get_object()
        cattle.status = "archived"
        cattle.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        summary="Get cattle lineage information",
        description="Retrieve comprehensive lineage information for a cattle including parents, grandparents, siblings, and offspring.",
        responses={
            200: CattleLineageSerializer,
            404: {"description": "Cattle not found"},
        },
        examples=[
            OpenApiExample(
                "Lineage with full family tree",
                value={
                    "current": {
                        "id": 1,
                        "ear_tag": "C001",
                        "name": "Bessie",
                        "sex": "F",
                        "date_of_birth": "2020-01-15",
                        "color": "Brown",
                        "breed": "Angus",
                        "horn_status": "POLLED",
                        "status": "active"
                    },
                    "parents": {
                        "father": {
                            "id": 5,
                            "ear_tag": "B005",
                            "name": "Thunder",
                            "sex": "M"
                        },
                        "mother": {
                            "id": 3,
                            "ear_tag": "C003",
                            "name": "Daisy",
                            "sex": "F"
                        }
                    },
                    "grandparents": {
                        "paternal_grandfather": None,
                        "paternal_grandmother": None,
                        "maternal_grandfather": {
                            "id": 8,
                            "ear_tag": "B008",
                            "name": "Rex",
                            "sex": "M"
                        },
                        "maternal_grandmother": {
                            "id": 9,
                            "ear_tag": "C009",
                            "name": "Rose",
                            "sex": "F"
                        }
                    },
                    "siblings": [
                        {
                            "id": 2,
                            "ear_tag": "C002",
                            "name": "Bella",
                            "sex": "F"
                        }
                    ],
                    "offspring": []
                },
                response_only=True,
            ),
        ],
    )
    @action(detail=True, methods=["get"])
    def lineage(self, request: Any, pk: int | None = None) -> Response:  # noqa: ARG002
        """
        Get comprehensive lineage information for a cattle.

        This endpoint provides a complete family tree including:
        - Current cattle details
        - Parents (sire and dam)
        - Grandparents (if available)
        - Siblings (cattle sharing same sire or dam)
        - Offspring (cattle where this is sire or dam)

        The queryset is optimized to minimize database queries by using
        select_related and prefetch_related where appropriate.

        Returns
        -------
            Response: Lineage data with nested family information

        """
        cattle = self.get_object()
        
        # Optimize queries by prefetching related data
        cattle = Cattle.objects.select_related(
            'sire', 'dam',
            'sire__sire', 'sire__dam',
            'dam__sire', 'dam__dam'
        ).prefetch_related(
            'sire_offspring', 'dam_offspring'
        ).get(pk=cattle.pk)
        
        serializer = CattleLineageSerializer(cattle)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PhotoFilter(filters.FilterSet):
    """Filter class for Photo queryset."""

    capture_date = filters.DateFilter(field_name="capture_time__date")
    capture_date_gte = filters.DateFilter(field_name="capture_time__date", lookup_expr="gte")
    capture_date_lte = filters.DateFilter(field_name="capture_time__date", lookup_expr="lte")
    has_cattle = filters.BooleanFilter(method="filter_has_cattle")

    class Meta:
        """Meta options for PhotoFilter."""

        model = Photo
        fields: ClassVar[list[str]] = [
            "capture_date",
            "capture_date_gte",
            "capture_date_lte",
            "has_cattle",
        ]

    def filter_has_cattle(self, queryset: Any, name: str, value: bool) -> Any:  # noqa: ARG002
        """Filter photos based on whether they have tagged cattle."""
        if value:
            return queryset.filter(photocattle__isnull=False).distinct()
        return queryset.filter(photocattle__isnull=True)


@extend_schema_view(
    list=extend_schema(
        summary="List all photos",
        description="Retrieve a paginated list of photos with optional filtering.",
        parameters=[
            OpenApiParameter(
                name="capture_date",
                description="Filter by exact capture date (YYYY-MM-DD)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="capture_date_gte",
                description="Filter by capture date (greater than or equal)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="capture_date_lte",
                description="Filter by capture date (less than or equal)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="has_cattle",
                description="Filter by whether photo has tagged cattle",
                required=False,
                type=bool,
            ),
        ],
    ),
    retrieve=extend_schema(
        summary="Get photo details",
        description="Retrieve detailed information about a specific photo by ID.",
    ),
    destroy=extend_schema(
        summary="Delete photo",
        description="Permanently delete a photo and its derivatives from the system.",
    ),
)
class PhotoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Photo model providing read and delete operations.

    Provides endpoints for:
    - Listing photos with pagination and filtering
    - Retrieving photo details including tagged cattle
    - Deleting photos (also removes files from disk)
    - Tagging cattle in photos (custom action)

    Upload is handled by a separate PhotoUploadView.
    """

    queryset = Photo.objects.select_related("uploaded_by").prefetch_related("photocattle_set")
    serializer_class = PhotoSerializer
    filterset_class = PhotoFilter
    ordering_fields: ClassVar[list[str]] = ["capture_time", "uploaded_at"]
    ordering: ClassVar[list[str]] = ["-capture_time"]
    permission_classes = [IsViewerOrAdmin]

    def destroy(self, request: Any, *args: Any, **kwargs: Any) -> Response:
        """Delete photo and remove files from disk."""
        photo = self.get_object()

        # Store file paths before deletion
        file_paths = []
        if photo.file_path:
            file_path = Path(photo.file_path.path)
            file_paths.append(file_path)
            # Also delete derivatives
            base_path = file_path.parent
            file_paths.extend([
                base_path / "display_1280.jpg",
                base_path / "thumb_300.jpg",
            ])

        # Delete from database
        photo.delete()

        # Delete files from disk
        for file_path in file_paths:
            if file_path.exists():
                file_path.unlink()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        summary="Tag cattle in photo",
        description="Add or update cattle tags for a photo. This operation is idempotent.",
        request=PhotoTagSerializer,
        responses={
            200: PhotoSerializer,
            400: {"description": "Invalid cattle IDs"},
        },
        examples=[
            OpenApiExample(
                "Tag cattle in photo",
                value={"cattle_ids": [1, 2, 3]},
                request_only=True,
            ),
        ],
    )
    @action(detail=True, methods=["post"], url_path="tags")
    def tags(self, request: Any, pk: int | None = None) -> Response:  # noqa: ARG002
        """
        Tag cattle in a photo.

        This endpoint replaces all existing tags with the provided cattle IDs.
        To remove all tags, send an empty list.
        """
        photo = self.get_object()
        serializer = PhotoTagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cattle_ids = serializer.validated_data["cattle_ids"]

        with transaction.atomic():
            # Remove existing tags
            PhotoCattle.objects.filter(photo=photo).delete()

            # Add new tags
            for cattle_id in cattle_ids:
                PhotoCattle.objects.create(photo=photo, cattle_id=cattle_id)

        # Return updated photo
        photo.refresh_from_db()
        return Response(
            PhotoSerializer(photo, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


@extend_schema(
    summary="Upload a photo",
    description="Upload a cattle photo with automatic EXIF extraction and derivative generation.",
    request=PhotoUploadSerializer,
    responses={
        201: PhotoSerializer,
        400: {"description": "Invalid image format or size"},
    },
    examples=[
        OpenApiExample(
            "Successful upload",
            value={
                "id": 1,
                "thumb_url": "http://api.example.com/media/2024/01/uuid/thumb_300.jpg",
                "capture_time": "2024-01-15T14:30:00Z",
            },
            response_only=True,
            status_codes=["201"],
        ),
    ],
)
class PhotoUploadView(APIView):
    """
    Custom view for handling photo uploads.

    Accepts multipart/form-data with an image file (JPEG or HEIC).
    Automatically:
    - Validates file size and format
    - Extracts EXIF data including capture time
    - Creates display (1280px) and thumbnail (300px) versions
    - Organizes files by date and UUID
    """

    parser_classes: ClassVar[list[type]] = [MultiPartParser]
    serializer_class = PhotoUploadSerializer
    permission_classes = [IsViewerOrAdmin]

    def post(self, request: Any) -> Response:
        """Handle photo upload."""
        serializer = PhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        image_file = serializer.validated_data["image"]

        # Extract EXIF data
        exif_data = extract_exif_data(image_file)
        capture_time = get_capture_time(exif_data)

        # Save image derivatives
        image_paths = save_image_derivatives(image_file, capture_time)

        # Create Photo instance
        photo = Photo.objects.create(
            file_path=image_paths["original"],
            capture_time=capture_time,
            exif=exif_data,
            uploaded_by=request.user,
        )

        # Return simplified response
        return Response(
            {
                "id": photo.id,
                "capture_time": photo.capture_time,
                "thumb_url": request.build_absolute_uri(f"/media/{image_paths['thumbnail']}"),
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    list=extend_schema(
        summary="List weight logs for a cattle",
        description="Retrieve all weight measurements for a specific cattle, sorted by date.",
        responses={
            200: WeightLogSerializer(many=True),
            404: {"description": "Cattle not found"},
        },
    ),
    create=extend_schema(
        summary="Add weight measurement",
        description="Record a new weight measurement for a cattle.",
        request=WeightLogSerializer,
        responses={
            201: WeightLogSerializer,
            400: {"description": "Invalid data or duplicate date"},
            404: {"description": "Cattle not found"},
        },
        examples=[
            OpenApiExample(
                "Add weight log",
                value={
                    "measured_at": "2024-01-15",
                    "weight_kg": 450.5,
                    "method": "scale",
                },
                request_only=True,
            ),
        ],
    ),
    destroy=extend_schema(
        summary="Delete weight measurement",
        description="Remove a weight measurement record.",
        responses={
            204: None,
            404: {"description": "Weight log not found"},
        },
    ),
)
class WeightLogViewSet(viewsets.GenericViewSet):
    """
    ViewSet for WeightLog model providing nested CRUD operations under cattle.

    Provides endpoints for:
    - Listing weight logs for a specific cattle (sorted by measured_at)
    - Creating new weight measurements
    - Deleting weight measurements

    Validates:
    - weight_kg must be greater than 0
    - measured_at cannot be in the future
    - Duplicate dates are prevented by database constraint
    """

    serializer_class = WeightLogSerializer
    lookup_field = "pk"
    permission_classes = [IsViewerOrAdmin]

    def get_queryset(self) -> Any:
        """Filter weight logs by cattle ID from URL."""
        cattle_id = self.kwargs.get("cattle_pk")
        return WeightLog.objects.filter(cattle_id=cattle_id).order_by("measured_at")

    def list(self, request: Any, cattle_pk: int | None = None) -> Response:  # noqa: ARG002
        """List all weight logs for a cattle."""
        # Verify cattle exists
        if not Cattle.objects.filter(pk=cattle_pk).exists():
            return Response(
                {"detail": "Cattle not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request: Any, cattle_pk: int | None = None) -> Response:
        """Create a new weight log for a cattle."""
        # Verify cattle exists
        try:
            cattle = Cattle.objects.get(pk=cattle_pk)
        except Cattle.DoesNotExist:
            return Response(
                {"detail": "Cattle not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                serializer.save(cattle=cattle)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                # Handle unique constraint violation
                if "unique constraint" in str(e).lower() or "duplicate" in str(e).lower():
                    return Response(
                        {"detail": "A weight log already exists for this date."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                raise
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(
        self,
        request: Any,  # noqa: ARG002
        pk: int | None = None,
        cattle_pk: int | None = None,
    ) -> Response:
        """Delete a weight log."""
        try:
            weight_log = WeightLog.objects.get(pk=pk, cattle_id=cattle_pk)
            weight_log.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except WeightLog.DoesNotExist:
            return Response(
                {"detail": "Weight log not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

