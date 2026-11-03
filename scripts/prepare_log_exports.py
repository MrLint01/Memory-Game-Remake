#!/usr/bin/env python3
"""Prepare Firestore log exports into analyzer-ready CSVs.

Supported input styles:
1) Combined sessions export with nested attempts/events per session doc.
2) Separate sessions/attempts/events exports.

Accepted file types: .csv, .json, .jsonl, .ndjson

Outputs:
- <outdir>/sessions.csv
- <outdir>/attempts.csv
- <outdir>/events.csv
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Optional

import pandas as pd

JSON_TYPES = {".json", ".jsonl", ".ndjson", ".csv"}


def load_table(path: Optional[Path]) -> pd.DataFrame:
    if path is None:
        return pd.DataFrame()

    suffix = path.suffix.lower()
    if suffix not in JSON_TYPES:
        raise ValueError(f"Unsupported file type for {path}")

    if suffix == ".csv":
        return pd.read_csv(path)

    if suffix in {".jsonl", ".ndjson"}:
        return pd.read_json(path, lines=True)

    with path.open("r", encoding="utf-8") as f:
        obj = json.load(f)

    if isinstance(obj, list):
        return pd.DataFrame(obj)

    if isinstance(obj, dict):
        if isinstance(obj.get("documents"), list):
            return pd.DataFrame(obj["documents"])
        return pd.json_normalize(obj)

    return pd.DataFrame()


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    out = df.copy()
    out.columns = [str(c).strip().lower() for c in out.columns]
    return out


def _extract_list(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if isinstance(value, list):
        return [v for v in value if isinstance(v, dict)]
    if isinstance(value, dict):
        # Common wrapper style: {"documents": [...]}
        if isinstance(value.get("documents"), list):
            return [v for v in value["documents"] if isinstance(v, dict)]
    return []


def _to_jsonable(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=True)
    return value


def split_combined_sessions(combined: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    if combined.empty:
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame()

    combined = normalize_columns(combined)

    session_rows: list[dict[str, Any]] = []
    attempt_rows: list[dict[str, Any]] = []
    event_rows: list[dict[str, Any]] = []

    for _, row in combined.iterrows():
        row_dict = row.to_dict()

        attempts = _extract_list(row_dict.get("attempts"))
        events = _extract_list(row_dict.get("events"))

        session_doc_id = (
            row_dict.get("id")
            or row_dict.get("doc_id")
            or row_dict.get("session_doc_id")
            or row_dict.get("name")
        )

        session_business_id = row_dict.get("session_id")

        session_base = {
            k: _to_jsonable(v)
            for k, v in row_dict.items()
            if k not in {"attempts", "events"}
        }
        session_rows.append(session_base)

        for attempt in attempts:
            a = {k: _to_jsonable(v) for k, v in attempt.items()}
            if "session_id" not in a or pd.isna(a.get("session_id")):
                if session_business_id is not None:
                    a["session_id"] = session_business_id
            if "session_doc_id" not in a or pd.isna(a.get("session_doc_id")):
                if session_doc_id is not None:
                    a["session_doc_id"] = session_doc_id
            attempt_rows.append(a)

        for event in events:
            e = {k: _to_jsonable(v) for k, v in event.items()}
            if "session_id" not in e or pd.isna(e.get("session_id")):
                if session_business_id is not None:
                    e["session_id"] = session_business_id
            if "session_doc_id" not in e or pd.isna(e.get("session_doc_id")):
                if session_doc_id is not None:
                    e["session_doc_id"] = session_doc_id
            event_rows.append(e)

    sessions_df = normalize_columns(pd.DataFrame(session_rows))
    attempts_df = normalize_columns(pd.DataFrame(attempt_rows))
    events_df = normalize_columns(pd.DataFrame(event_rows))

    return sessions_df, attempts_df, events_df


def ensure_session_link(df: pd.DataFrame, sessions: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    out = normalize_columns(df)
    if "session_id" in out.columns:
        return out

    if "session_doc_id" in out.columns:
        return out

    # Best-effort join if export includes session doc name/id under another field.
    if "parent_session_id" in out.columns:
        out = out.rename(columns={"parent_session_id": "session_id"})

    return out


def hydrate_from_sessions(df: pd.DataFrame, sessions: pd.DataFrame) -> pd.DataFrame:
    """Fill missing release/host/referrer info on child rows from session rows."""
    if df.empty or sessions.empty:
        return df

    out = normalize_columns(df).copy()
    s = normalize_columns(sessions).copy()

    if "session_id" in out.columns and "session_id" in s.columns:
        session_meta = (
            s.dropna(subset=["session_id"])
            .drop_duplicates(subset=["session_id"])
            .set_index("session_id")
        )
        for col in ("release_channel", "site_host", "referrer", "game_version"):
            if col in session_meta.columns:
                if col not in out.columns:
                    out[col] = out["session_id"].map(session_meta[col])
                else:
                    fill_mask = out[col].isna() | (out[col].astype(str).str.strip() == "")
                    out.loc[fill_mask, col] = out.loc[fill_mask, "session_id"].map(session_meta[col])
    return out


def write_csv(df: pd.DataFrame, path: Path) -> None:
    if df.empty:
        pd.DataFrame().to_csv(path, index=False)
        return

    release = (
        df["release_channel"].astype(str).str.strip().str.lower()
        if "release_channel" in df.columns
        else pd.Series("", index=df.index, dtype="object")
    )
    site_host = (
        df["site_host"].astype(str).str.strip().str.lower()
        if "site_host" in df.columns
        else pd.Series("", index=df.index, dtype="object")
    )
    referrer = (
        df["referrer"].astype(str).str.strip().str.lower()
        if "referrer" in df.columns
        else pd.Series("", index=df.index, dtype="object")
    )

    is_gamejolt_channel = release == "gamejolt"
    # Current Game Jolt embeds often report release_channel as "custom".
    is_custom_channel = release == "custom"
    is_custom_gamejolt = (release == "custom") & (
        site_host.str.contains("gamejolt", na=False)
        | referrer.str.contains("gamejolt", na=False)
    )
    filtered_df = df[is_gamejolt_channel | is_custom_gamejolt | is_custom_channel].copy()

    if "user_agent" in filtered_df.columns:
        filtered_df = filtered_df[~filtered_df["user_agent"].str.contains("IPhone|Android", case=False)]
    
    # use different timestamp columns depending on what's available:
    timestamp_col = None
    if "created_at" in filtered_df.columns:
        timestamp_col = "created_at"  # For attempts
    elif "event_timestamp" in filtered_df.columns:
        timestamp_col = "event_timestamp"  # For events
    elif "started_at" in filtered_df.columns:
        timestamp_col = "started_at"  # For sessions
    
    if timestamp_col:
        filtered_df[f"{timestamp_col}_dt"] = pd.to_datetime(filtered_df[timestamp_col], utc=True, errors="coerce")
        cutoff_date = pd.Timestamp("2026-02-21", tz="UTC")
        filtered_df = filtered_df[filtered_df[f"{timestamp_col}_dt"] >= cutoff_date]
        filtered_df = filtered_df.drop(columns=[f"{timestamp_col}_dt"])
    
    out = filtered_df.copy()
    for col in out.columns:
        out[col] = out[col].map(_to_jsonable)
    out.to_csv(path, index=False)


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare Firestore logging exports for analyze_logs.py")
    parser.add_argument("--combined", type=Path, help="Combined sessions export with nested attempts/events")
    parser.add_argument("--sessions", type=Path, help="Sessions export table")
    parser.add_argument("--attempts", type=Path, help="Attempts export table")
    parser.add_argument("--events", type=Path, help="Events export table")
    parser.add_argument("--outdir", type=Path, default=Path("prepared_data"), help="Output directory")
    args = parser.parse_args()

    args.outdir.mkdir(parents=True, exist_ok=True)

    if args.combined is not None:
        combined = load_table(args.combined)
        sessions, attempts, events = split_combined_sessions(combined)
    else:
        sessions = normalize_columns(load_table(args.sessions))
        attempts = normalize_columns(load_table(args.attempts))
        events = normalize_columns(load_table(args.events))

    attempts = ensure_session_link(attempts, sessions)
    events = ensure_session_link(events, sessions)
    attempts = hydrate_from_sessions(attempts, sessions)
    events = hydrate_from_sessions(events, sessions)

    sessions_csv = args.outdir / "sessions.csv"
    attempts_csv = args.outdir / "attempts.csv"
    events_csv = args.outdir / "events.csv"

    write_csv(sessions, sessions_csv)
    write_csv(attempts, attempts_csv)
    write_csv(events, events_csv)

    print(f"Prepared CSV files written to: {args.outdir}")
    print(f"- {sessions_csv}")
    print(f"- {attempts_csv}")
    print(f"- {events_csv}")


if __name__ == "__main__":
    main()
