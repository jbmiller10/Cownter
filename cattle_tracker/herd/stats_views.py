"""Statistics views for the herd app."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from django.db.models import Count
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from .models import Cattle, WeightLog

if TYPE_CHECKING:
    from rest_framework.request import Request


@api_view(["GET"])
@permission_classes([AllowAny])
def summary_stats(_request: Request) -> JsonResponse:
    """
    Get summary statistics for the herd.

    Returns totals by status, distribution by sex, and average age.
    """
    # Total counts by status
    status_counts = Cattle.objects.values("status").annotate(count=Count("id"))
    totals = {item["status"]: item["count"] for item in status_counts}
    totals["total"] = sum(totals.values())

    # Count by sex
    sex_counts = Cattle.objects.filter(status="active").values("sex").annotate(count=Count("id"))
    by_sex = {item["sex"]: item["count"] for item in sex_counts}

    # Calculate average age for cattle with DOB
    today = timezone.now().date()
    active_with_dob = Cattle.objects.filter(status="active", dob__isnull=False)

    if active_with_dob.exists():
        # Calculate ages in days and then convert to years
        total_age_days = 0
        count = 0
        for cattle in active_with_dob:
            age_days = (today - cattle.dob).days
            total_age_days += age_days
            count += 1

        avg_age_years = (total_age_days / count) / 365.25 if count > 0 else 0
    else:
        avg_age_years = 0

    return JsonResponse({
        "totals": {
            "total": totals.get("total", 0),
            "active": totals.get("active", 0),
            "archived": totals.get("archived", 0),
        },
        "bySex": {
            "cow": by_sex.get("cow", 0),
            "bull": by_sex.get("bull", 0),
            "steer": by_sex.get("steer", 0),
            "heifer": by_sex.get("heifer", 0),
            "calf": by_sex.get("calf", 0),
        },
        "avgAge": round(avg_age_years, 2),
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def color_distribution(_request: Request) -> JsonResponse:
    """
    Get color distribution for active cattle.

    Returns count and percentage for each color.
    """
    color_counts = (
        Cattle.objects
        .filter(status="active")
        .values("color")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    total = sum(item["count"] for item in color_counts)

    distribution = []
    for item in color_counts:
        percentage = (item["count"] / total * 100) if total > 0 else 0
        distribution.append({
            "color": item["color"],
            "count": item["count"],
            "percentage": round(percentage, 1),
        })

    return JsonResponse({
        "total": total,
        "distribution": distribution,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def breed_distribution(_request: Request) -> JsonResponse:
    """
    Get breed distribution for active cattle.

    Returns count and percentage for each breed.
    """
    breed_counts = (
        Cattle.objects
        .filter(status="active")
        .values("breed")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    total = sum(item["count"] for item in breed_counts)

    distribution = []
    for item in breed_counts:
        percentage = (item["count"] / total * 100) if total > 0 else 0
        distribution.append({
            "breed": item["breed"],
            "count": item["count"],
            "percentage": round(percentage, 1),
        })

    return JsonResponse({
        "total": total,
        "distribution": distribution,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def growth_stats(request: Request) -> JsonResponse:
    """
    Get growth statistics for calves born in a specific year.

    Query parameter:
    - year: The birth year to filter by (required)

    Returns average weight by age in months for calves born that year.
    """
    year_param = request.GET.get("year")

    if not year_param:
        return JsonResponse(
            {"error": "Year parameter is required"},
            status=400,
        )

    try:
        year = int(year_param)
        MIN_YEAR = 1900
        if year < MIN_YEAR or year > timezone.now().date().year:
            msg = "Invalid year"
            raise ValueError(msg)
    except ValueError:
        return JsonResponse(
            {"error": "Invalid year parameter"},
            status=400,
        )

    # Get cattle born in the specified year
    cattle_in_year = Cattle.objects.filter(
        dob__year=year,
        dob__isnull=False,
    )

    if not cattle_in_year.exists():
        return JsonResponse({
            "year": year,
            "cattleCount": 0,
            "growthData": [],
        })

    # Get all weight logs for these cattle
    weight_logs = WeightLog.objects.filter(
        cattle__in=cattle_in_year,
    ).select_related("cattle")

    # Group weights by age in months
    growth_data: dict[int, list[Decimal]] = {}

    for log in weight_logs:
        if log.cattle.dob:
            # Calculate age in months at measurement
            age_days = (log.measured_at - log.cattle.dob).days
            age_months = int(age_days / 30.44)  # Average days in a month

            if age_months >= 0:  # Ignore any negative ages
                if age_months not in growth_data:
                    growth_data[age_months] = []
                growth_data[age_months].append(log.weight_kg)

    # Calculate averages
    result_data = []
    for age_months in sorted(growth_data.keys()):
        weights = growth_data[age_months]
        avg_weight = sum(weights) / len(weights)
        result_data.append({
            "age_months": age_months,
            "avg_weight": float(round(avg_weight, 1)),
            "count": len(weights),
        })

    return JsonResponse({
        "year": year,
        "cattleCount": cattle_in_year.count(),
        "growthData": result_data,
    })

