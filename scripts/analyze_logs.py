#!/usr/bin/env python3
"""Analyze Flash Recall logging exports and generate summary charts."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Optional

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

TRUE_VALUES = {"true", "1", "yes", "y", "t"}
EXPERIMENT_VARIANT_LABELS = {
    "A": "A - Turbo / original early-game build",
    "B": "B - alternate early-game modifiers / Turbo off",
}
ADAPTIVE_GROUP_LABELS = {
    "A": "A - completed level 2",
    "B": "B - early failure in levels 1-2",
    "unassigned": "Unassigned - no early outcome yet",
}
TIME_OUTLIER_THRESHOLD_MINUTES = 200.0
TIME_OUTLIER_THRESHOLD_SECONDS = TIME_OUTLIER_THRESHOLD_MINUTES * 60.0


def load_table(path: Optional[Path]) -> pd.DataFrame:
    if path is None:
        return pd.DataFrame()
    suf = path.suffix.lower()
    if suf == ".csv":
        return pd.read_csv(path)
    if suf in {".jsonl", ".ndjson"}:
        return pd.read_json(path, lines=True)
    if suf == ".json":
        with path.open("r", encoding="utf-8") as f:
            obj = json.load(f)
        if isinstance(obj, list):
            return pd.DataFrame(obj)
        if isinstance(obj, dict):
            if isinstance(obj.get("documents"), list):
                return pd.DataFrame(obj["documents"])
            return pd.json_normalize(obj)
    raise ValueError(f"Unsupported file type for {path}")


def normalize_experiment_variant(value: Any) -> str:
    normalized = str(value or "").strip().upper()
    return normalized if normalized in {"A", "B"} else ""


def label_experiment_variant(value: Any) -> str:
    normalized = normalize_experiment_variant(value)
    return EXPERIMENT_VARIANT_LABELS.get(normalized, str(value))


def label_adaptive_group(value: Any) -> str:
    normalized = str(value or "").strip()
    return ADAPTIVE_GROUP_LABELS.get(normalized, normalized or str(value))


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out.columns = [str(c).strip().lower() for c in out.columns]
    return out


def bool_series(s: pd.Series) -> pd.Series:
    return s.astype(str).str.strip().str.lower().isin(TRUE_VALUES)


def maybe_json(v: Any) -> Any:
    if isinstance(v, (dict, list)):
        return v
    if not isinstance(v, str):
        return None
    t = v.strip()
    if not t or (not t.startswith("{") and not t.startswith("[")):
        return None
    try:
        return json.loads(t)
    except Exception:
        return None


def infer_card_type_from_failed(card: dict[str, Any]) -> str:
    raw_type = str(card.get("card_type") or "").strip().lower()
    if raw_type and raw_type != "unknown":
        return raw_type

    expected = str(card.get("expected") or "").strip().lower()
    prompt_target = str(card.get("prompt_target") or "").strip().lower()
    hint_type = str(card.get("hint_type") or "").strip().lower()
    token = hint_type or prompt_target or expected

    if token in {"number", "numbers"} or expected.isdigit():
        return "numbers"
    if token in {"letter", "letters"} or (len(expected) == 1 and expected.isalpha()):
        return "letters"
    if token in {"color", "colors", "background color"}:
        return "colors"
    if token in {"direction", "directions", "arrow", "up", "down", "left", "right"}:
        return "directions"
    if token in {"shape", "shapes", "triangle", "circle", "square"}:
        return "shapes"
    return "unknown"


def add_session_key(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    key = pd.Series(index=out.index, dtype="object")
    for col in ["session_id", "session_doc_id", "id", "doc_id", "name"]:
        if col in out.columns:
            vals = out[col].astype(str).replace("nan", "")
            mask = key.isna() | (key == "")
            key = key.where(~mask, vals)
    out["session_key"] = key.astype(str).replace({"nan": "", "none": "", "null": ""})
    out.loc[out["session_key"] == "", "session_key"] = pd.NA
    return out


def save_bar(series: pd.Series, path: Path, title: str, xlabel: str, ylabel: str, ylim: Optional[tuple[float, float]] = None) -> None:
    if series.empty:
        return
    plt.figure(figsize=(9, 5))
    series.plot(kind="bar")
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    if ylim is not None:
        plt.ylim(*ylim)
    plt.tight_layout()
    plt.savefig(path, dpi=120)
    plt.close()


def save_line(
    series: pd.Series,
    path: Path,
    title: str,
    xlabel: str,
    ylabel: str,
    ylim: Optional[tuple[float, float]] = None,
    x_max: Optional[float] = None,
) -> None:
    if series.empty:
        return
    plt.figure(figsize=(9, 5))
    x = series.index.to_numpy()
    y = series.to_numpy()
    plt.plot(x, y, marker="o")
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    if ylim is not None:
        plt.ylim(*ylim)
    if x_max is not None:
        plt.xlim(0, x_max)
    plt.tight_layout()
    plt.savefig(path, dpi=120)
    plt.close()


def pick_player_column(df: pd.DataFrame) -> Optional[str]:
    for c in ["player_id", "user_id"]:
        if c in df.columns:
            return c
    return None


def add_player_id_to_attempts(attempts: pd.DataFrame, sessions: pd.DataFrame) -> pd.DataFrame:
    out = attempts.copy()
    out["player_id_norm"] = pd.NA
    a_player_col = pick_player_column(out)
    if a_player_col is not None:
        out["player_id_norm"] = out[a_player_col].astype(str)
    if out["player_id_norm"].isna().all():
        s_player_col = pick_player_column(sessions)
        if s_player_col is not None and not sessions.empty:
            s_map = add_session_key(sessions.copy())
            s_map = s_map.dropna(subset=["session_key", s_player_col]).drop_duplicates(subset=["session_key"])
            lookup = s_map.set_index("session_key")[s_player_col].astype(str)
            a_with_key = add_session_key(out)
            out["player_id_norm"] = a_with_key["session_key"].map(lookup)
    out["player_id_norm"] = out["player_id_norm"].replace({"nan": pd.NA, "none": pd.NA, "null": pd.NA, "": pd.NA})
    return out


def add_player_id_to_events(events: pd.DataFrame, sessions: pd.DataFrame) -> pd.DataFrame:
    out = add_session_key(events.copy())
    out["player_id_norm"] = pd.NA
    e_player_col = pick_player_column(out)
    if e_player_col is not None:
        out["player_id_norm"] = out[e_player_col].astype(str)
    if out["player_id_norm"].isna().all():
        s_player_col = pick_player_column(sessions)
        if s_player_col is not None and not sessions.empty:
            s_map = add_session_key(sessions.copy())
            s_map = s_map.dropna(subset=["session_key", s_player_col]).drop_duplicates(subset=["session_key"])
            lookup = s_map.set_index("session_key")[s_player_col].astype(str)
            out["player_id_norm"] = out["session_key"].map(lookup)
    out["player_id_norm"] = out["player_id_norm"].replace({"nan": pd.NA, "none": pd.NA, "null": pd.NA, "": pd.NA})
    return out


def infer_currently_playing_players(sessions: pd.DataFrame, stale_minutes: int = 30) -> pd.Series:
    """Infer players likely still in-progress from their latest session row."""
    pcol = pick_player_column(sessions)
    if pcol is None or sessions.empty:
        return pd.Series(dtype=bool)

    s = sessions.copy()
    s = s.dropna(subset=[pcol]).copy()
    if s.empty:
        return pd.Series(dtype=bool)

    s["_player"] = s[pcol].astype(str)
    for col in ["updated_at", "last_activity_at", "started_at", "ended_at"]:
        if col in s.columns:
            s[f"{col}_ts"] = pd.to_datetime(s[col], utc=True, errors="coerce")
    activity = pd.Series(pd.NaT, index=s.index, dtype="datetime64[ns, UTC]")
    for col in ["last_activity_at_ts", "updated_at_ts", "started_at_ts"]:
        if col in s.columns:
            activity = activity.combine_first(s[col])
    s["_activity_ts"] = activity
    s = s.sort_values(["_activity_ts"], na_position="last")
    latest = s.groupby("_player", as_index=False).tail(1).set_index("_player")
    if latest.empty:
        return pd.Series(dtype=bool)

    dataset_latest = latest["_activity_ts"].dropna().max()
    recent = pd.Series(False, index=latest.index)
    if pd.notna(dataset_latest):
        recent = latest["_activity_ts"] >= (dataset_latest - pd.Timedelta(minutes=stale_minutes))

    state_active = pd.Series(False, index=latest.index)
    if "session_state" in latest.columns:
        state_active = latest["session_state"].astype(str).str.lower().eq("active")

    ended = pd.Series(False, index=latest.index)
    if "ended_at_ts" in latest.columns:
        ended = latest["ended_at_ts"].notna()

    in_level = pd.Series(False, index=latest.index)
    if {"current_level_number", "last_level_completed"} <= set(latest.columns):
        current_level = pd.to_numeric(latest["current_level_number"], errors="coerce")
        last_completed = pd.to_numeric(latest["last_level_completed"], errors="coerce").fillna(0)
        in_level = (current_level > last_completed)

    return (state_active & ~ended & recent) | (in_level & recent)


def build_player_retention_seconds(
    sessions: pd.DataFrame,
    attempts_with_player: pd.DataFrame,
    player_index: Optional[pd.Index] = None,
) -> pd.Series:
    player_retention_seconds = pd.Series(dtype=float)

    if {"player_id_norm", "time_seconds"} <= set(attempts_with_player.columns):
        attempts_with_player["time_seconds"] = pd.to_numeric(attempts_with_player["time_seconds"], errors="coerce")
        valid_attempts = attempts_with_player["player_id_norm"].notna() & attempts_with_player["time_seconds"].notna()
        if valid_attempts.any():
            player_retention_seconds = (
                attempts_with_player.loc[valid_attempts]
                .groupby("player_id_norm")["time_seconds"]
                .sum()
                .astype(float)
            )

    if player_retention_seconds.empty:
        sessions_player_col = pick_player_column(sessions) if not sessions.empty else None
        if sessions_player_col is not None and "total_playtime_seconds" in sessions.columns:
            session_totals = pd.to_numeric(sessions["total_playtime_seconds"], errors="coerce")
            valid_sessions = sessions[sessions_player_col].notna() & session_totals.notna()
            if valid_sessions.any():
                player_retention_seconds = (
                    session_totals[valid_sessions]
                    .groupby(sessions.loc[valid_sessions, sessions_player_col].astype(str))
                    .sum()
                    .astype(float)
                )

    if player_index is not None and len(player_index) > 0:
        player_retention_seconds = player_retention_seconds.reindex(player_index).fillna(0.0)

    return player_retention_seconds


def build_player_active_playtime_seconds(
    sessions: pd.DataFrame,
    player_index: Optional[pd.Index] = None,
) -> pd.Series:
    player_active_seconds = pd.Series(dtype=float)

    sessions_player_col = pick_player_column(sessions) if not sessions.empty else None
    if sessions_player_col is not None and "total_playtime_seconds" in sessions.columns:
        session_totals = pd.to_numeric(sessions["total_playtime_seconds"], errors="coerce")
        valid_sessions = sessions[sessions_player_col].notna() & session_totals.notna()
        if valid_sessions.any():
            player_active_seconds = (
                session_totals[valid_sessions]
                .groupby(sessions.loc[valid_sessions, sessions_player_col].astype(str))
                .sum()
                .astype(float)
            )

    if player_index is not None and len(player_index) > 0:
        player_active_seconds = player_active_seconds.reindex(player_index).fillna(0.0)

    return player_active_seconds


def build_player_stats_like_round_seconds(
    events: pd.DataFrame,
    player_index: Optional[pd.Index] = None,
) -> pd.Series:
    player_round_seconds = pd.Series(dtype=float)

    events_player_col = pick_player_column(events) if not events.empty else None
    if events_player_col is not None and {"event_type", "time_spent_seconds"} <= set(events.columns):
        event_type = events["event_type"].astype(str).str.strip().str.lower()
        round_seconds = pd.to_numeric(events["time_spent_seconds"], errors="coerce")
        valid_rounds = (
            events[events_player_col].notna()
            & round_seconds.notna()
            & event_type.eq("round_complete")
        )
        if valid_rounds.any():
            player_round_seconds = (
                round_seconds[valid_rounds]
                .groupby(events.loc[valid_rounds, events_player_col].astype(str))
                .sum()
                .astype(float)
            )

    if player_index is not None and len(player_index) > 0:
        player_round_seconds = player_round_seconds.reindex(player_index).fillna(0.0)

    return player_round_seconds


def infer_quit_summary(events: pd.DataFrame, attempts: pd.DataFrame) -> pd.DataFrame:
    if events.empty or "event_type" not in events.columns:
        return pd.DataFrame()
    e = add_session_key(events.copy())
    e["_i"] = np.arange(len(e))
    e["event_time"] = pd.to_numeric(e.get("client_timestamp_ms"), errors="coerce")
    e["level_number"] = pd.to_numeric(e.get("level_number"), errors="coerce")
    e = e.dropna(subset=["session_key"])
    if e.empty:
        return pd.DataFrame()

    a = add_session_key(attempts.copy()) if not attempts.empty else pd.DataFrame()
    if not a.empty:
        a["level_number"] = pd.to_numeric(a.get("level_number"), errors="coerce")
        a["passed_flag"] = bool_series(a["passed"]) if "passed" in a.columns else False
        a["time_seconds"] = pd.to_numeric(a.get("time_seconds"), errors="coerce")
        prev = a.groupby(["session_key", "level_number"]).agg(prev_pass=("passed_flag", "max"), prev_time=("time_seconds", "last")).reset_index()
    else:
        prev = pd.DataFrame()

    rows: list[dict[str, Any]] = []
    for sk, g in e.groupby("session_key"):
        g = g.sort_values(["event_time", "_i"], na_position="last")
        started: list[int] = []
        stack: list[int] = []
        for _, r in g.iterrows():
            et = str(r.get("event_type") or "")
            lvl_raw = r.get("level_number")
            lvl = int(lvl_raw) if np.isfinite(lvl_raw) else None
            if et == "level_start" and lvl is not None:
                started.append(lvl)
                stack.append(lvl)
            elif et == "level_end" and lvl is not None:
                for i in range(len(stack) - 1, -1, -1):
                    if stack[i] == lvl:
                        stack.pop(i)
                        break
        if not started:
            continue
        mid = len(stack) > 0
        qlvl = stack[-1] if mid else started[-1]
        rows.append({"session_key": sk, "quit_level": qlvl, "quit_mid_level": mid, "previous_level": qlvl - 1 if qlvl > 1 else np.nan})
    q = pd.DataFrame(rows)
    if q.empty or prev.empty:
        return q
    prev = prev.rename(columns={"level_number": "previous_level"})
    return q.merge(prev, on=["session_key", "previous_level"], how="left")


def save_hist_minutes(values_seconds: pd.Series, path: Path, title: str, ylabel: str = "Player Count") -> None:
    clean = pd.to_numeric(values_seconds, errors="coerce").dropna()
    if clean.empty:
        return
    plt.figure(figsize=(8, 5))
    (clean / 60.0).hist(bins=20)
    plt.title(title)
    plt.xlabel("Duration (minutes)")
    plt.ylabel(ylabel)
    plt.tight_layout()
    plt.savefig(path, dpi=120)
    plt.close()


def save_hist_values(values: pd.Series, path: Path, title: str, xlabel: str, bins: int = 20) -> None:
    clean = pd.to_numeric(values, errors="coerce").dropna()
    if clean.empty:
        return
    plt.figure(figsize=(8, 5))
    clean.hist(bins=bins)
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel("Player Count")
    plt.tight_layout()
    plt.savefig(path, dpi=120)
    plt.close()


def save_stacked_bar(frame: pd.DataFrame, path: Path, title: str, xlabel: str, ylabel: str) -> None:
    if frame.empty:
        return
    plt.figure(figsize=(10, 6))
    frame.plot(kind="bar", stacked=True, ax=plt.gca())
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.tight_layout()
    plt.savefig(path, dpi=120)
    plt.close()


def save_grouped_bar(frame: pd.DataFrame, path: Path, title: str, xlabel: str, ylabel: str, ylim: Optional[tuple[float, float]] = None) -> None:
    if frame.empty:
        return
    plt.figure(figsize=(10, 6))
    frame.plot(kind="bar", ax=plt.gca())
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    if ylim is not None:
        plt.ylim(*ylim)
    plt.tight_layout()
    plt.savefig(path, dpi=120)
    plt.close()


def save_multi_line_percent(
    frame: pd.DataFrame,
    path: Path,
    title: str,
    xlabel: str,
    ylabel: str,
    ylim: Optional[tuple[float, float]] = None,
    x_max: Optional[float] = None,
) -> None:
    if frame.empty:
        return
    plt.figure(figsize=(10, 6))
    for column in frame.columns:
        plt.plot(frame.index, frame[column], marker="o", label=str(column))
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    if ylim is not None:
        plt.ylim(*ylim)
    if x_max is not None:
        plt.xlim(0, x_max)
    plt.legend()
    plt.grid(True, alpha=0.25)
    plt.tight_layout()
    plt.savefig(path, dpi=120)
    plt.close()


def retention_curve_time_minutes(seconds: pd.Series) -> pd.Series:
    clean = pd.to_numeric(seconds, errors="coerce").dropna().astype(float)
    if clean.empty:
        return pd.Series(dtype=float)
    max_minutes = int(np.ceil(clean.max() / 60.0)) if pd.notna(clean.max()) else 0
    minute_index = pd.Index(range(0, max(1, max_minutes) + 1), dtype=int)
    return pd.Series(
        {
            minute: float((clean >= (minute * 60.0)).mean() * 100.0)
            for minute in minute_index
        },
        index=minute_index,
    )


def get_time_played_outlier_player_ids(
    player_retention_seconds: pd.Series,
    threshold_seconds: float = TIME_OUTLIER_THRESHOLD_SECONDS,
) -> set[str]:
    clean = pd.to_numeric(player_retention_seconds, errors="coerce").dropna().astype(float)
    if clean.empty:
        return set()
    return set(clean[clean >= threshold_seconds].index.astype(str).tolist())


def filter_series_by_player_ids(series: pd.Series, excluded_player_ids: set[str] | None) -> pd.Series:
    if series is None or series.empty or not excluded_player_ids:
        return series.copy()
    keep_mask = ~series.index.astype(str).isin(excluded_player_ids)
    return series.loc[keep_mask].copy()


def filter_frame_by_player_ids(
    frame: pd.DataFrame,
    excluded_player_ids: set[str] | None,
    player_col: str = "player_id_norm",
) -> pd.DataFrame:
    if frame.empty or not excluded_player_ids:
        return frame.copy()
    if player_col in frame.columns:
        keep_mask = ~frame[player_col].astype(str).isin(excluded_player_ids)
        return frame.loc[keep_mask].copy()
    keep_mask = ~frame.index.astype(str).isin(excluded_player_ids)
    return frame.loc[keep_mask].copy()


def infer_adaptive_cohorts_from_attempts(attempts_with_player: pd.DataFrame) -> pd.DataFrame:
    required = {"player_id_norm", "level_number", "passed"}
    if attempts_with_player.empty or not required <= set(attempts_with_player.columns):
        return pd.DataFrame(columns=["player_id_norm", "adaptive_group", "group_assigned_ts"])

    early_attempts = attempts_with_player.dropna(subset=["player_id_norm", "level_number"]).copy()
    early_attempts["level_number"] = pd.to_numeric(early_attempts["level_number"], errors="coerce")
    early_attempts = early_attempts[early_attempts["level_number"].isin([1, 2])].copy()
    if early_attempts.empty:
        return pd.DataFrame(columns=["player_id_norm", "adaptive_group", "group_assigned_ts"])

    early_attempts["passed_flag"] = bool_series(early_attempts["passed"])
    early_attempts = sort_attempts_for_sequence(early_attempts)
    if "created_at" in early_attempts.columns:
        early_attempts["attempt_ts"] = pd.to_datetime(early_attempts["created_at"], utc=True, errors="coerce")
    else:
        early_attempts["attempt_ts"] = pd.NaT

    rows: list[dict[str, Any]] = []
    for player_id, group in early_attempts.groupby("player_id_norm", sort=False):
        failed_rows = group[~group["passed_flag"]]
        passed_level_2_rows = group[(group["level_number"] == 2) & group["passed_flag"]]
        failed_first_two = not failed_rows.empty
        completed_level_2 = not passed_level_2_rows.empty

        adaptive_group = None
        assigned_ts = pd.NaT
        if failed_first_two:
            adaptive_group = "B"
            if "attempt_ts" in failed_rows.columns and failed_rows["attempt_ts"].notna().any():
                assigned_ts = failed_rows["attempt_ts"].dropna().iloc[0]
        elif completed_level_2:
            adaptive_group = "A"
            if "attempt_ts" in passed_level_2_rows.columns and passed_level_2_rows["attempt_ts"].notna().any():
                assigned_ts = passed_level_2_rows["attempt_ts"].dropna().iloc[0]
        else:
            adaptive_group = "unassigned"
            if "attempt_ts" in group.columns and group["attempt_ts"].notna().any():
                assigned_ts = group["attempt_ts"].dropna().iloc[-1]

        rows.append({
            "player_id_norm": str(player_id),
            "adaptive_group": adaptive_group,
            "group_assigned_ts": assigned_ts,
        })

    return pd.DataFrame(rows)


def infer_experiment_variants_by_player(
    sessions: pd.DataFrame,
    attempts_with_player: pd.DataFrame,
) -> pd.Series:
    parts: list[pd.DataFrame] = []

    if {"player_id_norm", "ab_variant"} <= set(attempts_with_player.columns):
        a_part = attempts_with_player[["player_id_norm", "ab_variant"]].copy()
        a_part["player_id_norm"] = a_part["player_id_norm"].astype(str)
        a_part["ab_variant"] = a_part["ab_variant"].map(normalize_experiment_variant)
        a_part = a_part[a_part["player_id_norm"].notna() & a_part["ab_variant"].ne("")]
        if not a_part.empty:
            parts.append(a_part)

    session_player_col = pick_player_column(sessions)
    if session_player_col is not None and {"ab_variant"} <= set(sessions.columns):
        s_part = sessions[[session_player_col, "ab_variant"]].copy()
        s_part = s_part.rename(columns={session_player_col: "player_id_norm"})
        s_part["player_id_norm"] = s_part["player_id_norm"].astype(str)
        s_part["ab_variant"] = s_part["ab_variant"].map(normalize_experiment_variant)
        s_part = s_part[s_part["player_id_norm"].notna() & s_part["ab_variant"].ne("")]
        if not s_part.empty:
            parts.append(s_part)

    if not parts:
        return pd.Series(dtype="object")

    combined = pd.concat(parts, ignore_index=True)
    if combined.empty:
        return pd.Series(dtype="object")

    variant_lookup = (
        combined.drop_duplicates(subset=["player_id_norm"])
        .set_index("player_id_norm")["ab_variant"]
        .astype(str)
    )
    return variant_lookup


def analyze_feature_usage(
    sessions: pd.DataFrame,
    attempts_with_player: pd.DataFrame,
    events: pd.DataFrame,
    outdir: Path,
    summary: list[str],
    excluded_player_ids: set[str] | None = None,
) -> None:
    if events.empty and sessions.empty:
        return

    excluded_player_ids = set(excluded_player_ids or set())
    feature_dir = outdir / "feature_usage"
    feature_dir.mkdir(parents=True, exist_ok=True)
    adaptive_dir = outdir / "adaptive_features"
    adaptive_dir.mkdir(parents=True, exist_ok=True)
    adaptive_cohorts = infer_adaptive_cohorts_from_attempts(attempts_with_player)
    adaptive_group_label_order = [label_adaptive_group(name) for name in ["unassigned", "B", "A"]]
    adaptive_group_lookup = (
        adaptive_cohorts.set_index("player_id_norm")["adaptive_group"]
        if not adaptive_cohorts.empty
        else pd.Series(dtype="object")
    )
    if not adaptive_cohorts.empty:
        adaptive_assignments = adaptive_cohorts.copy()
        adaptive_assignments["adaptive_group_label"] = adaptive_assignments["adaptive_group"].map(label_adaptive_group)
        adaptive_assignments.to_csv(adaptive_dir / "adaptive_group_assignments.csv", index=False)
        summary.append("adaptive_group_labels:")
        for group_name in ["A", "B", "unassigned"]:
            summary.append(f"  {group_name}: {label_adaptive_group(group_name)}")

    events_with_player = add_player_id_to_events(events, sessions) if not events.empty else pd.DataFrame()
    total_players = 0
    player_sets: list[set[str]] = []
    for df in [attempts_with_player, events_with_player, sessions]:
        pcol = "player_id_norm" if "player_id_norm" in df.columns else pick_player_column(df)
        if pcol and not df.empty:
            player_sets.append(set(df[pcol].dropna().astype(str).tolist()))
    if player_sets:
        total_players = len(set().union(*player_sets))
    summary.append(f"feature_usage_total_players: {int(total_players)}")

    if not events_with_player.empty and "event_type" in events_with_player.columns:
        events_with_player["event_type_norm"] = events_with_player["event_type"].astype(str).str.strip().str.lower()
        event_time = pd.to_numeric(events_with_player.get("client_timestamp_ms"), errors="coerce")
        if "event_timestamp" in events_with_player.columns:
            fallback = pd.to_datetime(events_with_player["event_timestamp"], utc=True, errors="coerce")
            event_time = event_time.fillna((fallback.astype("int64") / 1_000_000).where(fallback.notna(), np.nan))
        events_with_player["event_time_ms"] = event_time

        ui = events_with_player[events_with_player["event_type_norm"] == "ui_interaction"].copy()
        if not ui.empty:
            home = ui[ui["area"].astype(str) == "home_menu"].copy() if "area" in ui.columns else pd.DataFrame()
            if not home.empty and "target" in home.columns:
                home_counts = home.groupby("target")["player_id_norm"].nunique().sort_values(ascending=False)
                save_bar(home_counts, feature_dir / "home_menu_feature_usage.png", "Home Menu Feature Usage", "Button", "Unique Players")
                home_counts.rename("unique_players").to_csv(feature_dir / "home_menu_feature_usage.csv")

            if "target" in ui.columns:
                ui_counts_all = ui.groupby("target")["player_id_norm"].nunique().sort_values(ascending=False)
                ui_counts_all.rename("unique_players").to_csv(feature_dir / "ui_feature_usage.csv")
                ui_counts = ui_counts_all.head(20)
                save_bar(ui_counts, feature_dir / "ui_feature_usage_top20.png", "UI Feature Usage (Top 20)", "Target", "Unique Players")

                major_targets = [
                    "play_start",
                    "practice_start",
                    "stages_open",
                    "settings_open",
                    "achievements_open",
                    "stats_open",
                    "stats_leaderboard_open",
                    "reference_open",
                    "stage_leaderboard_open",
                    "fullscreen_toggle",
                ]
                major_counts = ui_counts_all.reindex([t for t in major_targets if t in ui_counts_all.index]).dropna()
                if not major_counts.empty:
                    save_bar(
                        major_counts,
                        feature_dir / "major_feature_usage.png",
                        "Major Feature Usage",
                        "Feature",
                        "Unique Players",
                    )

            stats_tabs = ui[ui["target"].astype(str).isin(["stats_leaderboard_view", "stats_leaderboard_tab_view"])].copy()
            if not stats_tabs.empty and "leaderboard_metric" in stats_tabs.columns:
                tab_counts = stats_tabs.groupby("leaderboard_metric")["player_id_norm"].nunique().sort_values(ascending=False)
                save_bar(tab_counts, feature_dir / "stats_leaderboard_tab_usage.png", "Stats Leaderboard Tabs Viewed", "Leaderboard", "Unique Players")
                tab_counts.rename("unique_players").to_csv(feature_dir / "stats_leaderboard_tab_usage.csv")

        settings_events = events_with_player[events_with_player["event_type_norm"] == "settings_change"].copy()
        if not settings_events.empty and "setting_name" in settings_events.columns:
            settings_use = settings_events.groupby("setting_name")["player_id_norm"].nunique().sort_values(ascending=False)
            save_bar(settings_use, feature_dir / "settings_change_usage.png", "Players Who Changed Each Setting", "Setting", "Unique Players")
            settings_use.rename("unique_players").to_csv(feature_dir / "settings_change_usage.csv")

        settings_snapshots = events_with_player[events_with_player["event_type_norm"] == "settings_snapshot"].copy()
        if not settings_snapshots.empty:
            settings_snapshots = settings_snapshots.dropna(subset=["player_id_norm"]).sort_values("event_time_ms", na_position="last")
            latest_settings = settings_snapshots.groupby("player_id_norm", as_index=False).tail(1)
            latest_settings.to_csv(feature_dir / "latest_player_settings.csv", index=False)
            bool_cols = [
                "fullscreen_enabled",
                "success_animation_enabled",
                "flash_countdown_enabled",
                "auto_advance_next_enabled",
                "auto_start_stage_preview_enabled",
                "enter_to_next_enabled",
                "flash_warning_enabled",
                "leaderboards_enabled",
            ]
            available_bool_cols = [col for col in bool_cols if col in latest_settings.columns]
            if available_bool_cols:
                bool_pct = pd.Series(
                    {
                        col: float(bool_series(latest_settings[col]).mean() * 100.0)
                        for col in available_bool_cols
                    }
                ).sort_values(ascending=False)
                save_bar(bool_pct, feature_dir / "settings_enabled_percent.png", "Percent of Players With Each Setting Enabled", "Setting", "Percent Enabled", (0, 100))
                bool_pct.rename("percent_enabled").to_csv(feature_dir / "settings_enabled_percent.csv")

            if "theme_id" in latest_settings.columns:
                theme_counts = latest_settings["theme_id"].astype(str).replace({"": pd.NA, "nan": pd.NA}).dropna().value_counts().head(15)
                save_bar(theme_counts.sort_values(ascending=False), feature_dir / "theme_usage.png", "Theme Usage", "Theme", "Players")
                theme_counts.rename("players").to_csv(feature_dir / "theme_usage.csv")

            if "color_vision_mode" in latest_settings.columns:
                cv_counts = latest_settings["color_vision_mode"].astype(str).replace({"": pd.NA, "nan": pd.NA}).dropna().value_counts()
                save_bar(cv_counts.sort_values(ascending=False), feature_dir / "color_vision_usage.png", "Color Vision Mode Usage", "Mode", "Players")
                cv_counts.rename("players").to_csv(feature_dir / "color_vision_usage.csv")

            for keybind_col in [
                "keybind_retry",
                "keybind_stage_next",
                "keybind_stage_quit",
                "keybind_practice_home",
                "keybind_practice_settings",
                "keybind_fullscreen",
            ]:
                if keybind_col in latest_settings.columns:
                    keybind_counts = latest_settings[keybind_col].astype(str).replace({"": pd.NA, "nan": pd.NA}).dropna().value_counts()
                    save_bar(
                        keybind_counts.sort_values(ascending=False),
                        feature_dir / f"{keybind_col}_usage.png",
                        f"{keybind_col.replace('_', ' ').title()} Usage",
                        "Key",
                        "Players",
                    )
                    keybind_counts.rename("players").to_csv(feature_dir / f"{keybind_col}_usage.csv")

        autoplay = events_with_player[events_with_player["event_type_norm"] == "autoplay_event"].copy()
        if not autoplay.empty and {"target", "autoplay_mode"} <= set(autoplay.columns):
            autoplay["label"] = autoplay["target"].astype(str) + " | " + autoplay["autoplay_mode"].astype(str)
            autoplay_counts = autoplay.groupby("label")["player_id_norm"].nunique().sort_values(ascending=False)
            save_bar(autoplay_counts, feature_dir / "autoplay_usage.png", "Autoplay Interaction Usage", "Autoplay Event", "Unique Players")
            autoplay_counts.rename("unique_players").to_csv(feature_dir / "autoplay_usage.csv")
            autoplay_event_counts = autoplay["label"].value_counts().sort_values(ascending=False)
            save_bar(autoplay_event_counts, feature_dir / "autoplay_event_counts.png", "Autoplay Event Counts", "Autoplay Event", "Event Count")
            autoplay_event_counts.rename("event_count").to_csv(feature_dir / "autoplay_event_counts.csv")

        if not autoplay.empty and {"player_id_norm", "current_level_number"} <= set(autoplay.columns):
            autoplay = add_session_key(autoplay)
            autoplay["level_number"] = pd.to_numeric(autoplay.get("level_number"), errors="coerce")
            autoplay["current_level_number"] = pd.to_numeric(autoplay.get("current_level_number"), errors="coerce")
            autoplay["stage_preview_open_flag"] = bool_series(autoplay["stage_preview_open"]) if "stage_preview_open" in autoplay.columns else False
            autoplay["current_stage_completed_flag"] = bool_series(autoplay["current_stage_completed"]) if "current_stage_completed" in autoplay.columns else False
            autoplay["autoplay_mode_norm"] = autoplay.get("autoplay_mode", pd.Series(index=autoplay.index, dtype=object)).astype(str).str.strip().str.lower()
            autoplay["target_norm"] = autoplay.get("target", pd.Series(index=autoplay.index, dtype=object)).astype(str).str.strip().str.lower()
            autoplay["preview_start_source_norm"] = autoplay.get("preview_start_source", pd.Series(index=autoplay.index, dtype=object)).astype(str).str.strip().str.lower()
            autoplay["trigger_source_norm"] = autoplay.get("trigger_source", pd.Series(index=autoplay.index, dtype=object)).astype(str).str.strip().str.lower()
            autoplay["event_time_ms"] = pd.to_numeric(autoplay.get("event_time_ms"), errors="coerce")

            level_attempts = attempts_with_player.copy()
            level_attempts["level_number"] = pd.to_numeric(level_attempts.get("level_number"), errors="coerce")

            started_by_level: dict[int, set[str]] = {}
            for lvl in [1, 2, 3, 4]:
                started_by_level[lvl] = set(
                    level_attempts[
                        level_attempts["level_number"].eq(lvl) & level_attempts["player_id_norm"].notna()
                    ]["player_id_norm"].astype(str)
                )

            def classify_transition(
                rows: pd.DataFrame,
                eligible_players: set[str],
                transition_label: str,
            ) -> dict[str, Any] | None:
                if not eligible_players:
                    return None
                rel = rows[rows["player_id_norm"].astype(str).isin(eligible_players)].copy()
                if rel.empty:
                    return {
                        "transition": transition_label,
                        "auto_players": 0,
                        "manual_players": 0,
                        "eligible_players": len(eligible_players),
                        "auto_percent": 0.0,
                        "manual_percent": 0.0,
                    }
                rel["sort_time"] = rel["event_time_ms"].fillna(np.inf)
                first = rel.sort_values(["sort_time"]).groupby("player_id_norm", as_index=False).head(1)
                auto_players = set(first[first["transition_source"] == "auto"]["player_id_norm"].astype(str))
                manual_players = set(first[first["transition_source"] == "manual"]["player_id_norm"].astype(str))
                return {
                    "transition": transition_label,
                    "auto_players": len(auto_players),
                    "manual_players": len(manual_players),
                    "eligible_players": len(eligible_players),
                    "auto_percent": (len(auto_players) / len(eligible_players)) * 100.0,
                    "manual_percent": (len(manual_players) / len(eligible_players)) * 100.0,
                }

            autoplay_transition_rows: list[dict[str, Any]] = []

            title_rows = autoplay[
                autoplay["player_id_norm"].notna()
                & autoplay["current_level_number"].eq(1)
                & autoplay["target_norm"].isin(["splash_start", "first_level_countdown"])
            ].copy()
            title_rows["transition_source"] = np.where(
                title_rows["autoplay_mode_norm"].eq("auto") & title_rows["trigger_source_norm"].eq("splash_timer"),
                "auto",
                np.where(title_rows["autoplay_mode_norm"].eq("manual"), "manual", pd.NA),
            )
            title_rows = title_rows.dropna(subset=["transition_source"])
            title_result = classify_transition(title_rows, started_by_level.get(1, set()), "Title -> Start L1")
            if title_result is not None:
                autoplay_transition_rows.append(title_result)

            for lvl in [1, 2, 3]:
                started_next_level = started_by_level.get(lvl + 1, set())

                preview_rows = autoplay[
                    autoplay["player_id_norm"].notna()
                    & autoplay["current_level_number"].eq(lvl)
                    & autoplay["level_number"].eq(lvl + 1)
                    & autoplay["target_norm"].eq("stage_preview_open")
                ].copy()
                preview_rows["transition_source"] = np.where(
                    preview_rows["autoplay_mode_norm"].eq("auto"),
                    "auto",
                    np.where(preview_rows["autoplay_mode_norm"].eq("manual"), "manual", pd.NA),
                )
                preview_rows = preview_rows.dropna(subset=["transition_source"])
                preview_result = classify_transition(preview_rows, started_next_level, f"After L{lvl}: Show L{lvl + 1}")
                if preview_result is not None:
                    autoplay_transition_rows.append(preview_result)

                start_rows = autoplay[
                    autoplay["player_id_norm"].notna()
                    & autoplay["current_level_number"].eq(lvl)
                    & autoplay["level_number"].eq(lvl + 1)
                    & autoplay["target_norm"].eq("stage_preview_start")
                ].copy()
                start_rows["transition_source"] = np.where(
                    start_rows["autoplay_mode_norm"].eq("auto")
                    & start_rows["preview_start_source_norm"].eq("auto_preview_timer"),
                    "auto",
                    np.where(
                        start_rows["autoplay_mode_norm"].eq("manual")
                        & start_rows["preview_start_source_norm"].eq("manual"),
                        "manual",
                        pd.NA,
                    ),
                )
                start_rows = start_rows.dropna(subset=["transition_source"])
                start_result = classify_transition(start_rows, started_next_level, f"After Show L{lvl + 1}: Start L{lvl + 1}")
                if start_result is not None:
                    autoplay_transition_rows.append(start_result)

            if autoplay_transition_rows:
                autoplay_transition_df = pd.DataFrame(autoplay_transition_rows)
                autoplay_transition_df.to_csv(feature_dir / "autostart_effect_first3_levels.csv", index=False)
                x = np.arange(len(autoplay_transition_df))
                plt.figure(figsize=(12, 6))
                ax = plt.gca()
                ax.bar(
                    x,
                    autoplay_transition_df["auto_percent"],
                    color="#4e79a7",
                    label="Auto",
                )
                ax.bar(
                    x,
                    autoplay_transition_df["manual_percent"],
                    bottom=autoplay_transition_df["auto_percent"],
                    color="#9c755f",
                    label="Manual",
                )
                ax.set_title("How Players Reached the Title and First Three Level Transitions")
                ax.set_xlabel("Transition")
                ax.set_ylabel("Percent of Players Who Started That Level")
                ax.set_ylim(0, 100)
                ax.set_xticks(x)
                ax.set_xticklabels(autoplay_transition_df["transition"], rotation=25, ha="right")
                ax.legend()
                for idx, row in autoplay_transition_df.iterrows():
                    manual_value = float(row["manual_percent"])
                    auto_value = float(row["auto_percent"])
                    if auto_value > 0:
                        ax.text(idx, auto_value / 2.0, f"{auto_value:.1f}%", ha="center", va="center", fontsize=8, color="white")
                    if manual_value > 0:
                        ax.text(idx, auto_value + (manual_value / 2.0), f"{manual_value:.1f}%", ha="center", va="center", fontsize=8, color="white")
                plt.tight_layout()
                plt.savefig(feature_dir / "autostart_effect_first3_levels.png", dpi=120)
                plt.close()

                level_start_events = add_session_key(events_with_player[events_with_player["event_type_norm"] == "level_start"].copy())
                level_start_events["level_number"] = pd.to_numeric(level_start_events.get("level_number"), errors="coerce")
                level_start_sessions = {
                    lvl: set(
                        level_start_events[
                            level_start_events["session_key"].notna() & level_start_events["level_number"].eq(lvl)
                        ]["session_key"].astype(str)
                    )
                    for lvl in [1, 2, 3]
                }

                quit_summary = infer_quit_summary(events, attempts_with_player)
                mid_quit_sessions_by_level = {
                    lvl: set(
                        quit_summary[
                            quit_summary["session_key"].notna()
                            & quit_summary["quit_level"].eq(lvl)
                            & quit_summary["quit_mid_level"]
                        ]["session_key"].astype(str)
                    )
                    for lvl in [1, 2, 3]
                }

                autoplay_midquit_rows: list[dict[str, Any]] = []

                l1_auto_sessions = set(
                    title_rows[
                        title_rows["transition_source"].eq("auto") & title_rows["session_key"].notna()
                    ]["session_key"].astype(str)
                ) & level_start_sessions.get(1, set())
                autoplay_midquit_rows.append(
                    {
                        "level": 1,
                        "autoplay_started_sessions": len(l1_auto_sessions),
                        "mid_quit_sessions": len(l1_auto_sessions & mid_quit_sessions_by_level.get(1, set())),
                        "mid_quit_percent": (
                            (len(l1_auto_sessions & mid_quit_sessions_by_level.get(1, set())) / len(l1_auto_sessions)) * 100.0
                            if l1_auto_sessions
                            else 0.0
                        ),
                    }
                )

                for lvl in [2, 3]:
                    auto_start_rows = autoplay[
                        autoplay["session_key"].notna()
                        & autoplay["autoplay_mode_norm"].eq("auto")
                        & autoplay["target_norm"].eq("stage_preview_start")
                        & autoplay["preview_start_source_norm"].eq("auto_preview_timer")
                        & autoplay["current_level_number"].eq(lvl - 1)
                        & autoplay["level_number"].eq(lvl)
                    ].copy()
                    auto_sessions = set(auto_start_rows["session_key"].astype(str)) & level_start_sessions.get(lvl, set())
                    autoplay_midquit_rows.append(
                        {
                            "level": lvl,
                            "autoplay_started_sessions": len(auto_sessions),
                            "mid_quit_sessions": len(auto_sessions & mid_quit_sessions_by_level.get(lvl, set())),
                            "mid_quit_percent": (
                                (len(auto_sessions & mid_quit_sessions_by_level.get(lvl, set())) / len(auto_sessions)) * 100.0
                                if auto_sessions
                                else 0.0
                            ),
                        }
                    )

                autoplay_midquit_df = pd.DataFrame(autoplay_midquit_rows)
                autoplay_midquit_df.to_csv(feature_dir / "autoplay_midquit_first3_levels.csv", index=False)
                plt.figure(figsize=(8, 5))
                ax = plt.gca()
                ax.bar(
                    [f"L{int(v)}" for v in autoplay_midquit_df["level"]],
                    autoplay_midquit_df["mid_quit_percent"],
                    color=["#4e79a7", "#59a14f", "#e15759"],
                )
                ax.set_title("Chance of Mid-Level Quit After Autoplay Start")
                ax.set_xlabel("Level")
                ax.set_ylabel("Percent of Autoplay-Started Sessions That Quit Mid-Level")
                ax.set_ylim(0, 100)
                for idx, value in enumerate(autoplay_midquit_df["mid_quit_percent"]):
                    ax.text(idx, value + 1, f"{value:.1f}%", ha="center", va="bottom", fontsize=9)
                plt.tight_layout()
                plt.savefig(feature_dir / "autoplay_midquit_first3_levels.png", dpi=120)
                plt.close()

        quit_events = events_with_player[events_with_player["event_type_norm"] == "quit_reason"].copy()
        if not quit_events.empty:
            quit_events = add_session_key(quit_events)
            quit_latest = quit_events.sort_values("event_time_ms", na_position="last").groupby("session_key", as_index=False).tail(1)
            bucket_col = "quit_bucket" if "quit_bucket" in quit_latest.columns else "reason"
            quit_counts = quit_latest[bucket_col].astype(str).replace({"": pd.NA, "nan": pd.NA}).dropna().value_counts()
            save_bar(quit_counts, feature_dir / "quit_bucket_distribution.png", "Quit Distribution", "Quit Bucket", "Sessions")
            quit_counts.rename("sessions").to_csv(feature_dir / "quit_bucket_distribution.csv")

            if "player_id_norm" in quit_latest.columns and not adaptive_group_lookup.empty:
                quit_latest = quit_latest.copy()
                quit_latest["adaptive_group_reconstructed"] = quit_latest["player_id_norm"].astype(str).map(adaptive_group_lookup)
                adaptive_quit = (
                    quit_latest[quit_latest["adaptive_group_reconstructed"].astype(str).isin(["A", "B"])]
                    .groupby(["adaptive_group_reconstructed", bucket_col])
                    .size()
                    .unstack(fill_value=0)
                    .sort_index()
                )
                adaptive_quit.index = [label_adaptive_group(idx) for idx in adaptive_quit.index]
                save_stacked_bar(
                    adaptive_quit,
                    adaptive_dir / "adaptive_group_quit_buckets.png",
                    "Quit Buckets by Adaptive Group",
                    "Adaptive Group",
                    "Sessions",
                )

    if not sessions.empty:
        if {"fullscreen_total_seconds", "total_playtime_seconds"} <= set(sessions.columns):
            total = pd.to_numeric(sessions["total_playtime_seconds"], errors="coerce")
            fullscreen = pd.to_numeric(sessions["fullscreen_total_seconds"], errors="coerce")
            ratio = ((fullscreen / total.replace(0, np.nan)) * 100.0).replace([np.inf, -np.inf], np.nan).dropna()
            save_hist_values(
                ratio,
                feature_dir / "fullscreen_time_share_hist.png",
                "Percent of Playtime Spent in Fullscreen",
                "Fullscreen Share (%)",
                bins=20,
            )

        if not adaptive_cohorts.empty:
            session_player_col = pick_player_column(sessions)
            adaptive_sessions = sessions.copy()
            if session_player_col is not None and not adaptive_sessions.empty:
                adaptive_sessions["player_id_norm"] = adaptive_sessions[session_player_col].astype(str)
                adaptive_sessions["adaptive_group_reconstructed"] = adaptive_sessions["player_id_norm"].map(adaptive_group_lookup)
                adaptive_sessions = adaptive_sessions[adaptive_sessions["adaptive_group_reconstructed"].astype(str).isin(["A", "B"])].copy()
            else:
                adaptive_sessions = pd.DataFrame()

            if not adaptive_sessions.empty:
                avg_playtime = adaptive_sessions.groupby("adaptive_group_reconstructed")["total_playtime_seconds"].mean().sort_index()
                avg_playtime.index = [label_adaptive_group(idx) for idx in avg_playtime.index]
                save_bar(avg_playtime, adaptive_dir / "adaptive_group_avg_playtime.png", "Average Playtime by Adaptive Group", "Adaptive Group", "Seconds")
                avg_level = adaptive_sessions.groupby("adaptive_group_reconstructed")["last_level_completed"].mean().sort_index()
                avg_level.index = [label_adaptive_group(idx) for idx in avg_level.index]
                save_bar(avg_level, adaptive_dir / "adaptive_group_avg_last_level.png", "Average Last Level Completed by Adaptive Group", "Adaptive Group", "Level")
                avg_playtime.rename("avg_playtime_seconds").to_csv(adaptive_dir / "adaptive_group_avg_playtime.csv")
                avg_level.rename("avg_last_level_completed").to_csv(adaptive_dir / "adaptive_group_avg_last_level.csv")

                player_col = pick_player_column(adaptive_sessions)
                if player_col:
                    adaptive_sessions["reached_level_3"] = pd.to_numeric(adaptive_sessions["last_level_completed"], errors="coerce").fillna(0) >= 3
                    level3_pct = adaptive_sessions.groupby("adaptive_group_reconstructed")["reached_level_3"].mean().mul(100.0).sort_index()
                    level3_pct.index = [label_adaptive_group(idx) for idx in level3_pct.index]
                    save_bar(level3_pct, adaptive_dir / "adaptive_group_reached_level3_percent.png", "Percent Reaching Level 3 by Adaptive Group", "Adaptive Group", "Percent", (0, 100))
                    level3_pct.rename("percent").to_csv(adaptive_dir / "adaptive_group_reached_level3_percent.csv")

                    if adaptive_cohorts["group_assigned_ts"].notna().any():
                        all_sessions = sessions.copy()
                        all_player_col = pick_player_column(all_sessions)
                        all_ts = pd.Series(pd.NaT, index=all_sessions.index, dtype="datetime64[ns, UTC]")
                        for col in ["started_at", "created_at", "updated_at"]:
                            if col in all_sessions.columns:
                                all_ts = all_ts.combine_first(pd.to_datetime(all_sessions[col], utc=True, errors="coerce"))
                        if all_player_col and all_ts.notna().any():
                            all_sessions["player_id_norm"] = all_sessions[all_player_col].astype(str)
                            all_sessions["session_ts"] = all_ts
                            all_sessions = all_sessions.dropna(subset=["player_id_norm", "session_ts"]).copy()

                            first_group = adaptive_cohorts[adaptive_cohorts["adaptive_group"].isin(["A", "B"])].copy()
                            player_summary = first_group.copy()
                            merged = all_sessions.merge(first_group, on="player_id_norm", how="inner")
                            merged["day_delta"] = (
                                merged["session_ts"].dt.floor("D") - merged["group_assigned_ts"].dt.floor("D")
                            ).dt.days
                            merged["is_return_session"] = merged["day_delta"] >= 1

                            player_summary["sessions_after_assignment"] = player_summary["player_id_norm"].map(
                                merged[merged["is_return_session"]].groupby("player_id_norm").size()
                            ).fillna(0).astype(int)
                            for days in [1, 3, 7]:
                                returned = (
                                    merged[(merged["day_delta"] >= 1) & (merged["day_delta"] <= days)]
                                    .groupby("player_id_norm")
                                    .size()
                                    .gt(0)
                                )
                                player_summary[f"returned_within_{days}d"] = player_summary["player_id_norm"].map(returned).fillna(False)

                            player_summary.to_csv(adaptive_dir / "adaptive_group_player_retention.csv", index=False)

                            retention_rows: list[dict[str, Any]] = []
                            for group, group_rows in player_summary.groupby("adaptive_group"):
                                denom = len(group_rows)
                                if denom <= 0:
                                    continue
                                for days in [1, 3, 7]:
                                    returned_pct = float(group_rows[f"returned_within_{days}d"].mean() * 100.0)
                                    retention_rows.append({
                                        "adaptive_group": group,
                                        "window": f"within_{days}d",
                                        "percent": returned_pct,
                                    })
                            if retention_rows:
                                retention_df = pd.DataFrame(retention_rows)
                                retention_df["adaptive_group_label"] = retention_df["adaptive_group"].map(label_adaptive_group)
                                retention_df.to_csv(adaptive_dir / "adaptive_group_retention_windows.csv", index=False)
                                retention_plot = retention_df.pivot(index="window", columns="adaptive_group_label", values="percent").sort_index()
                                retention_plot = retention_plot.reindex(columns=[label_adaptive_group(name) for name in ["B", "A"]]).dropna(axis=1, how="all")
                                save_grouped_bar(
                                    retention_plot,
                                    adaptive_dir / "adaptive_group_retention_windows.png",
                                    "Adaptive Group Return Within N Days",
                                    "Window",
                                    "Percent of Players",
                                    (0, 100),
                                )

        if {"player_id_norm", "time_seconds"} <= set(attempts_with_player.columns) and not adaptive_cohorts.empty:
                player_retention = (
                    attempts_with_player.dropna(subset=["player_id_norm"]).copy()
                    .assign(time_seconds=pd.to_numeric(attempts_with_player["time_seconds"], errors="coerce"))
                    .dropna(subset=["time_seconds"])
                    .groupby("player_id_norm")["time_seconds"]
                    .sum()
                    .astype(float)
                )

                cohort = pd.DataFrame(index=player_retention.index.astype(str))
                cohort.index.name = "player_id_norm"
                cohort["retention_seconds"] = player_retention
                cohort["adaptive_retention_group"] = cohort.index.map(adaptive_group_lookup)
                cohort["adaptive_retention_group_label"] = cohort["adaptive_retention_group"].map(label_adaptive_group)

                cohort = cohort[cohort["adaptive_retention_group"].isin(["A", "B", "unassigned"])].copy()
                if not cohort.empty:
                    def save_adaptive_time_outputs(
                        cohort_frame: pd.DataFrame,
                        filename_suffix: str = "",
                        title_modifier: str = "",
                    ) -> None:
                        if cohort_frame.empty:
                            return

                        cohort_frame = cohort_frame.copy()
                        cohort_frame.reset_index().to_csv(
                            adaptive_dir / f"adaptive_retention_time_cohorts{filename_suffix}.csv",
                            index=False,
                        )
                        retention_rows: list[dict[str, Any]] = []
                        max_minutes = int(np.ceil(cohort_frame["retention_seconds"].max() / 60.0)) if not cohort_frame.empty else 0
                        for group_name, group_rows in cohort_frame.groupby("adaptive_retention_group"):
                            seconds = pd.to_numeric(group_rows["retention_seconds"], errors="coerce").dropna().astype(float)
                            if seconds.empty:
                                continue
                            for minute in range(0, max(1, max_minutes) + 1):
                                retention_rows.append(
                                    {
                                        "adaptive_group": group_name,
                                        "minute": minute,
                                        "percent": float((seconds >= (minute * 60.0)).mean() * 100.0),
                                    }
                                )
                        if retention_rows:
                            retention_curve_df = pd.DataFrame(retention_rows)
                            retention_curve_df["adaptive_group_label"] = retention_curve_df["adaptive_group"].map(label_adaptive_group)
                            retention_curve_df.to_csv(
                                adaptive_dir / f"adaptive_group_retention_by_time{filename_suffix}.csv",
                                index=False,
                            )
                            retention_curve_plot = retention_curve_df.pivot(index="minute", columns="adaptive_group_label", values="percent")
                            retention_curve_plot = retention_curve_plot.reindex(columns=adaptive_group_label_order).dropna(axis=1, how="all")
                            plot_title = "Retention by Time for Adaptive Cohorts"
                            plot_first_30_title = "Retention by Time for Adaptive Cohorts (First 30 Minutes)"
                            if title_modifier:
                                plot_title = f"Retention by Time for Adaptive Cohorts ({title_modifier})"
                                plot_first_30_title = f"Retention by Time for Adaptive Cohorts ({title_modifier}, First 30 Minutes)"
                            save_multi_line_percent(
                                retention_curve_plot,
                                adaptive_dir / f"adaptive_group_retention_by_time{filename_suffix}.png",
                                plot_title,
                                "Gameplay time (minutes threshold)",
                                "Retention (%)",
                                (0, 100),
                            )
                            save_multi_line_percent(
                                retention_curve_plot,
                                adaptive_dir / f"adaptive_group_retention_by_time{filename_suffix}_first_30.png",
                                plot_first_30_title,
                                "Gameplay time (minutes threshold)",
                                "Retention (%)",
                                (0, 100),
                                x_max=30,
                            )

                            total_players_denominator = int(cohort_frame.shape[0])
                            if total_players_denominator > 0:
                                retention_all_rows: list[dict[str, Any]] = []
                                for group_name, group_rows in cohort_frame.groupby("adaptive_retention_group"):
                                    seconds = pd.to_numeric(group_rows["retention_seconds"], errors="coerce").dropna().astype(float)
                                    if seconds.empty:
                                        continue
                                    for minute in range(0, max(1, max_minutes) + 1):
                                        retained_count = int((seconds >= (minute * 60.0)).sum())
                                        retention_all_rows.append(
                                            {
                                                "adaptive_group": group_name,
                                                "minute": minute,
                                                "percent_all_players": float((retained_count / total_players_denominator) * 100.0),
                                            }
                                        )
                                if retention_all_rows:
                                    retention_all_df = pd.DataFrame(retention_all_rows)
                                    retention_all_df["adaptive_group_label"] = retention_all_df["adaptive_group"].map(label_adaptive_group)
                                    retention_all_df.to_csv(
                                        adaptive_dir / f"adaptive_group_retention_by_time_all_players{filename_suffix}.csv",
                                        index=False,
                                    )
                                    retention_all_plot = retention_all_df.pivot(index="minute", columns="adaptive_group_label", values="percent_all_players")
                                    retention_all_plot = retention_all_plot.reindex(columns=adaptive_group_label_order).dropna(axis=1, how="all")
                                    all_players_title = "Retention by Time for Adaptive Cohorts (% of All Cohort Players)"
                                    all_players_first_30_title = "Retention by Time for Adaptive Cohorts (% of All Cohort Players, First 30 Minutes)"
                                    if title_modifier:
                                        all_players_title = f"Retention by Time for Adaptive Cohorts (% of All Cohort Players, {title_modifier})"
                                        all_players_first_30_title = f"Retention by Time for Adaptive Cohorts (% of All Cohort Players, {title_modifier}, First 30 Minutes)"
                                    save_multi_line_percent(
                                        retention_all_plot,
                                        adaptive_dir / f"adaptive_group_retention_by_time_all_players{filename_suffix}.png",
                                        all_players_title,
                                        "Gameplay time (minutes threshold)",
                                        "Percent of All Three-Group Players (%)",
                                        (0, 100),
                                    )
                                    save_multi_line_percent(
                                        retention_all_plot,
                                        adaptive_dir / f"adaptive_group_retention_by_time_all_players{filename_suffix}_first_30.png",
                                        all_players_first_30_title,
                                        "Gameplay time (minutes threshold)",
                                        "Percent of All Three-Group Players (%)",
                                        (0, 100),
                                        x_max=30,
                                    )

                    save_adaptive_time_outputs(cohort)
                    save_adaptive_time_outputs(
                        filter_frame_by_player_ids(cohort, excluded_player_ids),
                        "_outliers_removed",
                        "Outliers Removed",
                    )


def attempts_before_first_pass(passed_series: pd.Series) -> int:
    vals = passed_series.astype(bool).tolist()
    for i, ok in enumerate(vals):
        if ok:
            return i
    return len(vals)


def retries_before_after_first_pass(passed_series: pd.Series) -> tuple[int, int]:
    vals = passed_series.astype(bool).tolist()
    if not vals:
        return 0, 0
    for i, ok in enumerate(vals):
        if ok:
            return i, max(0, len(vals) - i - 1)
    return max(0, len(vals) - 1), 0


def sanitize_version_name(version: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", str(version)).strip("_") or "unknown"


def parse_version_key(version: str) -> tuple:
    tokens = re.findall(r"\d+|[A-Za-z]+", str(version))
    key: list[Any] = []
    for t in tokens:
        if t.isdigit():
            key.append((0, int(t)))
        else:
            key.append((1, t.lower()))
    return tuple(key) if key else ((1, str(version).lower()),)

def analyze_level_dropoff_metrics(
    attempts_with_player: pd.DataFrame,
    player_highest_completed: pd.Series,
    events: pd.DataFrame,
    outdir: Path
) -> None:
    """Generate playtime and retry graphs for players who dropped off between levels."""
    if attempts_with_player.empty or player_highest_completed.empty:
        return
    
    if not {"player_id_norm", "level_number", "time_seconds", "passed"} <= set(attempts_with_player.columns):
        return
    
    dropoff_dir = outdir / "level_dropoff_analysis"
    dropoff_dir.mkdir(parents=True, exist_ok=True)
    
    attempts_with_player["passed_flag"] = bool_series(attempts_with_player["passed"])
    attempts_with_player["time_seconds"] = pd.to_numeric(attempts_with_player["time_seconds"], errors="coerce")

    all_players = set(player_highest_completed.index.astype(str).tolist())
    level1_attempt_players = set(
        attempts_with_player[
            attempts_with_player["level_number"].eq(1)
            & attempts_with_player["player_id_norm"].notna()
        ]["player_id_norm"].astype(str).tolist()
    )
    level1_completed_players = set(
        attempts_with_player[
            attempts_with_player["level_number"].eq(1)
            & attempts_with_player["passed_flag"]
            & attempts_with_player["player_id_norm"].notna()
        ]["player_id_norm"].astype(str).tolist()
    )
    level2_attempt_players = set(
        attempts_with_player[
            attempts_with_player["level_number"].eq(2)
            & attempts_with_player["player_id_norm"].notna()
        ]["player_id_norm"].astype(str).tolist()
    )

    before_l1_players = all_players - level1_attempt_players
    started_l1_not_completed_players = level1_attempt_players - level1_completed_players
    completed_l1_quit_immediately_players = level1_completed_players - level2_attempt_players
    completed_l1_attempted_l2_players = level1_completed_players & level2_attempt_players

    total_players = len(all_players)
    if total_players > 0:
        level1_flow_counts = pd.Series(
            {
                "Quit Before L1": len(before_l1_players),
                "Started L1, Quit Before Finish": len(started_l1_not_completed_players),
                "Completed L1, Quit Immediately": len(completed_l1_quit_immediately_players),
                "Completed L1, Attempted L2": len(completed_l1_attempted_l2_players),
            }
        )
        level1_flow_percent = (level1_flow_counts / total_players) * 100.0

        plt.figure(figsize=(9, 5))
        ax = level1_flow_percent.plot(kind="bar", color=["#9c755f", "#e15759", "#f28e2b", "#4e79a7"])
        plt.title("Player Flow Around Level 1")
        plt.xlabel("Player Group")
        plt.ylabel("Percent of Players")
        plt.ylim(0, 100)
        for idx, value in enumerate(level1_flow_percent.values):
            ax.text(idx, value + 1, f"{value:.1f}%", ha="center", va="bottom", fontsize=9)
        plt.tight_layout()
        plt.savefig(dropoff_dir / "level1_player_flow_percent.png", dpi=120)
        plt.close()

        level1_flow_percent.rename("percent_of_players").to_csv(dropoff_dir / "level1_player_flow_percent.csv")

    level1_noncompleter_players = set(started_l1_not_completed_players)
    if level1_noncompleter_players:
        attempts_with_session = add_session_key(attempts_with_player.copy())
        level1_noncomplete_attempts = attempts_with_session[
            attempts_with_session["player_id_norm"].astype(str).isin(level1_noncompleter_players)
            & attempts_with_session["level_number"].eq(1)
        ].copy()
        failed_l1_counts = (
            level1_noncomplete_attempts[~level1_noncomplete_attempts["passed_flag"]]
            .groupby("player_id_norm")
            .size()
        )

        session_player_map = (
            attempts_with_session[
                attempts_with_session["session_key"].notna() & attempts_with_session["player_id_norm"].notna()
            ][["session_key", "player_id_norm"]]
            .drop_duplicates()
        )
        quit_summary = infer_quit_summary(events, attempts_with_player)
        if not quit_summary.empty and not session_player_map.empty:
            quit_summary = quit_summary.merge(session_player_map, on="session_key", how="left")
            level1_mid_quit_players = set(
                quit_summary[
                    quit_summary["quit_level"].eq(1)
                    & quit_summary["quit_mid_level"]
                    & quit_summary["player_id_norm"].astype(str).isin(level1_noncompleter_players)
                ]["player_id_norm"].astype(str)
            )
        else:
            level1_mid_quit_players = set()

        multiple_fail_quit_players = {
            str(pid)
            for pid, fail_count in failed_l1_counts.items()
            if str(pid) in level1_noncompleter_players and fail_count >= 2 and str(pid) not in level1_mid_quit_players
        }
        single_fail_quit_players = level1_noncompleter_players - level1_mid_quit_players - multiple_fail_quit_players

        level1_quit_breakdown_counts = pd.Series(
            {
                "Quit Mid-Level": len(level1_mid_quit_players),
                "Quit After 1 Failure": len(single_fail_quit_players),
                "Quit After Multiple Failures": len(multiple_fail_quit_players),
            }
        )
        level1_quit_breakdown_percent = (level1_quit_breakdown_counts / len(level1_noncompleter_players)) * 100.0

        plt.figure(figsize=(9, 5))
        ax = level1_quit_breakdown_percent.plot(kind="bar", color=["#76b7b2", "#e15759", "#b07aa1"])
        plt.title("How Level 1 Non-Completers Quit")
        plt.xlabel("Level 1 Quit Group")
        plt.ylabel("Percent of Level 1 Non-Completers")
        plt.ylim(0, 100)
        for idx, value in enumerate(level1_quit_breakdown_percent.values):
            ax.text(idx, value + 1, f"{value:.1f}%", ha="center", va="bottom", fontsize=9)
        plt.tight_layout()
        plt.savefig(dropoff_dir / "level1_quit_breakdown_percent.png", dpi=120)
        plt.close()

        level1_quit_breakdown_percent.rename("percent_of_level1_noncompleters").to_csv(
            dropoff_dir / "level1_quit_breakdown_percent.csv"
        )
    
    # Helper to get players who completed level X but not level Y
    def get_dropoff_players(completed_level: int, not_completed_level: int) -> set[str]:
        # Players whose highest completed level is exactly completed_level
        return set(
            player_highest_completed[player_highest_completed == completed_level]
            .index.astype(str)
            .tolist()
        )
    
    # 1. Playtime: Completed L1, did not complete L2
    l1_dropoff = get_dropoff_players(1, 2)
    if l1_dropoff:
        playtime_l1 = (
            attempts_with_player[
                attempts_with_player["player_id_norm"].isin(l1_dropoff)
                & (attempts_with_player["level_number"] == 1)
            ]
            .groupby("player_id_norm")["time_seconds"]
            .first()  # Changed from .sum() to .first()
        )
        save_hist_values(
            playtime_l1,
            dropoff_dir / "playtime_level1_dropoff_before_level2.png",
            "First Attempt Playtime on Level 1 (Players Who Completed L1 But Not L2)",
            "Time (seconds)",
            bins=20,
        )

    # 2. Playtime: Completed L2, did not complete L3
    l2_dropoff = get_dropoff_players(2, 3)
    if l2_dropoff:
        playtime_l2 = (
            attempts_with_player[
                attempts_with_player["player_id_norm"].isin(l2_dropoff)
                & (attempts_with_player["level_number"] == 2)
            ]
            .groupby("player_id_norm")["time_seconds"]
            .first()  # Changed from .sum() to .first()
        )
        save_hist_values(
            playtime_l2,
            dropoff_dir / "playtime_level2_dropoff_before_level3.png",
            "First Attempt Playtime on Level 2 (Players Who Completed L2 But Not L3)",
            "Time (seconds)",
            bins=20,
        )
    
    # 3. Retries: Completed L1, did not complete L2
    if l1_dropoff:
        l1_attempts = attempts_with_player[
            attempts_with_player["player_id_norm"].isin(l1_dropoff)
            & (attempts_with_player["level_number"] == 1)
        ]
        retries_split = (
            l1_attempts.groupby("player_id_norm")["passed_flag"]
            .apply(retries_before_after_first_pass)
            .apply(pd.Series)
        )
        retries_split.columns = ["before_completion", "after_completion"]
        retries_split.index = [str(pid)[:6] for pid in retries_split.index]
        
        plt.figure(figsize=(10, 5))
        retries_split.plot(kind="bar", color=["#1f77b4", "#ff7f0e"])
        plt.title("Retries on Level 1 (Players Who Completed L1 But Not L2)")
        plt.xlabel("Player")
        plt.ylabel("Number of Retries")
        plt.legend(["Before Completion", "After Completion"])
        plt.tight_layout()
        plt.savefig(dropoff_dir / "retries_level1_dropoff_before_level2.png", dpi=120)
        plt.close()

    # 4. Retries: Completed L2, did not complete L3
    if l2_dropoff:
        l2_attempts = attempts_with_player[
            attempts_with_player["player_id_norm"].isin(l2_dropoff)
            & (attempts_with_player["level_number"] == 2)
        ]
        retries_split = (
            l2_attempts.groupby("player_id_norm")["passed_flag"]
            .apply(retries_before_after_first_pass)
            .apply(pd.Series)
        )
        retries_split.columns = ["before_completion", "after_completion"]
        retries_split.index = [str(pid)[:6] for pid in retries_split.index]
        
        plt.figure(figsize=(10, 5))
        retries_split.plot(kind="bar", color=["#1f77b4", "#ff7f0e"])
        plt.title("Retries on Level 2 (Players Who Completed L2 But Not L3)")
        plt.xlabel("Player")
        plt.ylabel("Number of Retries")
        plt.legend(["Before Completion", "After Completion"])
        plt.tight_layout()
        plt.savefig(dropoff_dir / "retries_level2_dropoff_before_level3.png", dpi=120)
        plt.close()
    
    # Graphs for players who DID complete the next level
    l1_continued = set(player_highest_completed[player_highest_completed >= 2].index.astype(str).tolist())
    l2_continued = set(player_highest_completed[player_highest_completed >= 3].index.astype(str).tolist())

    # 5. First attempt playtime L1 (players who completed L2+)
    if l1_continued:
        playtime_l1_cont = (
            attempts_with_player[
                attempts_with_player["player_id_norm"].isin(l1_continued)
                & (attempts_with_player["level_number"] == 1)
            ]
            .groupby("player_id_norm")["time_seconds"]
            .first()
        )
        save_hist_values(
            playtime_l1_cont,
            dropoff_dir / "playtime_level1_continued_to_level2.png",
            "First Attempt Playtime on Level 1 (Players Who Completed L2+)",
            "Time (seconds)",
            bins=20,
        )

    # 6. First attempt playtime L2 (players who completed L3+)
    if l2_continued:
        playtime_l2_cont = (
            attempts_with_player[
                attempts_with_player["player_id_norm"].isin(l2_continued)
                & (attempts_with_player["level_number"] == 2)
            ]
            .groupby("player_id_norm")["time_seconds"]
            .first()
        )
        save_hist_values(
            playtime_l2_cont,
            dropoff_dir / "playtime_level2_continued_to_level3.png",
            "First Attempt Playtime on Level 2 (Players Who Completed L3+)",
            "Time (seconds)",
            bins=20,
        )

    # 7. Retries L1 (players who completed L2+)
    if l1_continued:
        l1_cont_attempts = attempts_with_player[
            attempts_with_player["player_id_norm"].isin(l1_continued)
            & (attempts_with_player["level_number"] == 1)
        ]
        retries_split = (
            l1_cont_attempts.groupby("player_id_norm")["passed_flag"]
            .apply(retries_before_after_first_pass)
            .apply(pd.Series)
        )
        retries_split.columns = ["before_completion", "after_completion"]
        retries_split.index = [str(pid)[:6] for pid in retries_split.index]
        
        plt.figure(figsize=(10, 5))
        retries_split.plot(kind="bar", color=["#1f77b4", "#ff7f0e"])
        plt.title("Retries on Level 1 (Players Who Completed L2+)")
        plt.xlabel("Player")
        plt.ylabel("Number of Retries")
        plt.legend(["Before Completion", "After Completion"])
        plt.tight_layout()
        plt.savefig(dropoff_dir / "retries_level1_continued_to_level2.png", dpi=120)
        plt.close()

    # 8. Retries L2 (players who completed L3+)
    if l2_continued:
        l2_cont_attempts = attempts_with_player[
            attempts_with_player["player_id_norm"].isin(l2_continued)
            & (attempts_with_player["level_number"] == 2)
        ]
        retries_split = (
            l2_cont_attempts.groupby("player_id_norm")["passed_flag"]
            .apply(retries_before_after_first_pass)
            .apply(pd.Series)
        )
        retries_split.columns = ["before_completion", "after_completion"]
        retries_split.index = [str(pid)[:6] for pid in retries_split.index]
        
        plt.figure(figsize=(10, 5))
        retries_split.plot(kind="bar", color=["#1f77b4", "#ff7f0e"])
        plt.title("Retries on Level 2 (Players Who Completed L3+)")
        plt.xlabel("Player")
        plt.ylabel("Number of Retries")
        plt.legend(["Before Completion", "After Completion"])
        plt.tight_layout()
        plt.savefig(dropoff_dir / "retries_level2_continued_to_level3.png", dpi=120)
        plt.close()

        # Check if dropoff players attempted the next level
    l1_dropoff_attempted_l2 = set(
        attempts_with_player[
            attempts_with_player["player_id_norm"].isin(l1_dropoff)
            & (attempts_with_player["level_number"] == 2)
        ]["player_id_norm"].unique()
    )
    l1_dropoff_not_attempted_l2 = l1_dropoff - l1_dropoff_attempted_l2

    plt.figure(figsize=(7, 5))
    plt.bar(
        ["Attempted L2", "Did Not Attempt L2"],
        [len(l1_dropoff_attempted_l2), len(l1_dropoff_not_attempted_l2)],
        color=["#2ecc71", "#e74c3c"]
    )
    plt.title("L2 Attempt Rate (Players Who Completed L1 But Not L2)")
    plt.ylabel("Player Count")
    plt.tight_layout()
    plt.savefig(dropoff_dir / "level2_attempt_rate_by_l1_dropoff.png", dpi=120)
    plt.close()

    l2_dropoff_attempted_l3 = set(
        attempts_with_player[
            attempts_with_player["player_id_norm"].isin(l2_dropoff)
            & (attempts_with_player["level_number"] == 3)
        ]["player_id_norm"].unique()
    )
    l2_dropoff_not_attempted_l3 = l2_dropoff - l2_dropoff_attempted_l3

    plt.figure(figsize=(7, 5))
    plt.bar(
        ["Attempted L3", "Did Not Attempt L3"],
        [len(l2_dropoff_attempted_l3), len(l2_dropoff_not_attempted_l3)],
        color=["#2ecc71", "#e74c3c"]
    )
    plt.title("L3 Attempt Rate (Players Who Completed L2 But Not L3)")
    plt.ylabel("Player Count")
    plt.tight_layout()
    plt.savefig(dropoff_dir / "level3_attempt_rate_by_l2_dropoff.png", dpi=120)
    plt.close()

    # Add summary statistics
    summary_lines = [
        f"Players who completed L1 but not L2: {len(l1_dropoff)}",
        f"Players who completed L2 but not L3: {len(l2_dropoff)}",
        f"Players who quit before level 1: {len(before_l1_players)}",
        f"Players who started level 1 but did not complete it: {len(started_l1_not_completed_players)}",
        f"Players who completed level 1 and quit immediately: {len(completed_l1_quit_immediately_players)}",
        f"Players who completed level 1 and attempted level 2: {len(completed_l1_attempted_l2_players)}",
    ]
    if level1_noncompleter_players:
        summary_lines.extend(
            [
                f"Level 1 non-completers who quit mid-level: {len(level1_mid_quit_players)}",
                f"Level 1 non-completers who quit after 1 failure: {len(single_fail_quit_players)}",
                f"Level 1 non-completers who quit after multiple failures: {len(multiple_fail_quit_players)}",
            ]
        )
    (dropoff_dir / "dropoff_summary.txt").write_text("\n".join(summary_lines), encoding="utf-8")

def sort_attempts_for_sequence(attempts_df: pd.DataFrame) -> pd.DataFrame:
    """Sort attempts in likely chronological order for sequence-derived metrics."""
    out = attempts_df.copy()
    out["_row_order"] = np.arange(len(out))
    if "created_at" in out.columns:
        out["_created_at_ts"] = pd.to_datetime(out["created_at"], utc=True, errors="coerce")
        return out.sort_values(["_created_at_ts", "_row_order"], na_position="last")
    return out.sort_values(["_row_order"])


def level_attempt_mask(feat_df: pd.DataFrame, level: int) -> pd.Series:
    """Mask of players who attempted a given level at least once."""
    candidate_cols = [
        f"l{level}_first_attempt_succeeded",
        f"l{level}_failed_first_attempt",
        f"l{level}_first_attempt_time",
    ]
    available = [c for c in candidate_cols if c in feat_df.columns]
    if not available:
        return pd.Series(False, index=feat_df.index)
    mask = pd.Series(False, index=feat_df.index)
    for c in available:
        mask = mask | feat_df[c].notna()
    return mask


def pearson_with_bootstrap_ci(
    x: pd.Series,
    y: pd.Series,
    n_boot: int = 1000,
    ci: float = 0.95,
    seed: int = 42,
) -> tuple[float, float, float]:
    """Return Pearson r and bootstrap CI bounds."""
    d = pd.DataFrame({"x": pd.to_numeric(x, errors="coerce"), "y": pd.to_numeric(y, errors="coerce")}).dropna()
    if len(d) < 3:
        return np.nan, np.nan, np.nan
    xv = d["x"].to_numpy(dtype=float)
    yv = d["y"].to_numpy(dtype=float)
    if np.std(xv) == 0 or np.std(yv) == 0:
        return np.nan, np.nan, np.nan

    r = float(np.corrcoef(xv, yv)[0, 1])
    rng = np.random.default_rng(seed)
    boot_vals: list[float] = []
    n = len(xv)
    for _ in range(n_boot):
        idx = rng.integers(0, n, size=n)
        xb = xv[idx]
        yb = yv[idx]
        if np.std(xb) == 0 or np.std(yb) == 0:
            continue
        rb = float(np.corrcoef(xb, yb)[0, 1])
        if np.isfinite(rb):
            boot_vals.append(rb)
    if not boot_vals:
        return r, np.nan, np.nan

    alpha = 1.0 - ci
    lo = float(np.percentile(boot_vals, 100.0 * (alpha / 2.0)))
    hi = float(np.percentile(boot_vals, 100.0 * (1.0 - alpha / 2.0)))
    return r, lo, hi


def main() -> None:
    p = argparse.ArgumentParser(description="Analyze Flash Recall logs")
    p.add_argument("--sessions", type=Path)
    p.add_argument("--attempts", type=Path)
    p.add_argument("--events", type=Path)
    p.add_argument("--outdir", type=Path, default=Path("analysis_output"))
    p.add_argument("--version-filter", type=str, default=None, help="Analyze only one game_version value")
    p.add_argument("--extra-version", action="append", default=[], help="Additional game versions to analyze (separate output folders)")
    args = p.parse_args()
    args.outdir.mkdir(parents=True, exist_ok=True)

    sessions = normalize_columns(load_table(args.sessions)) if args.sessions else pd.DataFrame()
    attempts = normalize_columns(load_table(args.attempts)) if args.attempts else pd.DataFrame()
    events = normalize_columns(load_table(args.events)) if args.events else pd.DataFrame()

    if "total_playtime_seconds" in sessions.columns:
        sessions["total_playtime_seconds"] = pd.to_numeric(sessions["total_playtime_seconds"], errors="coerce")
    if "last_level_completed" in sessions.columns:
        sessions["last_level_completed"] = pd.to_numeric(sessions["last_level_completed"], errors="coerce")
    if "level_number" in attempts.columns:
        attempts["level_number"] = pd.to_numeric(attempts["level_number"], errors="coerce")
    if "stars" in attempts.columns:
        attempts["stars"] = pd.to_numeric(attempts["stars"], errors="coerce")
    if "time_seconds" in attempts.columns:
        attempts["time_seconds"] = pd.to_numeric(attempts["time_seconds"], errors="coerce")
    if "rounds" in attempts.columns:
        attempts["rounds"] = attempts["rounds"].map(maybe_json)
    if "cards_failed" in attempts.columns:
        attempts["cards_failed"] = attempts["cards_failed"].map(maybe_json)
    if "level_number" in events.columns:
        events["level_number"] = pd.to_numeric(events["level_number"], errors="coerce")

    # Version orchestration: default analyzes latest version only; --extra-version adds more folders.
    if args.version_filter is None:
        available_versions: set[str] = set()
        for df in [sessions, attempts, events]:
            if not df.empty and "game_version" in df.columns:
                available_versions.update(df["game_version"].dropna().astype(str).tolist())
        if available_versions:
            latest = sorted(available_versions, key=parse_version_key)[-1]
            requested = [latest] + [v for v in args.extra_version if v]
            seen: set[str] = set()
            ordered_versions: list[str] = []
            for v in requested:
                if v not in seen:
                    seen.add(v)
                    ordered_versions.append(v)
            for version in ordered_versions:
                subdir = args.outdir / f"version_{sanitize_version_name(version)}"
                cmd = [
                    sys.executable,
                    str(Path(__file__).resolve()),
                    "--outdir",
                    str(subdir),
                    "--version-filter",
                    str(version),
                ]
                if args.sessions:
                    cmd.extend(["--sessions", str(args.sessions)])
                if args.attempts:
                    cmd.extend(["--attempts", str(args.attempts)])
                if args.events:
                    cmd.extend(["--events", str(args.events)])
                subprocess.run(cmd, check=True)
            return

    if args.version_filter:
        vf = str(args.version_filter)
        if "game_version" in sessions.columns:
            sessions = sessions[sessions["game_version"].astype(str) == vf].copy()
        if "game_version" in attempts.columns:
            attempts = attempts[attempts["game_version"].astype(str) == vf].copy()
        if "game_version" in events.columns:
            events = events[events["game_version"].astype(str) == vf].copy()

    summary: list[str] = ["Flash Recall Logging Analysis", "=" * 32]
    if args.version_filter:
        summary.append(f"version_filter: {args.version_filter}")
    if not sessions.empty:
        summary.append(f"sessions: {len(sessions)}")
        if "player_id" in sessions.columns:
            summary.append(f"unique_players: {sessions['player_id'].nunique()}")
        sessions_player_col = pick_player_column(sessions)
        if sessions_player_col is not None and "site_host" in sessions.columns:
            host_players = sessions[[sessions_player_col, "site_host"]].copy()
            host_players[sessions_player_col] = host_players[sessions_player_col].astype(str)
            host_players["site_host"] = (
                host_players["site_host"]
                .astype(str)
                .replace({"": pd.NA, "nan": pd.NA, "none": pd.NA, "null": pd.NA})
            )
            host_players = host_players.dropna(subset=[sessions_player_col, "site_host"]).drop_duplicates()
            if not host_players.empty:
                host_counts = (
                    host_players.groupby("site_host")[sessions_player_col]
                    .nunique()
                    .sort_values(ascending=False)
                )
                if not host_counts.empty:
                    summary.append("site_hosts_by_unique_players:")
                    for host, count in host_counts.items():
                        summary.append(f"  {host}: {int(count)}")
    summary.append("retention_metric: attempts.time_seconds sum per player (stage gameplay time; closest complete exported proxy for reveal+recall time), fallback sessions.total_playtime_seconds")
    summary.append("active_playtime_metric: sessions.total_playtime_seconds sum per player (includes menu/result viewing until inactivity pause)")
    summary.append("stats_like_time_metric: events.round_complete.time_spent_seconds sum per player (same per-round timer source as local stats menu, but partial because final successful rounds are not emitted as round_complete)")
    attempts_with_player = add_player_id_to_attempts(attempts, sessions)

    # Player-level baseline: highest completed level per player, with 0 for players with no completed levels.
    player_highest_completed = pd.Series(dtype=float)
    sessions_player_col = pick_player_column(sessions) if not sessions.empty else None
    all_players: set[str] = set()
    if sessions_player_col is not None:
        all_players.update(sessions[sessions_player_col].dropna().astype(str).tolist())
    if "player_id_norm" in attempts_with_player.columns:
        all_players.update(attempts_with_player["player_id_norm"].dropna().astype(str).tolist())
    events_player_col = pick_player_column(events) if not events.empty else None
    if events_player_col is not None:
        all_players.update(events[events_player_col].dropna().astype(str).tolist())
    if sessions_player_col is not None and "last_level_completed" in sessions.columns:
        player_highest_completed = (
            sessions.dropna(subset=[sessions_player_col])
            .groupby(sessions[sessions_player_col].astype(str))["last_level_completed"]
            .max()
            .fillna(0)
            .clip(lower=0)
            .astype(float)
        )
    if player_highest_completed.empty and {"player_id_norm", "level_number", "passed"} <= set(attempts_with_player.columns):
        attempts_with_player["passed_flag"] = bool_series(attempts_with_player["passed"])
        completed_levels = (
            attempts_with_player[
                attempts_with_player["passed_flag"] & attempts_with_player["player_id_norm"].notna() & attempts_with_player["level_number"].notna()
            ]
            .groupby("player_id_norm")["level_number"]
            .max()
            .astype(float)
        )
        player_highest_completed = completed_levels
    if all_players:
        player_highest_completed = player_highest_completed.reindex(sorted(all_players)).fillna(0.0)

    # Real-time adoption curve: cumulative unique players by first-seen timestamp.
    # Uses the earliest available timestamp per player across sessions/attempts/events.
    first_seen_parts: list[pd.DataFrame] = []
    if sessions_player_col is not None and not sessions.empty:
        s_ts = pd.Series(pd.NaT, index=sessions.index, dtype="datetime64[ns, UTC]")
        for col in ["started_at", "created_at", "last_activity_at", "updated_at"]:
            if col in sessions.columns:
                s_ts = s_ts.combine_first(pd.to_datetime(sessions[col], utc=True, errors="coerce"))
        s_part = pd.DataFrame(
            {
                "player_id_norm": sessions[sessions_player_col].astype(str),
                "first_seen_ts": s_ts,
            }
        ).dropna(subset=["player_id_norm", "first_seen_ts"])
        if not s_part.empty:
            first_seen_parts.append(s_part)

    if {"player_id_norm", "created_at"} <= set(attempts_with_player.columns):
        a_part = pd.DataFrame(
            {
                "player_id_norm": attempts_with_player["player_id_norm"].astype(str),
                "first_seen_ts": pd.to_datetime(attempts_with_player["created_at"], utc=True, errors="coerce"),
            }
        ).dropna(subset=["player_id_norm", "first_seen_ts"])
        if not a_part.empty:
            first_seen_parts.append(a_part)

    events_player_col = pick_player_column(events) if not events.empty else None
    if events_player_col is not None and not events.empty:
        e_ts = pd.Series(pd.NaT, index=events.index, dtype="datetime64[ns, UTC]")
        if "event_timestamp" in events.columns:
            e_ts = e_ts.combine_first(pd.to_datetime(events["event_timestamp"], utc=True, errors="coerce"))
        if "client_iso" in events.columns:
            e_ts = e_ts.combine_first(pd.to_datetime(events["client_iso"], utc=True, errors="coerce"))
        if "client_timestamp_ms" in events.columns:
            e_ts = e_ts.combine_first(pd.to_datetime(pd.to_numeric(events["client_timestamp_ms"], errors="coerce"), unit="ms", utc=True, errors="coerce"))
        e_part = pd.DataFrame(
            {
                "player_id_norm": events[events_player_col].astype(str),
                "first_seen_ts": e_ts,
            }
        ).dropna(subset=["player_id_norm", "first_seen_ts"])
        if not e_part.empty:
            first_seen_parts.append(e_part)

    if first_seen_parts:
        first_seen = pd.concat(first_seen_parts, ignore_index=True)
        first_seen["player_id_norm"] = first_seen["player_id_norm"].replace({"nan": pd.NA, "none": pd.NA, "null": pd.NA, "": pd.NA})
        first_seen = first_seen.dropna(subset=["player_id_norm", "first_seen_ts"])
        if not first_seen.empty:
            player_first_seen = first_seen.groupby("player_id_norm")["first_seen_ts"].min().sort_values()
            if not player_first_seen.empty:
                cum_counts = pd.Series(
                    np.arange(1, len(player_first_seen) + 1, dtype=int),
                    index=player_first_seen.values,
                )
                plt.figure(figsize=(10, 5))
                plt.step(cum_counts.index, cum_counts.values, where="post", color="#4e79a7")
                plt.scatter(cum_counts.index, cum_counts.values, s=10, color="#4e79a7", alpha=0.7)
                plt.title("Cumulative Unique Players Over Real Time")
                plt.xlabel("Real Time (UTC)")
                plt.ylabel("Total Unique Players")
                plt.grid(True, alpha=0.25)
                plt.tight_layout()
                plt.savefig(args.outdir / "cumulative_unique_players_over_time.png", dpi=120)
                plt.close()
                summary.append(f"cumulative_players_points: {int(cum_counts.shape[0])}")
                summary.append(f"cumulative_players_first_seen_utc: {player_first_seen.min().isoformat()}")
                summary.append(f"cumulative_players_last_seen_utc: {player_first_seen.max().isoformat()}")

    currently_playing = infer_currently_playing_players(sessions)
    currently_playing = currently_playing.reindex(player_highest_completed.index).fillna(False).astype(bool)
    settled_players = player_highest_completed[~currently_playing]
    player_levels_completed_count = pd.Series(dtype=float)
    if {"player_id_norm", "level_number", "passed"} <= set(attempts_with_player.columns):
        attempts_with_player["passed_flag"] = bool_series(attempts_with_player["passed"])
        completed_counts = (
            attempts_with_player[
                attempts_with_player["passed_flag"]
                & attempts_with_player["player_id_norm"].notna()
                & attempts_with_player["level_number"].notna()
            ]
            .groupby("player_id_norm")["level_number"]
            .nunique()
            .astype(float)
        )
        player_levels_completed_count = completed_counts
    if not player_highest_completed.empty:
        player_levels_completed_count = player_levels_completed_count.reindex(player_highest_completed.index).fillna(0.0)

    max_completed_level = int(player_highest_completed.max()) if not player_highest_completed.empty else 0
    level_index = pd.Index(range(1, max(1, max_completed_level) + 1), dtype=int)
    summary.append(f"players_currently_playing_inferred: {int(currently_playing.sum())}")
    summary.append(f"players_settled_for_quit_metrics: {int(settled_players.shape[0])}")

    # New retention by level: player-based and completion-based.
    if not player_highest_completed.empty:
        retention_levels = pd.Index(range(0, max(1, max_completed_level) + 1), dtype=int)
        retention_by_level_percent = pd.Series(
            {level: (player_highest_completed >= level).mean() * 100.0 for level in retention_levels},
            index=retention_levels,
        )
        save_line(
            retention_by_level_percent,
            args.outdir / "retention_percent_by_level.png",
            "Player Retention by Highest Level Completed",
            "Level",
            "Retention (%)",
            (0, 100),
        )
        summary.append("retention_by_level_percent_player_completed:")
        for level, rate in retention_by_level_percent.items():
            summary.append(f"  level_{int(level)}: {rate:.2f}")

    # Retention by number of levels completed (distinct passed levels per player).
    if not player_levels_completed_count.empty:
        max_completed_count = int(player_levels_completed_count.max()) if pd.notna(player_levels_completed_count.max()) else 0
        completed_count_index = pd.Index(range(0, max(1, max_completed_count) + 1), dtype=int)
        retention_by_completed_count_percent = pd.Series(
            {
                k: (player_levels_completed_count >= k).mean() * 100.0
                for k in completed_count_index
            },
            index=completed_count_index,
        )
        save_line(
            retention_by_completed_count_percent,
            args.outdir / "retention_percent_by_levels_completed_count.png",
            "Player Retention by Number of Levels Completed",
            "Levels Completed (count)",
            "Retention (%)",
            (0, 100),
        )
        summary.append("retention_by_levels_completed_count_percent_player:")
        summary.append(f"  max_levels_completed_count: {max_completed_count}")

    # New retention by time: player-based denominator.
    player_retention_seconds = build_player_retention_seconds(
        sessions,
        attempts_with_player,
        player_highest_completed.index if not player_highest_completed.empty else None,
    )
    player_active_playtime_seconds = build_player_active_playtime_seconds(
        sessions,
        player_highest_completed.index if not player_highest_completed.empty else None,
    )
    player_stats_like_round_seconds = build_player_stats_like_round_seconds(
        events,
        player_highest_completed.index if not player_highest_completed.empty else None,
    )
    time_played_outlier_player_ids = get_time_played_outlier_player_ids(player_retention_seconds)
    summary.append(f"time_played_outlier_threshold_minutes: {TIME_OUTLIER_THRESHOLD_MINUTES:.0f}")
    summary.append(f"time_played_outlier_players_count: {len(time_played_outlier_player_ids)}")
    summary.append(
        "time_played_outlier_player_ids: "
        + (", ".join(sorted(time_played_outlier_player_ids)) if time_played_outlier_player_ids else "none")
    )

    def save_time_retention_variants(
        seconds: pd.Series,
        base_name: str,
        title_root: str,
        xlabel: str,
    ) -> tuple[int, int]:
        if seconds.empty:
            return 0, 0

        retention_percent = retention_curve_time_minutes(seconds)
        save_line(
            retention_percent,
            args.outdir / f"{base_name}.png",
            title_root,
            xlabel,
            "Retention (%)",
            (0, 100),
        )
        save_line(
            retention_percent,
            args.outdir / f"{base_name}_first_30.png",
            f"{title_root} (First 30 Minutes)",
            xlabel,
            "Retention (%)",
            (0, 100),
            x_max=30,
        )

        filtered_seconds = filter_series_by_player_ids(seconds, time_played_outlier_player_ids)
        filtered_retention_percent = retention_curve_time_minutes(filtered_seconds)
        save_line(
            filtered_retention_percent,
            args.outdir / f"{base_name}_outliers_removed.png",
            f"{title_root} (Outliers Removed)",
            xlabel,
            "Retention (%)",
            (0, 100),
        )
        save_line(
            filtered_retention_percent,
            args.outdir / f"{base_name}_outliers_removed_first_30.png",
            f"{title_root} (Outliers Removed, First 30 Minutes)",
            xlabel,
            "Retention (%)",
            (0, 100),
            x_max=30,
        )
        max_minutes = int(retention_percent.index.max()) if not retention_percent.empty else 0
        filtered_max_minutes = int(filtered_retention_percent.index.max()) if not filtered_retention_percent.empty else 0
        return max_minutes, filtered_max_minutes

    if not player_retention_seconds.empty:
        max_minutes, filtered_max_minutes = save_time_retention_variants(
            player_retention_seconds,
            "retention_percent_by_time_played",
            "Player Retention by Time Played",
            "Time Played (minutes)",
        )
        summary.append("retention_by_time_played_percent_player:")
        summary.append(f"  max_minutes: {max_minutes}")
        summary.append(f"  max_minutes_outliers_removed: {filtered_max_minutes}")

    if not player_active_playtime_seconds.empty:
        max_active_minutes, filtered_max_active_minutes = save_time_retention_variants(
            player_active_playtime_seconds,
            "retention_percent_by_active_playtime",
            "Player Retention by Active Playtime",
            "Active Playtime (minutes)",
        )
        summary.append("retention_by_active_playtime_percent_player:")
        summary.append(f"  max_minutes: {max_active_minutes}")
        summary.append(f"  max_minutes_outliers_removed: {filtered_max_active_minutes}")

    if not player_stats_like_round_seconds.empty:
        max_stats_like_minutes, filtered_max_stats_like_minutes = save_time_retention_variants(
            player_stats_like_round_seconds,
            "retention_percent_by_stats_like_round_time_played",
            "Player Retention by Stats-Like Round Time",
            "Stats-Like Round Time (minutes)",
        )
        summary.append("retention_by_stats_like_round_time_percent_player:")
        summary.append(f"  max_minutes: {max_stats_like_minutes}")
        summary.append(f"  max_minutes_outliers_removed: {filtered_max_stats_like_minutes}")

    ab_variant_lookup = infer_experiment_variants_by_player(sessions, attempts_with_player)
    if not ab_variant_lookup.empty:
        ab_dir = args.outdir / "ab_variant_features"
        ab_dir.mkdir(parents=True, exist_ok=True)
        ab_variant_label_order = [label_experiment_variant(name) for name in ["A", "B"]]
        summary.append("ab_variant_labels:")
        for variant_name in ["A", "B"]:
            summary.append(f"  {variant_name}: {label_experiment_variant(variant_name)}")

        def save_ab_variant_time_outputs(
            cohort_frame: pd.DataFrame,
            seconds_col: str,
            cohort_basename: str,
            retention_basename: str,
            plot_basename: str,
            title_root: str,
            xlabel: str,
            summary_key: str,
        ) -> None:
            if cohort_frame.empty:
                return

            def save_variant(
                variant_frame: pd.DataFrame,
                filename_suffix: str = "",
                title_modifier: str = "",
            ) -> None:
                if variant_frame.empty:
                    return
                variant_frame = variant_frame.copy()
                variant_frame.reset_index().to_csv(
                    ab_dir / f"{cohort_basename}{filename_suffix}.csv",
                    index=False,
                )
                retention_rows: list[dict[str, Any]] = []
                max_variant_minutes = int(np.ceil(variant_frame[seconds_col].max() / 60.0)) if not variant_frame.empty else 0
                for variant_name, group_rows in variant_frame.groupby("ab_variant"):
                    seconds = pd.to_numeric(group_rows[seconds_col], errors="coerce").dropna().astype(float)
                    if seconds.empty:
                        continue
                    for minute in range(0, max(1, max_variant_minutes) + 1):
                        retention_rows.append(
                            {
                                "ab_variant": variant_name,
                                "ab_variant_label": label_experiment_variant(variant_name),
                                "minute": minute,
                                "percent": float((seconds >= (minute * 60.0)).mean() * 100.0),
                            }
                        )
                if retention_rows:
                    variant_retention_df = pd.DataFrame(retention_rows)
                    variant_retention_df.to_csv(
                        ab_dir / f"{retention_basename}{filename_suffix}.csv",
                        index=False,
                    )
                    variant_retention_plot = variant_retention_df.pivot(index="minute", columns="ab_variant_label", values="percent")
                    variant_retention_plot = variant_retention_plot.reindex(columns=ab_variant_label_order).dropna(axis=1, how="all")
                    plot_title = title_root
                    plot_first_30_title = f"{title_root} (First 30 Minutes)"
                    if title_modifier:
                        plot_title = f"{title_root} ({title_modifier})"
                        plot_first_30_title = f"{title_root} ({title_modifier}, First 30 Minutes)"
                    save_multi_line_percent(
                        variant_retention_plot,
                        ab_dir / f"{plot_basename}{filename_suffix}.png",
                        plot_title,
                        xlabel,
                        "Retention (%)",
                        (0, 100),
                    )
                    save_multi_line_percent(
                        variant_retention_plot,
                        ab_dir / f"{plot_basename}{filename_suffix}_first_30.png",
                        plot_first_30_title,
                        xlabel,
                        "Retention (%)",
                        (0, 100),
                        x_max=30,
                    )

            save_variant(cohort_frame)
            save_variant(
                filter_frame_by_player_ids(cohort_frame, time_played_outlier_player_ids),
                "_outliers_removed",
                "Outliers Removed",
            )
            summary.append(f"{summary_key}: {(ab_dir / f'{plot_basename}.png').name}")
            summary.append(f"{summary_key}_outliers_removed: {(ab_dir / f'{plot_basename}_outliers_removed.png').name}")

        if not player_retention_seconds.empty:
            variant_time = pd.DataFrame(index=player_retention_seconds.index.astype(str))
            variant_time.index.name = "player_id_norm"
            variant_time["retention_seconds"] = player_retention_seconds
            variant_time["ab_variant"] = variant_time.index.map(ab_variant_lookup)
            variant_time = variant_time[variant_time["ab_variant"].isin(["A", "B"])].copy()
            if not variant_time.empty:
                variant_time["ab_variant_label"] = variant_time["ab_variant"].map(label_experiment_variant)
                save_ab_variant_time_outputs(
                    variant_time,
                    "retention_seconds",
                    "ab_variant_time_played_cohorts",
                    "ab_variant_retention_by_time_played",
                    "ab_variant_retention_by_time_played",
                    "Retention by Time Played for A/B Variants",
                    "Time played (minutes threshold)",
                    "ab_variant_time_played_graph",
                )

        if not player_active_playtime_seconds.empty:
            variant_active = pd.DataFrame(index=player_active_playtime_seconds.index.astype(str))
            variant_active.index.name = "player_id_norm"
            variant_active["active_playtime_seconds"] = player_active_playtime_seconds
            variant_active["ab_variant"] = variant_active.index.map(ab_variant_lookup)
            variant_active = variant_active[variant_active["ab_variant"].isin(["A", "B"])].copy()
            if not variant_active.empty:
                variant_active["ab_variant_label"] = variant_active["ab_variant"].map(label_experiment_variant)
                save_ab_variant_time_outputs(
                    variant_active,
                    "active_playtime_seconds",
                    "ab_variant_active_playtime_cohorts",
                    "ab_variant_retention_by_active_playtime",
                    "ab_variant_retention_by_active_playtime",
                    "Retention by Active Playtime for A/B Variants",
                    "Active playtime (minutes threshold)",
                    "ab_variant_active_playtime_graph",
                )

        if not player_highest_completed.empty:
            variant_level = pd.DataFrame(index=player_highest_completed.index.astype(str))
            variant_level.index.name = "player_id_norm"
            variant_level["highest_level_completed"] = player_highest_completed.astype(float)
            variant_level["ab_variant"] = variant_level.index.map(ab_variant_lookup)
            variant_level = variant_level[variant_level["ab_variant"].isin(["A", "B"])].copy()
            if not variant_level.empty:
                variant_level["ab_variant_label"] = variant_level["ab_variant"].map(label_experiment_variant)
                variant_level.reset_index().to_csv(ab_dir / "ab_variant_highest_level_cohorts.csv", index=False)
                level_rows: list[dict[str, Any]] = []
                max_variant_level = int(variant_level["highest_level_completed"].max()) if not variant_level.empty else 0
                for variant_name, group_rows in variant_level.groupby("ab_variant"):
                    levels = pd.to_numeric(group_rows["highest_level_completed"], errors="coerce").dropna().astype(float)
                    if levels.empty:
                        continue
                    for level in range(0, max(1, max_variant_level) + 1):
                        level_rows.append(
                            {
                                "ab_variant": variant_name,
                                "ab_variant_label": label_experiment_variant(variant_name),
                                "level": level,
                                "percent": float((levels >= level).mean() * 100.0),
                            }
                        )
                if level_rows:
                    variant_level_df = pd.DataFrame(level_rows)
                    variant_level_df.to_csv(ab_dir / "ab_variant_retention_by_level.csv", index=False)
                    variant_level_plot = variant_level_df.pivot(index="level", columns="ab_variant_label", values="percent")
                    variant_level_plot = variant_level_plot.reindex(columns=ab_variant_label_order).dropna(axis=1, how="all")
                    save_multi_line_percent(
                        variant_level_plot,
                        ab_dir / "ab_variant_retention_by_level.png",
                        "Retention by Highest Level Completed for A/B Variants",
                        "Level",
                        "Retention (%)",
                        (0, 100),
                    )
                    summary.append(f"ab_variant_level_retention_graph: {(ab_dir / 'ab_variant_retention_by_level.png').name}")

    if not player_retention_seconds.empty:
        save_hist_minutes(player_retention_seconds, args.outdir / "session_duration_hist.png", "Total Time Played Per Unique Player")
        summary.append(f"unique_players_for_duration_hist: {int(player_retention_seconds.shape[0])}")
        summary.append(f"avg_player_time_played_minutes_zero_filled: {player_retention_seconds.mean() / 60.0:.2f}")
        nonzero_player_retention_seconds = player_retention_seconds[player_retention_seconds > 0]
        summary.append(f"avg_player_time_played_minutes_nonzero_only: {(nonzero_player_retention_seconds.mean() / 60.0) if not nonzero_player_retention_seconds.empty else 0.0:.2f}")
        summary.append(f"players_with_nonzero_time_played: {int(nonzero_player_retention_seconds.shape[0])}")

    if not player_active_playtime_seconds.empty:
        save_hist_minutes(
            player_active_playtime_seconds,
            args.outdir / "active_playtime_hist.png",
            "Total Active Playtime Per Unique Player",
        )
        summary.append(f"unique_players_for_active_playtime_hist: {int(player_active_playtime_seconds.shape[0])}")
        summary.append(f"avg_player_active_playtime_minutes_zero_filled: {player_active_playtime_seconds.mean() / 60.0:.2f}")
        nonzero_player_active_playtime_seconds = player_active_playtime_seconds[player_active_playtime_seconds > 0]
        summary.append(
            f"avg_player_active_playtime_minutes_nonzero_only: {(nonzero_player_active_playtime_seconds.mean() / 60.0) if not nonzero_player_active_playtime_seconds.empty else 0.0:.2f}"
        )
        summary.append(f"players_with_nonzero_active_playtime: {int(nonzero_player_active_playtime_seconds.shape[0])}")

    if not player_stats_like_round_seconds.empty:
        save_hist_minutes(
            player_stats_like_round_seconds,
            args.outdir / "stats_like_round_time_hist.png",
            "Total Stats-Like Round Time Per Unique Player",
        )
        summary.append(f"unique_players_for_stats_like_time_hist: {int(player_stats_like_round_seconds.shape[0])}")
        summary.append(f"avg_player_stats_like_round_time_minutes_zero_filled: {player_stats_like_round_seconds.mean() / 60.0:.2f}")
        nonzero_player_stats_like_round_seconds = player_stats_like_round_seconds[player_stats_like_round_seconds > 0]
        summary.append(
            f"avg_player_stats_like_round_time_minutes_nonzero_only: {(nonzero_player_stats_like_round_seconds.mean() / 60.0) if not nonzero_player_stats_like_round_seconds.empty else 0.0:.2f}"
        )
        summary.append(f"players_with_nonzero_stats_like_round_time: {int(nonzero_player_stats_like_round_seconds.shape[0])}")

    if not sessions.empty and "total_playtime_seconds" in sessions.columns:
        session_total_playtime_seconds = pd.to_numeric(sessions["total_playtime_seconds"], errors="coerce").dropna()
        if not session_total_playtime_seconds.empty:
            summary.append(f"avg_session_total_playtime_minutes: {session_total_playtime_seconds.mean() / 60.0:.2f}")
            summary.append(f"sessions_with_total_playtime: {int(session_total_playtime_seconds.shape[0])}")

    # Standardized completion chart: player % with highest completed >= level.
    if not player_highest_completed.empty and max_completed_level >= 1:
        comp = pd.Series(
            {level: (player_highest_completed >= level).mean() for level in level_index},
            index=level_index,
        )
        save_bar(comp * 100.0, args.outdir / "completion_by_level.png", "Players Completing Each Level", "Level", "Completion Rate (%)", (0, 100))
        summary.append("level_completion_rate_percent_player_completed:")
        for level, rate in comp.items():
            summary.append(f"  level_{int(level)}: {rate * 100.0:.2f}")

    if not player_highest_completed.empty:
        max_level = int(player_highest_completed.max()) if pd.notna(player_highest_completed.max()) else 10
        save_hist_values(
            player_highest_completed,
            args.outdir / "highest_level_reached_hist.png",
            "Highest Level Completed Per Unique Player",
            "Highest Level Completed",
            bins=max(10, max_level + 1),
        )
        summary.append(f"unique_players_for_level_hist: {int(player_highest_completed.shape[0])}")
    if not player_levels_completed_count.empty:
        max_count = int(player_levels_completed_count.max()) if pd.notna(player_levels_completed_count.max()) else 10
        save_hist_values(
            player_levels_completed_count,
            args.outdir / "levels_completed_count_hist.png",
            "Number of Levels Completed Per Unique Player",
            "Levels Completed (count)",
            bins=max(10, max_count + 1),
        )
        summary.append(f"unique_players_for_levels_completed_count_hist: {int(player_levels_completed_count.shape[0])}")

    # Standardized quit distribution:
    # For settled players, not reaching L+1 is treated as quitting at L+1.
    if not settled_players.empty:
        quit_level_by_player = (settled_players + 1.0).astype(int)
        quit_counts = quit_level_by_player.value_counts().sort_index()
        save_bar(
            quit_counts,
            args.outdir / "quit_level_bar.png",
            "Quit Level by Player (Derived from Highest Completed)",
            "Level Quit On",
            "Player Count",
        )

        if {"player_id_norm", "level_number", "passed"} <= set(attempts_with_player.columns):
            attempts_with_player["passed_flag"] = bool_series(attempts_with_player["passed"])
            qdf = pd.DataFrame({
                "player_id_norm": quit_level_by_player.index.astype(str),
                "quit_level": quit_level_by_player.values.astype(int),
            })
            qdf["previous_level"] = qdf["quit_level"] - 1
            qdf = qdf[qdf["previous_level"] >= 1].copy()
            if not qdf.empty:
                quit_prev_levels = sorted(qdf["previous_level"].astype(int).unique().tolist())
                # Event-based quit outcome:
                # At each quit event (per session), was the last attempt before quit a success or failure?
                quit_outcomes = pd.DataFrame()
                if not events.empty and "event_type" in events.columns and not attempts.empty:
                    e_quit = add_session_key(events.copy())
                    e_quit["event_type_norm"] = e_quit["event_type"].astype(str).str.strip().str.lower()
                    quit_event_types = {"quit_reason", "quit_inferred_inactivity", "before_unload"}
                    e_quit = e_quit[e_quit["event_type_norm"].isin(quit_event_types)].copy()
                    e_quit["quit_time"] = pd.to_numeric(e_quit.get("client_timestamp_ms"), errors="coerce")
                    fallback_ts = pd.to_datetime(e_quit.get("event_timestamp"), utc=True, errors="coerce")
                    fallback_ms = (fallback_ts.astype("int64") / 1_000_000).where(fallback_ts.notna(), np.nan)
                    e_quit["quit_time"] = e_quit["quit_time"].fillna(fallback_ms)
                    e_quit = e_quit.dropna(subset=["session_key", "quit_time"])
                    if not e_quit.empty:
                        quit_latest = (
                            e_quit.sort_values("quit_time")
                            .groupby("session_key", as_index=False)
                            .tail(1)[["session_key", "quit_time"]]
                        )
                        a_quit = add_session_key(attempts.copy())
                        if "passed_flag" not in a_quit.columns:
                            a_quit["passed_flag"] = bool_series(a_quit["passed"]) if "passed" in a_quit.columns else False
                        a_quit["attempt_time"] = pd.to_datetime(a_quit.get("created_at"), utc=True, errors="coerce")
                        a_quit["attempt_time_ms"] = (a_quit["attempt_time"].astype("int64") / 1_000_000).where(a_quit["attempt_time"].notna(), np.nan)
                        rows: list[dict[str, Any]] = []
                        for _, qr in quit_latest.iterrows():
                            sk = qr["session_key"]
                            qt = float(qr["quit_time"])
                            aa = a_quit[a_quit["session_key"] == sk].copy()
                            if aa.empty:
                                continue
                            aa_valid = aa.dropna(subset=["attempt_time_ms"]).sort_values("attempt_time_ms")
                            if not aa_valid.empty:
                                aa_valid = aa_valid[aa_valid["attempt_time_ms"] <= qt]
                            if aa_valid.empty:
                                # If attempt timestamps are missing/no match, use last attempt in session as fallback.
                                aa_valid = aa.sort_index()
                            if aa_valid.empty:
                                continue
                            last_attempt = aa_valid.iloc[-1]
                            rows.append(
                                {
                                    "session_key": sk,
                                    "last_attempt_passed": bool(last_attempt.get("passed_flag", False)),
                                }
                            )
                        quit_outcomes = pd.DataFrame(rows)

                if not quit_outcomes.empty:
                    pass_pct = float(quit_outcomes["last_attempt_passed"].mean() * 100.0)
                    fail_pct = 100.0 - pass_pct
                    plt.figure(figsize=(7, 5))
                    plt.bar(
                        ["Last Attempt Succeeded", "Last Attempt Failed"],
                        [pass_pct, fail_pct],
                        color=["#1f77b4", "#1f77b4"],
                    )
                    plt.title("Last Attempt Outcome at Quit Event")
                    plt.xlabel("Outcome")
                    plt.ylabel("Percent of Quits (%)")
                    plt.ylim(0, 100)
                    plt.tight_layout()
                    plt.savefig(args.outdir / "previous_level_pass_rate_when_quit.png", dpi=120)
                    plt.close()
                    summary.append(f"quit_events_with_last_attempt: {int(quit_outcomes.shape[0])}")
                    summary.append(f"quit_events_last_attempt_failed_percent: {fail_pct:.2f}")
                else:
                    summary.append("quit_events_with_last_attempt: 0")

                # Use the exact same quit rows and level index for previous-level time.
                attempts_with_player["time_seconds"] = pd.to_numeric(attempts_with_player.get("time_seconds"), errors="coerce")
                player_level_pass = (
                    attempts_with_player[
                        attempts_with_player["player_id_norm"].notna() & attempts_with_player["level_number"].notna()
                    ]
                    .groupby(["player_id_norm", "level_number"])["passed_flag"]
                    .max()
                )
                qdf["prev_pass"] = [
                    bool(player_level_pass.get((pid, float(prev)), False))
                    or bool(player_level_pass.get((pid, int(prev)), False))
                    for pid, prev in zip(qdf["player_id_norm"], qdf["previous_level"])
                ]
                player_level_passed_time = (
                    attempts_with_player[
                        attempts_with_player["passed_flag"]
                        & attempts_with_player["player_id_norm"].notna()
                        & attempts_with_player["level_number"].notna()
                        & attempts_with_player["time_seconds"].notna()
                    ]
                    .groupby(["player_id_norm", "level_number"])["time_seconds"]
                    .mean()
                )
                qdf["prev_level_time_seconds"] = [
                    float(player_level_passed_time.get((pid, float(prev)), np.nan))
                    if pd.notna(player_level_passed_time.get((pid, float(prev)), np.nan))
                    else float(player_level_passed_time.get((pid, int(prev)), 0.0))
                    for pid, prev in zip(qdf["player_id_norm"], qdf["previous_level"])
                ]
                pt = qdf.groupby("previous_level")["prev_level_time_seconds"].mean().sort_index().reindex(quit_prev_levels, fill_value=0.0)
                save_bar(
                    pt,
                    args.outdir / "previous_level_time_before_quit.png",
                    "Previous-Level Completion Time When Players Quit",
                    "Previous Level",
                    "Average Time (seconds)",
                )

    if {"player_id_norm", "level_number", "time_seconds", "passed"} <= set(attempts_with_player.columns) and not player_highest_completed.empty and max_completed_level >= 1:
        attempts_with_player["passed_flag"] = bool_series(attempts_with_player["passed"])
        a_time = attempts_with_player[
            attempts_with_player["passed_flag"]
            & attempts_with_player["player_id_norm"].notna()
            & attempts_with_player["level_number"].notna()
            & attempts_with_player["time_seconds"].notna()
        ].copy()
        avg_time_rows: dict[int, float] = {}
        if not a_time.empty:
            # Player-based average completion time per level:
            # First average each player's passed attempts at the level, then average across players.
            player_level_mean_time = a_time.groupby(["player_id_norm", "level_number"])["time_seconds"].mean()
            for level in level_index:
                eligible = player_highest_completed[player_highest_completed >= level].index
                if len(eligible) == 0:
                    continue
                vals = (
                    player_level_mean_time.xs(level, level="level_number", drop_level=True)
                    if level in player_level_mean_time.index.get_level_values("level_number")
                    else pd.Series(dtype=float)
                )
                vals = vals.reindex(eligible).dropna()
                if vals.empty:
                    continue
                avg_time_rows[int(level)] = float(vals.mean())
        if avg_time_rows:
            save_bar(
                pd.Series(avg_time_rows),
                args.outdir / "avg_time_per_level.png",
                "Average Completion Attempt Time Per Level (Players)",
                "Level",
                "Average Time (seconds)",
            )

    if {"player_id_norm", "level_number", "stars", "passed"} <= set(attempts_with_player.columns) and not player_highest_completed.empty and max_completed_level >= 1:
        attempts_with_player["passed_flag"] = bool_series(attempts_with_player["passed"])
        a_stars = attempts_with_player[
            attempts_with_player["passed_flag"] & attempts_with_player["player_id_norm"].notna() & attempts_with_player["level_number"].notna()
        ].dropna(subset=["stars"]).copy()
        if not a_stars.empty:
            player_level_best_stars = a_stars.groupby(["player_id_norm", "level_number"])["stars"].max()
            avg_rows: dict[int, float] = {}
            max_rows: dict[int, float] = {}
            for level in level_index:
                eligible = player_highest_completed[player_highest_completed >= level].index
                if len(eligible) == 0:
                    continue
                vals = player_level_best_stars.xs(level, level="level_number", drop_level=True) if level in player_level_best_stars.index.get_level_values("level_number") else pd.Series(dtype=float)
                vals = vals.reindex(eligible).fillna(0.0)
                avg_rows[int(level)] = float(vals.mean())
                max_rows[int(level)] = float(vals.max())
            if avg_rows:
                save_bar(pd.Series(avg_rows), args.outdir / "avg_stars_per_level.png", "Average Stars Per Completed Level (Players)", "Level", "Average Stars")
            if max_rows:
                save_bar(pd.Series(max_rows), args.outdir / "max_stars_per_level.png", "Max Stars Per Completed Level (Players)", "Level", "Max Stars")

    if {"player_id_norm", "level_number", "passed"} <= set(attempts_with_player.columns) and not player_highest_completed.empty and max_completed_level >= 1:
        attempts_with_player["passed_flag"] = bool_series(attempts_with_player["passed"])
        a_retry = attempts_with_player.dropna(subset=["player_id_norm", "level_number"]).copy()
        a_retry = sort_attempts_for_sequence(a_retry)
        g_retry = a_retry.groupby(["player_id_norm", "level_number"])["passed_flag"].apply(retries_before_after_first_pass)
        g_retry_df = g_retry.apply(pd.Series)
        g_retry_df.columns = ["before_completion", "after_completion"]
        retries_before_rows: dict[int, float] = {}
        retries_after_rows: dict[int, float] = {}
        for level in level_index:
            eligible = player_highest_completed[player_highest_completed >= level].index
            if len(eligible) == 0:
                continue
            if level in g_retry_df.index.get_level_values("level_number"):
                vals_df = g_retry_df.xs(level, level="level_number", drop_level=True)
            else:
                vals_df = pd.DataFrame(index=pd.Index([], dtype=object), columns=["before_completion", "after_completion"])
            vals_df = vals_df.reindex(eligible).fillna(0.0)
            retries_before_rows[int(level)] = float(vals_df["before_completion"].mean())
            retries_after_rows[int(level)] = float(vals_df["after_completion"].mean())
        if retries_before_rows:
            plot_df = pd.DataFrame(
                {
                    "Before Completion": pd.Series(retries_before_rows),
                    "After Completion": pd.Series(retries_after_rows),
                }
            )
            ax = plot_df.plot(kind="bar", figsize=(10, 5), color=["#1f77b4", "#ff7f0e"])
            ax.set_title("Average Retries Per Level (Before vs After Completion)")
            ax.set_xlabel("Level")
            ax.set_ylabel("Average Retries")
            plt.tight_layout()
            plt.savefig(args.outdir / "retries_by_level_completed_split.png", dpi=120)
            plt.close()

    # Round-time histograms per level (successful rounds only).
    if "rounds" in attempts.columns and "level_number" in attempts.columns:
        rows: list[dict[str, float]] = []
        for _, row in attempts.iterrows():
            lvl = pd.to_numeric(row.get("level_number"), errors="coerce")
            rounds = row.get("rounds")
            if not np.isfinite(lvl) or not isinstance(rounds, list):
                continue
            for rr in rounds:
                if not isinstance(rr, dict):
                    continue
                passed_round = str(rr.get("passed")).strip().lower() in TRUE_VALUES
                if not passed_round:
                    continue
                ts = pd.to_numeric(rr.get("time_spent"), errors="coerce")
                if np.isfinite(ts):
                    rows.append({"level_number": int(lvl), "time_spent": float(ts)})

        rt = pd.DataFrame(rows)
        if not rt.empty:
            per_level_dir = args.outdir / "round_time_per_level"
            per_level_dir.mkdir(parents=True, exist_ok=True)
            for lvl in sorted(rt["level_number"].unique().tolist()):
                vals = rt[rt["level_number"] == lvl]["time_spent"].dropna()
                if vals.empty:
                    continue
                plt.figure(figsize=(8, 5))
                vals.hist(bins=14)
                plt.title(f"Round Time Distribution (Successful Rounds) - Level {lvl}")
                plt.xlabel("Round Time (seconds)")
                plt.ylabel("Count")
                plt.tight_layout()
                plt.savefig(per_level_dir / f"level_{int(lvl):02d}_round_time_hist.png", dpi=120)
                plt.close()
            summary.append(f"round_time_per_level_graphs_success_only: {int(rt['level_number'].nunique())}")

    # Early-level correlation features (player-level).
    # Requested feature set excludes retries and total_time for L1-L3.
    if (
        {"player_id_norm", "level_number", "passed"} <= set(attempts_with_player.columns)
        and not player_retention_seconds.empty
    ):
        corr_dir = args.outdir / "early_round_correlations"
        corr_dir.mkdir(parents=True, exist_ok=True)

        attempts_with_player["passed_flag"] = bool_series(attempts_with_player["passed"])
        attempts_with_player["time_seconds"] = pd.to_numeric(attempts_with_player.get("time_seconds"), errors="coerce")
        a_early = attempts_with_player.dropna(subset=["player_id_norm", "level_number"]).copy()
        a_early = sort_attempts_for_sequence(a_early)
        g_early = a_early.groupby(["player_id_norm", "level_number"]).agg(
            attempts_before_first_completion=("passed_flag", attempts_before_first_pass),
            failed_first_attempt=("passed_flag", lambda x: (len(x) > 0) and (not bool(x.iloc[0]))),
            first_attempt_succeeded=("passed_flag", lambda x: bool(x.iloc[0]) if len(x) > 0 else np.nan),
            first_attempt_time=("time_seconds", "first"),
        ).reset_index()

        feat = pd.DataFrame(index=player_retention_seconds.index.astype(str))
        feat.index.name = "player_id_norm"
        feat["retention_seconds"] = player_retention_seconds.reindex(feat.index).fillna(0.0).astype(float)

        for lvl in [1, 2, 3]:
            li = g_early[g_early["level_number"] == lvl].rename(
                columns={
                    "attempts_before_first_completion": f"l{lvl}_attempts_before_first_completion",
                    "failed_first_attempt": f"l{lvl}_failed_first_attempt",
                    "first_attempt_succeeded": f"l{lvl}_first_attempt_succeeded",
                    "first_attempt_time": f"l{lvl}_first_attempt_time",
                }
            ).set_index("player_id_norm")

            for col in [
                f"l{lvl}_attempts_before_first_completion",
                f"l{lvl}_failed_first_attempt",
                f"l{lvl}_first_attempt_succeeded",
                f"l{lvl}_first_attempt_time",
            ]:
                if col in li.columns:
                    feat[col] = li[col].reindex(feat.index)
            # Preserve NaN for first-attempt outcome fields so they represent "did not attempt".
            for bcol in [f"l{lvl}_failed_first_attempt", f"l{lvl}_first_attempt_succeeded"]:
                if bcol in feat.columns:
                    feat[bcol] = feat[bcol].map(
                        lambda v: True if str(v).strip().lower() == "true" else (False if str(v).strip().lower() == "false" else np.nan)
                    )
            # Missing counts are zero attempts before first completion.
            acol = f"l{lvl}_attempts_before_first_completion"
            if acol in feat.columns:
                feat[acol] = pd.to_numeric(feat[acol], errors="coerce").fillna(0.0)

        feat.reset_index().to_csv(corr_dir / "early_retention_features.csv", index=False)

        def save_two_group_retention_curve(
            group_a_seconds: pd.Series,
            group_b_seconds: pd.Series,
            label_a: str,
            label_b: str,
            title: str,
            filename: str,
        ) -> None:
            if group_a_seconds.empty or group_b_seconds.empty:
                return
            max_minutes = int(np.ceil(max(group_a_seconds.max(), group_b_seconds.max()) / 60.0))
            minute_idx = pd.Index(range(0, max(1, max_minutes) + 1), dtype=int)
            curve_a = pd.Series(
                {m: (group_a_seconds >= (m * 60.0)).mean() * 100.0 for m in minute_idx},
                index=minute_idx,
            )
            curve_b = pd.Series(
                {m: (group_b_seconds >= (m * 60.0)).mean() * 100.0 for m in minute_idx},
                index=minute_idx,
            )
            plt.figure(figsize=(10, 5))
            plt.plot(curve_a.index, curve_a.values, marker="o", color="#e15759", label=label_a)
            plt.plot(curve_b.index, curve_b.values, marker="o", color="#4e79a7", label=label_b)
            plt.ylim(0, 100)
            plt.xlabel("Gameplay time (minutes threshold)")
            plt.ylabel("Retention (%)")
            plt.title(title)
            plt.legend()
            plt.grid(True, alpha=0.25)
            plt.tight_layout()
            plt.savefig(corr_dir / filename, dpi=120)
            plt.close()

        # Baseline cohort comparison requested previously:
        # Group A: failed level 1 on first try
        # Group B: passed level 1 on first try
        if "l1_failed_first_attempt" in feat.columns and "l1_first_attempt_succeeded" in feat.columns:
            failed_l1_first_try = feat["l1_failed_first_attempt"] == True
            passed_l1_first_try = feat["l1_first_attempt_succeeded"] == True
            grp_failed = feat.loc[failed_l1_first_try, "retention_seconds"].dropna().astype(float)
            grp_passed = feat.loc[passed_l1_first_try, "retention_seconds"].dropna().astype(float)

            summary.append(f"cohort_l1_failed_first_try_players: {int(grp_failed.shape[0])}")
            summary.append(f"cohort_l1_passed_first_try_players: {int(grp_passed.shape[0])}")

            save_two_group_retention_curve(
                grp_failed,
                grp_passed,
                "Failed L1 first try",
                "Passed L1 first try",
                "Retention by Time: L1 First-Try Outcome Cohorts",
                "l1_first_try_retention_by_time_comparison.png",
            )

        # Generate cohort retention-by-time comparisons for all early-correlation features.
        # For numeric factors (attempt counts/time), use explicit cutoffs and include them in titles.
        feature_curve_dir = corr_dir / "feature_group_retention_curves"
        feature_curve_dir.mkdir(parents=True, exist_ok=True)
        generated_feature_curves = 0
        for col in feat.columns:
            if col == "retention_seconds":
                continue
            s_raw = feat[col]
            s_num = pd.to_numeric(s_raw, errors="coerce")
            if s_raw.dropna().empty:
                continue

            valid_bool_like = s_raw.dropna().map(
                lambda v: str(v).strip().lower() in {"true", "false", "1", "0", "yes", "no", "y", "n", "t", "f"}
            )
            is_bool_like = (len(valid_bool_like) > 0) and bool(valid_bool_like.all())

            group_a_mask: pd.Series | None = None
            group_b_mask: pd.Series | None = None
            label_a = ""
            label_b = ""
            title = ""

            if is_bool_like:
                b = s_raw.map(
                    lambda v: True if str(v).strip().lower() in {"true", "1", "yes", "y", "t"} else (
                        False if str(v).strip().lower() in {"false", "0", "no", "n", "f"} else np.nan
                    )
                )
                group_a_mask = b == True
                group_b_mask = b == False
                label_a = f"{col}=true"
                label_b = f"{col}=false"
                title = f"Retention by Time: {col} (true vs false)"
            elif s_num.notna().sum() >= 8:
                if col.endswith("_attempts_before_first_completion"):
                    cutoff = 1.0
                    threshold_text = ">= 1"
                elif col.endswith("_first_attempt_time"):
                    cutoff = float(np.nanmedian(s_num.to_numpy(dtype=float)))
                    threshold_text = f">= {cutoff:.1f}s"
                else:
                    cutoff = float(np.nanmedian(s_num.to_numpy(dtype=float)))
                    threshold_text = f">= {cutoff:.2f}"

                if not np.isfinite(cutoff):
                    continue
                group_a_mask = s_num >= cutoff
                group_b_mask = s_num < cutoff
                label_a = f"{col} {threshold_text}"
                label_b = f"{col} < {threshold_text.replace('>= ', '')}"
                title = f"Retention by Time: {col} cutoff {threshold_text}"
            else:
                continue

            grp_a = feat.loc[group_a_mask.fillna(False), "retention_seconds"].dropna().astype(float)
            grp_b = feat.loc[group_b_mask.fillna(False), "retention_seconds"].dropna().astype(float)
            if grp_a.empty or grp_b.empty:
                continue

            filename_safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", col)
            save_two_group_retention_curve(
                grp_a,
                grp_b,
                f"{label_a} (n={len(grp_a)})",
                f"{label_b} (n={len(grp_b)})",
                title,
                f"feature_group_retention_curves/{filename_safe}_retention_by_time.png",
            )
            generated_feature_curves += 1

        summary.append(f"early_feature_group_retention_curves_generated: {generated_feature_curves}")

        corr_rows = []
        f2 = feat.copy()
        for i, c in enumerate(f2.columns):
            if c == "retention_seconds":
                continue
            raw = f2[c]
            # First, try numeric coercion (handles numeric-looking object columns).
            series_num = pd.to_numeric(raw, errors="coerce")
            if series_num.notna().sum() >= max(1, int(0.5 * raw.notna().sum())):
                series = series_num
            else:
                # Fallback for bool-like/object features (e.g., failed_first_attempt).
                series = raw.map(
                    lambda v: (
                        1 if str(v).strip().lower() in {"true", "1", "yes", "y", "t"} else
                        0 if str(v).strip().lower() in {"false", "0", "no", "n", "f"} else
                        np.nan
                    )
                )
            d = pd.DataFrame({"x": series, "retention_seconds": f2["retention_seconds"]})
            m = re.match(r"^l([123])_", str(c))
            if m:
                lvl = int(m.group(1))
                d = d[level_attempt_mask(f2, lvl)]
            d = d.dropna()
            if len(d) >= 5:
                r, ci_low, ci_high = pearson_with_bootstrap_ci(
                    d["x"], d["retention_seconds"], n_boot=1000, ci=0.95, seed=42 + i
                )
                corr_rows.append(
                    {
                        "feature": c,
                        "pearson_corr_with_retention": r,
                        "pearson_ci_low_95": ci_low,
                        "pearson_ci_high_95": ci_high,
                        "n": len(d),
                    }
                )

        if corr_rows:
            cdf = pd.DataFrame(corr_rows).sort_values(
                "pearson_corr_with_retention",
                key=lambda s: s.abs(),
                ascending=False,
            )
            cdf.to_csv(corr_dir / "early_feature_correlations.csv", index=False)
            plt.figure(figsize=(10, 6))
            plot_cdf = cdf[~cdf["feature"].astype(str).str.endswith("_completed")].copy()
            top_df = plot_cdf.head(12).set_index("feature")[
                ["pearson_corr_with_retention", "pearson_ci_low_95", "pearson_ci_high_95"]
            ].sort_values("pearson_corr_with_retention")
            vals = top_df["pearson_corr_with_retention"]
            err_left = (vals - top_df["pearson_ci_low_95"]).clip(lower=0).fillna(0.0)
            err_right = (top_df["pearson_ci_high_95"] - vals).clip(lower=0).fillna(0.0)
            xerr = np.vstack([err_left.to_numpy(), err_right.to_numpy()])
            plt.barh(vals.index, vals.to_numpy(), xerr=xerr, color="#4C72B0", ecolor="#333333", capsize=3)
            plt.title("Feature vs Retention Correlation")
            plt.xlabel("Correlation (r)")
            plt.ylabel("Feature")
            plt.tight_layout()
            plt.savefig(corr_dir / "top_early_feature_correlations_bar.png", dpi=120)
            plt.close()

            # Secondary chart: same features, with retention outliers removed.
            # Outliers-removed view: explicitly exclude the known high-retention outlier player.
            excluded_outlier_player_id = "21f368e9-852a-47d9-9df1-bf1ee65d6992"
            feat_trim = feat[feat.index.astype(str) != excluded_outlier_player_id].copy()
            summary.append(f"early_corr_outlier_excluded_player_id: {excluded_outlier_player_id}")
            summary.append(f"early_corr_rows_removed_as_outliers: {int(max(0, len(feat) - len(feat_trim)))}")

            corr_rows_trim = []
            for i, c in enumerate(feat_trim.columns):
                if c == "retention_seconds":
                    continue
                raw_t = feat_trim[c]
                series_num_t = pd.to_numeric(raw_t, errors="coerce")
                if series_num_t.notna().sum() >= max(1, int(0.5 * raw_t.notna().sum())):
                    series_t = series_num_t
                else:
                    series_t = raw_t.map(
                        lambda v: (
                            1 if str(v).strip().lower() in {"true", "1", "yes", "y", "t"} else
                            0 if str(v).strip().lower() in {"false", "0", "no", "n", "f"} else
                            np.nan
                        )
                    )
                d_t = pd.DataFrame({"x": series_t, "retention_seconds": feat_trim["retention_seconds"]})
                m_t = re.match(r"^l([123])_", str(c))
                if m_t:
                    lvl_t = int(m_t.group(1))
                    d_t = d_t[level_attempt_mask(feat_trim, lvl_t)]
                d_t = d_t.dropna()
                if len(d_t) >= 5:
                    r_t, ci_low_t, ci_high_t = pearson_with_bootstrap_ci(
                        d_t["x"], d_t["retention_seconds"], n_boot=1000, ci=0.95, seed=1042 + i
                    )
                    corr_rows_trim.append(
                        {
                            "feature": c,
                            "pearson_corr_with_retention": r_t,
                            "pearson_ci_low_95": ci_low_t,
                            "pearson_ci_high_95": ci_high_t,
                            "n": len(d_t),
                        }
                    )

            if corr_rows_trim:
                cdf_trim = pd.DataFrame(corr_rows_trim).sort_values(
                    "pearson_corr_with_retention",
                    key=lambda s: s.abs(),
                    ascending=False,
                )
                cdf_trim.to_csv(corr_dir / "early_feature_correlations_outliers_removed.csv", index=False)
                plt.figure(figsize=(10, 6))
                plot_cdf_trim = cdf_trim[~cdf_trim["feature"].astype(str).str.endswith("_completed")].copy()
                top_df_trim = plot_cdf_trim.head(12).set_index("feature")[
                    ["pearson_corr_with_retention", "pearson_ci_low_95", "pearson_ci_high_95"]
                ].sort_values("pearson_corr_with_retention")
                vals_t = top_df_trim["pearson_corr_with_retention"]
                err_left_t = (vals_t - top_df_trim["pearson_ci_low_95"]).clip(lower=0).fillna(0.0)
                err_right_t = (top_df_trim["pearson_ci_high_95"] - vals_t).clip(lower=0).fillna(0.0)
                xerr_t = np.vstack([err_left_t.to_numpy(), err_right_t.to_numpy()])
                plt.barh(vals_t.index, vals_t.to_numpy(), xerr=xerr_t, color="#4C72B0", ecolor="#333333", capsize=3)
                plt.title("Feature vs Retention Correlation (Outliers Removed)")
                plt.xlabel("Correlation (r)")
                plt.ylabel("Feature")
                plt.tight_layout()
                plt.savefig(corr_dir / "top_early_feature_correlations_bar_outliers_removed.png", dpi=120)
                plt.close()

    if "cards_failed" in attempts.columns:
        fr = []
        raw_unknown_count = 0
        inferred_from_unknown_count = 0
        for _, row in attempts.iterrows():
            lvl = pd.to_numeric(row.get("level_number"), errors="coerce")
            for c in row.get("cards_failed") or []:
                if isinstance(c, dict):
                    raw = str(c.get("card_type") or "").strip().lower()
                    if not raw or raw == "unknown":
                        raw_unknown_count += 1
                    inferred = infer_card_type_from_failed(c)
                    if (not raw or raw == "unknown") and inferred != "unknown":
                        inferred_from_unknown_count += 1
                    fr.append({
                        "level_number": int(lvl) if np.isfinite(lvl) else np.nan,
                        "card_type": inferred,
                    })
        fc = pd.DataFrame(fr)
        if not fc.empty:
            by = fc["card_type"].value_counts()
            plt.figure(figsize=(7, 7))
            by.plot(kind="pie", autopct="%1.1f%%")
            plt.title("Failed Cards by Card Type")
            plt.ylabel("")
            plt.tight_layout()
            plt.savefig(args.outdir / "failed_cards_type_pie.png", dpi=120)
            plt.close()
            fc.groupby(["level_number", "card_type"]).size().reset_index(name="count").to_csv(args.outdir / "failed_cards_by_level_type.csv", index=False)
            summary.append(f"failed_cards_raw_unknown_count: {raw_unknown_count}")
            summary.append(f"failed_cards_unknown_recovered_by_inference: {inferred_from_unknown_count}")

    sandbox_modes = {"sandbox", "practice"}
    sandbox_player_ids: set[str] = set()
    total_player_ids: set[str] = set()
    sandbox_time_seconds = 0.0
    sandbox_dir = args.outdir / "sandbox_statistics"
    sandbox_dir.mkdir(parents=True, exist_ok=True)
    # Prevent stale sandbox charts from prior runs from persisting in output.
    for stale_name in [
        "sandbox_participation_unique_players.png",
        "sandbox_avg_playtime_per_player.png",
        "sandbox_playtime_per_player_hist.png",
        "sandbox_top20_players_by_playtime.png",
    ]:
        stale_path = sandbox_dir / stale_name
        if stale_path.exists():
            stale_path.unlink()
    sandbox_time_by_player: dict[str, float] = {}
    if not player_highest_completed.empty:
        total_player_ids = set(player_highest_completed.index.astype(str).tolist())
    if not attempts_with_player.empty and {"player_id_norm"} <= set(attempts_with_player.columns):
        a_sb = attempts_with_player.copy()
        a_sb["time_seconds"] = pd.to_numeric(a_sb.get("time_seconds"), errors="coerce")

        # 1) Round-level sandbox/practice timing (preferred when available).
        for _, row in a_sb.iterrows():
            pid = row.get("player_id_norm")
            if pd.isna(pid):
                continue
            rounds = row.get("rounds")
            if not isinstance(rounds, list):
                continue
            round_secs = 0.0
            for rr in rounds:
                if not isinstance(rr, dict):
                    continue
                rr_mode = str(rr.get("mode") or "").strip().lower()
                if rr_mode not in sandbox_modes:
                    continue
                ts = pd.to_numeric(rr.get("time_spent"), errors="coerce")
                if np.isfinite(ts):
                    round_secs += float(ts)
            if round_secs > 0:
                pid_str = str(pid)
                sandbox_player_ids.add(pid_str)
                sandbox_time_by_player[pid_str] = sandbox_time_by_player.get(pid_str, 0.0) + round_secs

        # 2) Attempt-level fallback where the attempt itself is sandbox/practice
        # and round-level sandbox time is not present.
        if "mode" in a_sb.columns:
            for _, row in a_sb.iterrows():
                pid = row.get("player_id_norm")
                if pd.isna(pid):
                    continue
                mode = str(row.get("mode") or "").strip().lower()
                if mode not in sandbox_modes:
                    continue
                pid_str = str(pid)
                sandbox_player_ids.add(pid_str)
                rounds = row.get("rounds")
                has_sandbox_round = False
                if isinstance(rounds, list):
                    for rr in rounds:
                        if isinstance(rr, dict) and str(rr.get("mode") or "").strip().lower() in sandbox_modes:
                            has_sandbox_round = True
                            break
                if has_sandbox_round:
                    continue
                ts = row.get("time_seconds")
                if np.isfinite(ts):
                    sandbox_time_by_player[pid_str] = sandbox_time_by_player.get(pid_str, 0.0) + float(ts)

    # Events still contribute sandbox participation even when attempts are missing.
    if not events.empty and "mode" in events.columns:
        e_player_col = pick_player_column(events)
        if e_player_col is not None:
            e_sb_players = (
                events[events["mode"].astype(str).str.lower().isin(sandbox_modes)][e_player_col]
                .dropna()
                .astype(str)
                .tolist()
            )
            sandbox_player_ids.update(e_sb_players)

    sandbox_time_seconds = float(sum(sandbox_time_by_player.values())) if sandbox_time_by_player else 0.0
    if total_player_ids:
        sandbox_percent = (len(sandbox_player_ids) / len(total_player_ids)) * 100.0
        summary.append(f"sandbox_players_percent: {sandbox_percent:.2f}")
        summary.append(f"sandbox_players_count: {len(sandbox_player_ids)}")
        non_sandbox = max(0, len(total_player_ids) - len(sandbox_player_ids))
        plt.figure(figsize=(6, 5))
        plt.bar(["Played Sandbox", "Did Not Play Sandbox"], [len(sandbox_player_ids), non_sandbox])
        plt.title("Sandbox Participation by Unique Players")
        plt.ylabel("Unique Player Count")
        plt.tight_layout()
        plt.savefig(sandbox_dir / "sandbox_participation_unique_players.png", dpi=120)
        plt.close()
    else:
        summary.append("sandbox_players_percent: n/a")
    if sandbox_time_seconds > 0:
        summary.append(f"sandbox_time_seconds_observed: {sandbox_time_seconds:.2f}")
        if sandbox_time_by_player:
            player_time_series = pd.Series(sandbox_time_by_player)
            avg_minutes = float(player_time_series.mean() / 60.0)
            summary.append(f"sandbox_avg_playtime_minutes_per_player: {avg_minutes:.2f}")
            save_bar(
                pd.Series({"Average Sandbox Playtime": avg_minutes}),
                sandbox_dir / "sandbox_avg_playtime_per_player.png",
                "Average Sandbox Playtime Per Player",
                "Metric",
                "Sandbox Playtime (minutes)",
            )
    else:
        summary.append("sandbox_time_seconds_observed: n/a")
    # Add after the sandbox analysis and before the final summary write
    analyze_level_dropoff_metrics(attempts_with_player, player_highest_completed, events, args.outdir)
    analyze_feature_usage(
        sessions,
        attempts_with_player,
        events,
        args.outdir,
        summary,
        excluded_player_ids=time_played_outlier_player_ids,
    )

    (args.outdir / "summary.txt").write_text("\n".join(summary) + "\n", encoding="utf-8")
    if not sessions.empty:
        sessions.to_csv(args.outdir / "sessions.normalized.csv", index=False)
    if not attempts.empty:
        attempts.to_csv(args.outdir / "attempts.normalized.csv", index=False)
    if not events.empty:
        events.to_csv(args.outdir / "events.normalized.csv", index=False)
    print(f"Analysis complete. Outputs written to: {args.outdir}")


if __name__ == "__main__":
    main()
