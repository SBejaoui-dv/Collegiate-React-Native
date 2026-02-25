import os
from typing import Any
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Blueprint, jsonify, request

# Always load backend env from api/.env (independent of current working directory).
API_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(API_ENV_PATH)

college_routes = Blueprint("college_routes", __name__, url_prefix="/api/college")

SCORECARD_API_KEY = os.getenv("COLLEGE_SCORECARD_API_KEY", "")
SCORECARD_BASE_URL = os.getenv(
    "COLLEGE_SCORECARD_BASE_URL",
    "https://api.data.gov/ed/collegescorecard/v1/schools",
)

# Keep payload small and stable for mobile.
SCORECARD_FIELDS = [
    "id",
    "school.name",
    "school.city",
    "school.state",
    "school.school_url",
    "school.online_only",
    "latest.student.size",
    "latest.admissions.admission_rate.overall",
    "latest.admissions.sat_scores.75th_percentile.critical_reading",
    "latest.admissions.sat_scores.75th_percentile.math",
    "latest.admissions.act_scores.75th_percentile.cumulative",
    "latest.cost.tuition.in_state",
    "latest.cost.tuition.out_of_state",
]

SORT_MAP = {
    "name": "school.name",
    "acceptance": "latest.admissions.admission_rate.overall",
    "tuition_in_state": "latest.cost.tuition.in_state",
    "student_size": "latest.student.size",
}


def to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def to_int(value: Any) -> int | None:
    float_value = to_float(value)
    if float_value is None:
        return None
    return int(float_value)


def normalize_college(raw: dict[str, Any]) -> dict[str, Any]:
    school_name = raw.get("school.name")
    if not school_name:
        return {}

    return {
        "id": to_int(raw.get("id")),
        "latest": {
            "school": {
                "name": school_name,
                "city": raw.get("school.city"),
                "state": raw.get("school.state"),
                "school_url": raw.get("school.school_url"),
                "online_only": to_int(raw.get("school.online_only")),
            },
            "student": {
                "size": to_int(raw.get("latest.student.size")),
            },
            "admissions": {
                "admission_rate": {
                    "overall": to_float(raw.get("latest.admissions.admission_rate.overall")),
                },
                "sat_scores": {
                    "percentile_75": {
                        "critical_reading": to_int(
                            raw.get("latest.admissions.sat_scores.75th_percentile.critical_reading")
                        ),
                        "math": to_int(raw.get("latest.admissions.sat_scores.75th_percentile.math")),
                    }
                },
                "act_scores": {
                    "percentile_75": {
                        "cumulative": to_int(
                            raw.get("latest.admissions.act_scores.75th_percentile.cumulative")
                        ),
                    }
                },
            },
            "cost": {
                "tuition": {
                    "in_state": to_int(raw.get("latest.cost.tuition.in_state")),
                    "out_of_state": to_int(raw.get("latest.cost.tuition.out_of_state")),
                }
            },
        },
    }


@college_routes.route("/search", methods=["GET"])
def search_colleges():
    if not SCORECARD_API_KEY:
        return jsonify({"error": "Missing COLLEGE_SCORECARD_API_KEY in backend env."}), 500

    per_page = request.args.get("per_page", "100").strip()
    try:
        per_page_int = max(1, min(int(per_page), 100))
    except ValueError:
        per_page_int = 100

    params: dict[str, Any] = {
        "api_key": SCORECARD_API_KEY,
        "per_page": str(per_page_int),
        "page": request.args.get("page", "0"),
        "fields": ",".join(SCORECARD_FIELDS),
    }

    query = request.args.get("name", "").strip()
    state = request.args.get("state", "").strip().upper()
    online_only = request.args.get("online_only", "").strip().lower()
    sort_by = request.args.get("sort_by", "name").strip()
    sort_order = request.args.get("sort_order", "asc").strip().lower()

    if query:
        params["school.name"] = query
    if state:
        params["school.state"] = state
    if online_only == "true":
        params["school.online_only"] = "1"

    scorecard_sort_field = SORT_MAP.get(sort_by, "school.name")
    params["_sort"] = f"-{scorecard_sort_field}" if sort_order == "desc" else scorecard_sort_field

    try:
        response = requests.get(SCORECARD_BASE_URL, params=params, timeout=15)
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        return jsonify({"error": f"Failed to fetch College Scorecard data: {exc}"}), 502

    raw_results = payload.get("results", [])
    normalized_results = [
        college for college in (normalize_college(item) for item in raw_results) if college
    ]

    return jsonify(
        {
            "metadata": payload.get("metadata", {}),
            "results": normalized_results,
        }
    )
