#!/usr/bin/env python3
"""Export Flash Recall Firestore logs to a combined JSON file.

Exports the `game_sessions` collection and nested subcollections:
- attempts
- events

Usage example:
  python scripts/export_firestore_logs.py \
    --service-account serviceAccountKey.json \
    --out data_combined.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from google.cloud import firestore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export Firestore game session logs to JSON")
    parser.add_argument(
        "--service-account",
        type=Path,
        required=True,
        help="Path to Firebase service account JSON key",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("data_combined.json"),
        help="Output JSON file path",
    )
    parser.add_argument(
        "--collection",
        type=str,
        default="game_sessions",
        help="Top-level collection to export",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional max number of session docs to export (0 = no limit)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=200,
        help="Number of docs to fetch per paged Firestore request",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=120.0,
        help="Per-request Firestore timeout in seconds",
    )
    return parser.parse_args()


def to_jsonable(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: to_jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_jsonable(v) for v in value]
    if isinstance(value, tuple):
        return [to_jsonable(v) for v in value]
    # Firestore timestamp/datetime and similar objects -> string
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    return value


def stream_collection_pagewise(
    collection_ref: firestore.CollectionReference,
    batch_size: int,
    timeout: float,
):
    query = collection_ref.order_by("__name__")
    last_doc = None

    while True:
        page_query = query.limit(batch_size)
        if last_doc is not None:
            page_query = page_query.start_after(last_doc)

        docs = list(page_query.stream(timeout=timeout))
        if not docs:
            break

        for doc in docs:
            yield doc

        last_doc = docs[-1]


def export_data(
    db: firestore.Client,
    collection_name: str,
    limit: int,
    batch_size: int,
    timeout: float,
) -> list[dict[str, Any]]:
    sessions_ref = db.collection(collection_name)

    output: list[dict[str, Any]] = []

    for session_doc in stream_collection_pagewise(sessions_ref, batch_size=batch_size, timeout=timeout):
        session_data = session_doc.to_dict() or {}
        session_payload = to_jsonable(session_data)
        session_payload["id"] = session_doc.id
        session_payload["attempts"] = []
        session_payload["events"] = []

        for attempt_doc in stream_collection_pagewise(
            session_doc.reference.collection("attempts"),
            batch_size=batch_size,
            timeout=timeout,
        ):
            attempt_data = attempt_doc.to_dict() or {}
            attempt_payload = to_jsonable(attempt_data)
            attempt_payload["id"] = attempt_doc.id
            session_payload["attempts"].append(attempt_payload)

        for event_doc in stream_collection_pagewise(
            session_doc.reference.collection("events"),
            batch_size=batch_size,
            timeout=timeout,
        ):
            event_data = event_doc.to_dict() or {}
            event_payload = to_jsonable(event_data)
            event_payload["id"] = event_doc.id
            session_payload["events"].append(event_payload)

        output.append(session_payload)
        if limit and limit > 0 and len(output) >= limit:
            break

    return output


def main() -> None:
    args = parse_args()

    if not args.service_account.exists():
        raise FileNotFoundError(f"Service account key not found: {args.service_account}")

    db = firestore.Client.from_service_account_json(str(args.service_account))
    data = export_data(
        db,
        args.collection,
        args.limit,
        args.batch_size,
        args.timeout,
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Exported {len(data)} session documents to {args.out}")


if __name__ == "__main__":
    main()
