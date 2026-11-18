#!/usr/bin/env python3
"""
Repeatable Sri Lankan Geographical Reference ETL & Validation Pipeline.

Ingests Open Admin Data (provinces, districts, ds_divisions, gn_divisions),
postal code datasets (e.g., slwdc/Postal-Codes), and Sri Lanka Post authoritative
reference CSVs, normalizes names and 5-digit postal codes, rejects unverified or
conflicting postal codes, and emits a curated versioned dataset bundle alongside
an import validation report.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

POSTAL_CODE_RE = re.compile(r"^\d{5}$")


def normalize_name(value: str | None) -> str:
    """Collapse internal whitespace, strip edges, and apply clean title casing."""
    if not value:
        return ""
    cleaned = re.sub(r"\s+", " ", value.strip())
    # Preserve hyphenated/numbered tokens nicely while normalizing casing
    words: list[str] = []
    for token in cleaned.split(" "):
        if token.isdigit() or token == "-":
            words.append(token)
        elif token.isupper() and len(token) <= 3:
            words.append(token)
        else:
            words.append(token[:1].upper() + token[1:].lower())
    return " ".join(words)


def normalize_province_name(value: str | None) -> str:
    name = normalize_name(value)
    if name.lower().endswith(" province"):
        name = name[: -len(" province")].strip()
    return name


def parse_optional_float(value: str | None) -> float | None:
    if value is None or value.strip() == "":
        return None
    return float(value.strip())


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return [dict(row) for row in csv.DictReader(handle)]


def run_etl(
    raw_dir: Path,
    bundle_output: Path,
    report_output: Path,
    import_version: str,
) -> dict[str, Any]:
    provinces_raw = read_csv_rows(raw_dir / "provinces.csv")
    districts_raw = read_csv_rows(raw_dir / "districts.csv")
    ds_raw = read_csv_rows(raw_dir / "ds_divisions.csv")
    gn_raw = read_csv_rows(raw_dir / "gn_divisions.csv")
    sl_post_raw = read_csv_rows(raw_dir / "sl_post_reference.csv")
    postal_raw = read_csv_rows(raw_dir / "postal_codes.csv")

    provinces: list[dict[str, Any]] = []
    province_by_code: dict[str, dict[str, Any]] = {}
    for row in provinces_raw:
        code = row["code"].strip().upper()
        item = {
            "code": code,
            "name": normalize_province_name(row["name"]),
            "latitude": parse_optional_float(row.get("latitude")),
            "longitude": parse_optional_float(row.get("longitude")),
        }
        provinces.append(item)
        province_by_code[code] = item

    districts: list[dict[str, Any]] = []
    district_by_code: dict[str, dict[str, Any]] = {}
    for row in districts_raw:
        code = row["code"].strip().upper()
        province_code = row["province_code"].strip().upper()
        item = {
            "code": code,
            "province_code": province_code,
            "name": normalize_name(row["name"]),
            "latitude": parse_optional_float(row.get("latitude")),
            "longitude": parse_optional_float(row.get("longitude")),
        }
        districts.append(item)
        district_by_code[code] = item

    ds_divisions: list[dict[str, Any]] = []
    ds_by_code: dict[str, dict[str, Any]] = {}
    for row in ds_raw:
        code = row["code"].strip().upper()
        district_code = row["district_code"].strip().upper()
        item = {
            "code": code,
            "district_code": district_code,
            "name": normalize_name(row["name"]),
            "latitude": parse_optional_float(row.get("latitude")),
            "longitude": parse_optional_float(row.get("longitude")),
        }
        ds_divisions.append(item)
        ds_by_code[code] = item

    # Build authoritative Sri Lanka Post lookup keyed by 5-digit postal code
    sl_post_ref: dict[str, dict[str, str]] = {}
    for row in sl_post_raw:
        pcode = row["postal_code"].strip()
        if POSTAL_CODE_RE.match(pcode):
            sl_post_ref[pcode] = {
                "postal_code": pcode,
                "area_name": normalize_name(row["area_name"]),
                "district_name": normalize_name(row["district_name"]),
                "province_name": normalize_province_name(row["province_name"]),
            }

    postal_areas: list[dict[str, Any]] = []
    seen_postal_codes: dict[str, dict[str, Any]] = {}
    rejected: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []

    for row in postal_raw:
        pcode = (row.get("postal_code") or "").strip()
        if not POSTAL_CODE_RE.match(pcode):
            rejected.append(
                {
                    "postal_code": pcode,
                    "area_name": row.get("area_name", "").strip(),
                    "reason": "MALFORMED_POSTAL_CODE",
                }
            )
            continue

        ref = sl_post_ref.get(pcode)
        if ref is None:
            rejected.append(
                {
                    "postal_code": pcode,
                    "area_name": row.get("area_name", "").strip(),
                    "reason": "UNVERIFIED_NOT_IN_SRI_LANKA_POST_REF",
                }
            )
            continue

        province_code = (row.get("province_code") or "").strip().upper()
        district_code = (row.get("district_code") or "").strip().upper()
        ds_code = (row.get("ds_division_code") or "").strip().upper() or None
        area_name = normalize_name(row.get("area_name"))

        province = province_by_code.get(province_code)
        district = district_by_code.get(district_code)
        if province is None or district is None or district["province_code"] != province_code:
            conflicts.append(
                {
                    "postal_code": pcode,
                    "area_name": area_name,
                    "reason": "INVALID_OR_MISMATCHED_ADMIN_HIERARCHY",
                    "province_code": province_code,
                    "district_code": district_code,
                }
            )
            continue

        if (
            district["name"].lower() != ref["district_name"].lower()
            or province["name"].lower() != ref["province_name"].lower()
        ):
            conflicts.append(
                {
                    "postal_code": pcode,
                    "area_name": area_name,
                    "reason": "DISTRICT_OR_PROVINCE_CONFLICT_WITH_SL_POST",
                    "source_district": district["name"],
                    "ref_district": ref["district_name"],
                    "source_province": province["name"],
                    "ref_province": ref["province_name"],
                }
            )
            continue

        if ds_code is not None and ds_code not in ds_by_code:
            rejected.append(
                {
                    "postal_code": pcode,
                    "area_name": area_name,
                    "reason": f"UNKNOWN_DS_DIVISION:{ds_code}",
                }
            )
            continue

        candidate = {
            "postal_code": pcode,
            "area_name": area_name,
            "province_code": province_code,
            "district_code": district_code,
            "ds_division_code": ds_code,
            "latitude": parse_optional_float(row.get("latitude")),
            "longitude": parse_optional_float(row.get("longitude")),
            "is_active": True,
            "source_name": (row.get("source_name") or "slwdc/Postal-Codes").strip(),
            "source_reference": (row.get("source_reference") or "SriLankaPost").strip(),
            "import_version": import_version,
        }

        if pcode in seen_postal_codes:
            existing = seen_postal_codes[pcode]
            if (
                existing["area_name"].lower() != candidate["area_name"].lower()
                or existing["district_code"] != candidate["district_code"]
            ):
                conflicts.append(
                    {
                        "postal_code": pcode,
                        "area_name": area_name,
                        "reason": "DUPLICATE_CONFLICTING_POSTAL_CODE_IN_SOURCE",
                        "existing_area_name": existing["area_name"],
                    }
                )
            continue

        seen_postal_codes[pcode] = candidate
        postal_areas.append(candidate)

    valid_postal_codes = {item["postal_code"] for item in postal_areas}
    gn_divisions: list[dict[str, Any]] = []
    for row in gn_raw:
        code = row["code"].strip().upper()
        ds_code = row["ds_division_code"].strip().upper()
        if ds_code not in ds_by_code:
            rejected.append(
                {
                    "gn_code": code,
                    "name": normalize_name(row.get("name")),
                    "reason": f"UNKNOWN_DS_DIVISION:{ds_code}",
                }
            )
            continue
        raw_pcode = (row.get("postal_code") or "").strip()
        gn_pcode = raw_pcode if raw_pcode in valid_postal_codes else None
        gn_divisions.append(
            {
                "code": code,
                "ds_division_code": ds_code,
                "name": normalize_name(row["name"]),
                "postal_code": gn_pcode,
                "latitude": parse_optional_float(row.get("latitude")),
                "longitude": parse_optional_float(row.get("longitude")),
            }
        )

    generated_at = datetime.now(timezone.utc).isoformat()
    bundle = {
        "import_version": import_version,
        "generated_at": generated_at,
        "provinces": provinces,
        "districts": districts,
        "ds_divisions": ds_divisions,
        "gn_divisions": gn_divisions,
        "postal_areas": postal_areas,
    }

    report = {
        "import_version": import_version,
        "generated_at": generated_at,
        "summary": {
            "imported": {
                "provinces": len(provinces),
                "districts": len(districts),
                "ds_divisions": len(ds_divisions),
                "gn_divisions": len(gn_divisions),
                "postal_areas": len(postal_areas),
            },
            "rejected": {
                "postal_areas": len(rejected),
            },
            "conflicts": {
                "postal_areas": len(conflicts),
            },
        },
        "rejected": rejected,
        "conflicts": conflicts,
    }

    bundle_output.parent.mkdir(parents=True, exist_ok=True)
    report_output.parent.mkdir(parents=True, exist_ok=True)
    bundle_output.write_text(json.dumps(bundle, indent=2), encoding="utf-8")
    report_output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="SwiftDrop Sri Lankan Geo ETL Pipeline")
    parser.add_argument("--raw-dir", type=Path, default=Path("data/geo/raw"))
    parser.add_argument(
        "--bundle-output",
        type=Path,
        default=Path("data/geo/curated/sri-lanka-geo-bundle.json"),
    )
    parser.add_argument(
        "--report-output",
        type=Path,
        default=Path("data/geo/curated/validation-report.json"),
    )
    parser.add_argument("--import-version", type=str, default="2026.11.1")
    args = parser.parse_args()

    report = run_etl(
        raw_dir=args.raw_dir,
        bundle_output=args.bundle_output,
        report_output=args.report_output,
        import_version=args.import_version,
    )
    print(json.dumps(report["summary"], indent=2))


if __name__ == "__main__":
    main()
