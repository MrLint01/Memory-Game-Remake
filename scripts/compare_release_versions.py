#!/usr/bin/env python3
"""Compare two Flash Recall releases with superimposed retention curves.

This script intentionally mirrors analyze_logs.py retention denominator logic:
- Player population = union of player ids seen in sessions/attempts/events.
- Highest level completed uses sessions.last_level_completed when available,
  with fallback to attempts passed levels if sessions data is unavailable.
- Main time-played retention uses attempts.time_seconds sum per player, which is
  the closest complete exported proxy for reveal+recall gameplay time.
- Active-playtime retention uses sessions.total_playtime_seconds sum per player.
- Stats-like round-time retention uses events.round_complete.time_spent_seconds
  sum per player, but this is partial because final successful rounds are not
  emitted as round_complete events.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

ADAPTIVE_GROUP_LABELS = {
    "A": "A - completed level 2",
    "B": "B - early failure in levels 1-2",
    "unassigned": "Unassigned - no early outcome yet",
}
TIME_OUTLIER_THRESHOLD_MINUTES = 200.0
TIME_OUTLIER_THRESHOLD_SECONDS = TIME_OUTLIER_THRESHOLD_MINUTES * 60.0


def bool_series(s: pd.Series) -> pd.Series:
    if s is None or len(s) == 0:
        return pd.Series(dtype=bool)
    if s.dtype == bool:
        return s.fillna(False)
    if pd.api.types.is_numeric_dtype(s):
        return s.fillna(0).astype(float) != 0
    vals = s.astype(str).str.strip().str.lower()
    return vals.isin({"1", "true", "t", "yes", "y"})


def label_adaptive_group(value: Any) -> str:
    normalized = str(value or "").strip()
    return ADAPTIVE_GROUP_LABELS.get(normalized, normalized or str(value))


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    out = df.copy()
    out.columns = [str(c).strip().lower() for c in out.columns]
    return out


def pick_player_column(df: pd.DataFrame) -> str | None:
    for c in ["player_id_norm", "player_id", "playerid", "user_id", "userid"]:
        if c in df.columns:
            return c
    return None


def load_from_combined(path: Path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    data = json.loads(path.read_text(encoding="utf-8"))
    sessions_rows: list[dict[str, Any]] = []
    attempts_rows: list[dict[str, Any]] = []
    events_rows: list[dict[str, Any]] = []
    for s in data:
        if not isinstance(s, dict):
            continue
        sessions_rows.append(dict(s))
        sess_version = s.get("game_version")
        sess_player = s.get("player_id")
        sess_id = s.get("session_id")
        for a in (s.get("attempts") or []):
            if not isinstance(a, dict):
                continue
            row = dict(a)
            if row.get("game_version") is None:
                row["game_version"] = sess_version
            if row.get("player_id") is None:
                row["player_id"] = sess_player
            if row.get("session_id") is None:
                row["session_id"] = sess_id
            attempts_rows.append(row)
        for e in (s.get("events") or []):
            if not isinstance(e, dict):
                continue
            row = dict(e)
            if row.get("game_version") is None:
                row["game_version"] = sess_version
            if row.get("player_id") is None:
                row["player_id"] = sess_player
            if row.get("session_id") is None:
                row["session_id"] = sess_id
            events_rows.append(row)
    return normalize_columns(pd.DataFrame(sessions_rows)), normalize_columns(pd.DataFrame(attempts_rows)), normalize_columns(pd.DataFrame(events_rows))


def load_tables(args: argparse.Namespace) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    if args.combined is not None:
        return load_from_combined(args.combined)
    sessions = normalize_columns(pd.read_csv(args.sessions)) if args.sessions and args.sessions.exists() else pd.DataFrame()
    attempts = normalize_columns(pd.read_csv(args.attempts)) if args.attempts and args.attempts.exists() else pd.DataFrame()
    events = normalize_columns(pd.read_csv(args.events)) if args.events and args.events.exists() else pd.DataFrame()
    return sessions, attempts, events


def build_player_retention_seconds(
    sessions: pd.DataFrame,
    attempts: pd.DataFrame,
    player_index: pd.Index | None = None,
) -> pd.Series:
    player_retention_seconds = pd.Series(dtype=float)

    a_player_col = pick_player_column(attempts)
    if a_player_col is not None and "time_seconds" in attempts.columns:
        attempts["time_seconds"] = pd.to_numeric(attempts["time_seconds"], errors="coerce")
        valid_attempts = attempts[a_player_col].notna() & attempts["time_seconds"].notna()
        if valid_attempts.any():
            player_retention_seconds = (
                attempts.loc[valid_attempts]
                .groupby(attempts.loc[valid_attempts, a_player_col].astype(str))["time_seconds"]
                .sum()
                .astype(float)
            )

    s_player_col = pick_player_column(sessions)
    if player_retention_seconds.empty and s_player_col is not None and "total_playtime_seconds" in sessions.columns:
        sessions["total_playtime_seconds"] = pd.to_numeric(sessions["total_playtime_seconds"], errors="coerce")
        valid_sessions = sessions[s_player_col].notna() & sessions["total_playtime_seconds"].notna()
        if valid_sessions.any():
            player_retention_seconds = (
                sessions.loc[valid_sessions]
                .groupby(sessions.loc[valid_sessions, s_player_col].astype(str))["total_playtime_seconds"]
                .sum()
                .astype(float)
            )

    if player_index is not None and len(player_index) > 0:
        player_retention_seconds = player_retention_seconds.reindex(player_index).fillna(0.0)

    return player_retention_seconds


def build_player_active_playtime_seconds(
    sessions: pd.DataFrame,
    player_index: pd.Index | None = None,
) -> pd.Series:
    player_active_seconds = pd.Series(dtype=float)

    s_player_col = pick_player_column(sessions)
    if s_player_col is not None and "total_playtime_seconds" in sessions.columns:
        sessions["total_playtime_seconds"] = pd.to_numeric(sessions["total_playtime_seconds"], errors="coerce")
        valid_sessions = sessions[s_player_col].notna() & sessions["total_playtime_seconds"].notna()
        if valid_sessions.any():
            player_active_seconds = (
                sessions.loc[valid_sessions]
                .groupby(sessions.loc[valid_sessions, s_player_col].astype(str))["total_playtime_seconds"]
                .sum()
                .astype(float)
            )

    if player_index is not None and len(player_index) > 0:
        player_active_seconds = player_active_seconds.reindex(player_index).fillna(0.0)

    return player_active_seconds


def build_player_stats_like_round_seconds(
    events: pd.DataFrame,
    player_index: pd.Index | None = None,
) -> pd.Series:
    player_round_seconds = pd.Series(dtype=float)

    e_player_col = pick_player_column(events)
    if e_player_col is not None and {"event_type", "time_spent_seconds"} <= set(events.columns):
        event_type = events["event_type"].astype(str).str.strip().str.lower()
        round_seconds = pd.to_numeric(events["time_spent_seconds"], errors="coerce")
        valid_rounds = (
            events[e_player_col].notna()
            & round_seconds.notna()
            & event_type.eq("round_complete")
        )
        if valid_rounds.any():
            player_round_seconds = (
                round_seconds[valid_rounds]
                .groupby(events.loc[valid_rounds, e_player_col].astype(str))
                .sum()
                .astype(float)
            )

    if player_index is not None and len(player_index) > 0:
        player_round_seconds = player_round_seconds.reindex(player_index).fillna(0.0)

    return player_round_seconds


def get_player_metrics_from_tables(
    s: pd.DataFrame, a: pd.DataFrame, e: pd.DataFrame
) -> pd.DataFrame:

    all_players: set[str] = set()
    s_player_col = pick_player_column(s)
    a_player_col = pick_player_column(a)
    e_player_col = pick_player_column(e)

    if s_player_col is not None:
        all_players.update(s[s_player_col].dropna().astype(str).tolist())
    if a_player_col is not None:
        all_players.update(a[a_player_col].dropna().astype(str).tolist())
    if e_player_col is not None:
        all_players.update(e[e_player_col].dropna().astype(str).tolist())

    player_highest_completed = pd.Series(dtype=float)
    if s_player_col is not None and "last_level_completed" in s.columns:
        player_highest_completed = (
            s.dropna(subset=[s_player_col])
            .groupby(s[s_player_col].astype(str))["last_level_completed"]
            .max()
            .fillna(0)
            .clip(lower=0)
            .astype(float)
        )

    if a_player_col is not None and {"level_number", "passed"} <= set(a.columns):
        a["level_number"] = pd.to_numeric(a["level_number"], errors="coerce")
        a["passed_flag"] = bool_series(a["passed"])
        passed = a[a["passed_flag"] & a[a_player_col].notna() & a["level_number"].notna()]
        if not passed.empty:
            fallback_highest = passed.groupby(passed[a_player_col].astype(str))["level_number"].max().astype(float)
            if player_highest_completed.empty:
                player_highest_completed = fallback_highest

    if all_players:
        player_highest_completed = player_highest_completed.reindex(sorted(all_players)).fillna(0.0)

    player_levels_completed_count = pd.Series(0.0, index=player_highest_completed.index, dtype=float)
    if a_player_col is not None and {"level_number", "passed"} <= set(a.columns):
        passed = a[a["passed_flag"] & a[a_player_col].notna() & a["level_number"].notna()]
        if not passed.empty:
            cnt = passed.groupby(passed[a_player_col].astype(str))["level_number"].nunique().astype(float)
            player_levels_completed_count = cnt.reindex(player_highest_completed.index).fillna(0.0)

    player_retention_seconds = build_player_retention_seconds(
        s,
        a,
        player_highest_completed.index,
    )
    player_active_playtime_seconds = build_player_active_playtime_seconds(
        s,
        player_highest_completed.index,
    )
    player_stats_like_round_seconds = build_player_stats_like_round_seconds(
        e,
        player_highest_completed.index,
    )

    out = pd.DataFrame(
        {
            "player_id": player_highest_completed.index.astype(str),
            "highest_level_completed": player_highest_completed.astype(float).astype(int).values,
            "levels_completed_count": player_levels_completed_count.astype(float).astype(int).values,
            "total_playtime_seconds": player_retention_seconds.astype(float).values,
            "active_playtime_seconds": player_active_playtime_seconds.astype(float).values,
            "stats_like_round_time_seconds": player_stats_like_round_seconds.astype(float).values,
        }
    )
    return out


def get_player_metrics_for_version(
    sessions: pd.DataFrame, attempts: pd.DataFrame, events: pd.DataFrame, version: str
) -> pd.DataFrame:
    s = sessions[sessions["game_version"].astype(str) == version].copy() if not sessions.empty and "game_version" in sessions.columns else pd.DataFrame()
    a = attempts[attempts["game_version"].astype(str) == version].copy() if not attempts.empty and "game_version" in attempts.columns else pd.DataFrame()
    e = events[events["game_version"].astype(str) == version].copy() if not events.empty and "game_version" in events.columns else pd.DataFrame()
    return get_player_metrics_from_tables(s, a, e)


def load_version_tables_from_dir(version_dir: Path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    s_path = version_dir / "sessions.normalized.csv"
    a_path = version_dir / "attempts.normalized.csv"
    e_path = version_dir / "events.normalized.csv"
    s = normalize_columns(pd.read_csv(s_path)) if s_path.exists() else pd.DataFrame()
    a = normalize_columns(pd.read_csv(a_path)) if a_path.exists() else pd.DataFrame()
    e = normalize_columns(pd.read_csv(e_path)) if e_path.exists() else pd.DataFrame()
    return s, a, e


def filter_table_for_version(df: pd.DataFrame, version: str) -> pd.DataFrame:
    if df.empty or "game_version" not in df.columns:
        return pd.DataFrame()
    return df[df["game_version"].astype(str) == str(version)].copy()


def get_all_players_from_tables(s: pd.DataFrame, a: pd.DataFrame, e: pd.DataFrame) -> list[str]:
    all_players: set[str] = set()
    for df in [s, a, e]:
        player_col = pick_player_column(df)
        if player_col is None or df.empty:
            continue
        all_players.update(df[player_col].dropna().astype(str).tolist())
    return sorted(all_players)


def coerce_datetime_series(df: pd.DataFrame) -> pd.Series:
    for col in ["event_timestamp", "created_at", "client_iso"]:
        if col not in df.columns:
            continue
        ts = pd.to_datetime(df[col], errors="coerce", utc=True)
        if ts.notna().any():
            return ts
    if "client_timestamp_ms" in df.columns:
        ms = pd.to_numeric(df["client_timestamp_ms"], errors="coerce")
        ts = pd.to_datetime(ms, unit="ms", errors="coerce", utc=True)
        if ts.notna().any():
            return ts
    return pd.Series(pd.NaT, index=df.index, dtype="datetime64[ns, UTC]")


def retention_curve(series: pd.Series) -> pd.Series:
    if series is None or series.empty:
        return pd.Series(dtype=float)
    max_val = int(series.max()) if pd.notna(series.max()) else 0
    idx = pd.Index(range(0, max(1, max_val) + 1), dtype=int)
    return pd.Series({k: (series >= k).mean() * 100.0 for k in idx}, index=idx)


def retention_curve_time(seconds: pd.Series) -> pd.Series:
    if seconds is None or seconds.empty:
        return pd.Series(dtype=float)
    max_minutes = int(np.ceil(seconds.max() / 60.0)) if pd.notna(seconds.max()) else 0
    idx = pd.Index(range(0, max(1, max_minutes) + 1), dtype=int)
    return pd.Series({m: (seconds >= (m * 60.0)).mean() * 100.0 for m in idx}, index=idx)


def get_time_played_outlier_player_ids(
    stats: pd.DataFrame,
    time_col: str = "total_playtime_seconds",
    threshold_seconds: float = TIME_OUTLIER_THRESHOLD_SECONDS,
) -> set[str]:
    if stats.empty or time_col not in stats.columns or "player_id" not in stats.columns:
        return set()
    time_values = pd.to_numeric(stats[time_col], errors="coerce")
    player_ids = stats["player_id"].astype(str)
    return set(player_ids[time_values >= threshold_seconds].tolist())


def filter_frame_by_player_ids(
    frame: pd.DataFrame,
    excluded_player_ids: set[str] | None,
    player_col: str = "player_id",
) -> pd.DataFrame:
    if frame.empty or not excluded_player_ids or player_col not in frame.columns:
        return frame.copy()
    keep_mask = ~frame[player_col].astype(str).isin(excluded_player_ids)
    return frame.loc[keep_mask].copy()


def plot_two_lines(
    out_png: Path,
    title: str,
    xlabel: str,
    old_label: str,
    new_label: str,
    old_s: pd.Series,
    new_s: pd.Series,
    x_max: float | None = None,
) -> None:
    idx = sorted(set(old_s.index.tolist()) | set(new_s.index.tolist()))
    old_p = old_s.reindex(idx).ffill().fillna(100.0)
    new_p = new_s.reindex(idx).ffill().fillna(100.0)
    plt.figure(figsize=(10, 5))
    plt.plot(old_p.index, old_p.values, marker="o", color="#5b8ff9", label=old_label)
    plt.plot(new_p.index, new_p.values, marker="o", color="#5ad8a6", label=new_label)
    plt.ylim(0, 100)
    if x_max is not None:
        plt.xlim(0, x_max)
    plt.xlabel(xlabel)
    plt.ylabel("Retention (%)")
    plt.title(title)
    plt.legend()
    plt.grid(True, alpha=0.25)
    plt.tight_layout()
    plt.savefig(out_png, dpi=130)
    plt.close()


def compute_level_one_feature_rates(s: pd.DataFrame, a: pd.DataFrame, e: pd.DataFrame) -> pd.DataFrame:
    features = [
        ("started_level_1", "Started level 1"),
        ("interacted_level_1", "Interacted"),
    ]
    all_players = get_all_players_from_tables(s, a, e)
    total_players = len(all_players)
    empty = pd.DataFrame(
        {
            "feature_key": [key for key, _ in features],
            "feature_label": [label for _, label in features],
            "players": [0] * len(features),
            "total_players": [total_players] * len(features),
            "percent": [0.0] * len(features),
        }
    )
    if total_players == 0 or e.empty:
        return empty

    player_col = pick_player_column(e)
    if player_col is None:
        return empty

    events = e[e[player_col].notna()].copy()
    if events.empty:
        # We can still compute level-1 starts from attempts if event telemetry is absent.
        if not a.empty:
            a_player_col = pick_player_column(a)
            if a_player_col is not None:
                attempts = a[a[a_player_col].notna()].copy()
                attempts["_player"] = attempts[a_player_col].astype(str)
                attempts["_level_number"] = pd.to_numeric(attempts["level_number"], errors="coerce") if "level_number" in attempts.columns else pd.Series(np.nan, index=attempts.index)
                started_level_1_players = set(attempts[attempts["_level_number"] == 1]["_player"].tolist())
                rows = []
                for feature_key, feature_label in features:
                    players = len(started_level_1_players) if feature_key == "started_level_1" else 0
                    percent = (players / total_players * 100.0) if total_players else 0.0
                    rows.append(
                        {
                            "feature_key": feature_key,
                            "feature_label": feature_label,
                            "players": players,
                            "total_players": total_players,
                            "percent": percent,
                        }
                    )
                return pd.DataFrame(rows)
        return empty

    events["_player"] = events[player_col].astype(str)
    events["_event_type"] = events["event_type"].astype(str).str.strip().str.lower() if "event_type" in events.columns else ""
    events["_level_number"] = (
        pd.to_numeric(events["level_number"], errors="coerce")
        if "level_number" in events.columns
        else pd.Series(np.nan, index=events.index)
    )
    events["_action"] = events["action"].astype(str).str.strip().str.lower() if "action" in events.columns else ""
    events["_autoplay_mode"] = (
        events["autoplay_mode"].astype(str).str.strip().str.lower()
        if "autoplay_mode" in events.columns
        else ""
    )
    events["_target"] = events["target"].astype(str).str.strip().str.lower() if "target" in events.columns else ""
    events["_preview_start_source"] = (
        events["preview_start_source"].astype(str).str.strip().str.lower()
        if "preview_start_source" in events.columns
        else ""
    )
    events["_current_level_number"] = (
        pd.to_numeric(events["current_level_number"], errors="coerce")
        if "current_level_number" in events.columns
        else pd.Series(np.nan, index=events.index)
    )
    events["_timestamp"] = coerce_datetime_series(events)

    started_level_1_players: set[str] = set()
    start_time_frames: list[pd.DataFrame] = []

    if not a.empty:
        a_player_col = pick_player_column(a)
        if a_player_col is not None:
            attempts = a[a[a_player_col].notna()].copy()
            attempts["_player"] = attempts[a_player_col].astype(str)
            attempts["_level_number"] = (
                pd.to_numeric(attempts["level_number"], errors="coerce")
                if "level_number" in attempts.columns
                else pd.Series(np.nan, index=attempts.index)
            )
            attempts_started_level_1 = attempts[attempts["_level_number"] == 1].copy()
            started_level_1_players.update(attempts_started_level_1["_player"].tolist())
            attempts_started_level_1["_timestamp"] = coerce_datetime_series(attempts_started_level_1)
            start_time_frames.append(attempts_started_level_1[["_player", "_timestamp"]])

    started_level_1_events = events[
        (
            ((events["_event_type"] == "level_start") & (events["_level_number"] == 1)) |
            ((events["_event_type"] == "round_complete") & (events["_level_number"] == 1)) |
            ((events["_event_type"] == "level_end") & (events["_level_number"] == 1)) |
            (
                (events["_event_type"] == "autoplay_event") &
                (events["_current_level_number"] == 1) &
                (events["_target"].isin(["splash_start", "first_level_countdown", "stage_preview_start"]))
            )
        )
    ].copy()
    started_level_1_players.update(started_level_1_events["_player"].tolist())
    start_time_frames.append(started_level_1_events[["_player", "_timestamp"]])

    if start_time_frames:
        level_1_starts = pd.concat(start_time_frames, ignore_index=True)
        first_level_start_by_player = (
            level_1_starts[level_1_starts["_timestamp"].notna()]
            .sort_values("_timestamp")
            .groupby("_player")["_timestamp"]
            .first()
        )
    else:
        first_level_start_by_player = pd.Series(dtype="datetime64[ns, UTC]")

    interacted_level_1 = events[
        (events["_event_type"] == "round_complete") &
        (events["_level_number"] == 1)
    ].copy()
    interacted_level_1["_first_start_at"] = interacted_level_1["_player"].map(first_level_start_by_player)
    interacted_level_1_players = set(
        interacted_level_1[
            interacted_level_1["_timestamp"].notna() &
            interacted_level_1["_first_start_at"].notna() &
            (interacted_level_1["_timestamp"] >= interacted_level_1["_first_start_at"])
        ]["_player"].tolist()
    )

    player_sets = {
        "started_level_1": started_level_1_players,
        "interacted_level_1": interacted_level_1_players,
    }

    rows = []
    for feature_key, feature_label in features:
        players = len(player_sets.get(feature_key, set()))
        percent = (players / total_players * 100.0) if total_players else 0.0
        rows.append(
            {
                "feature_key": feature_key,
                "feature_label": feature_label,
                "players": players,
                "total_players": total_players,
                "percent": percent,
            }
        )
    return pd.DataFrame(rows)


def plot_grouped_feature_bars(
    out_png: Path,
    title: str,
    old_label: str,
    new_label: str,
    old_df: pd.DataFrame,
    new_df: pd.DataFrame,
    feature_order: list[str] | None = None,
) -> None:
    if old_df.empty and new_df.empty:
        return

    old_plot = old_df[["feature_key", "feature_label", "percent"]].copy()
    new_plot = new_df[["feature_key", "feature_label", "percent"]].copy()
    merged = old_plot.merge(
        new_plot,
        on=["feature_key", "feature_label"],
        how="outer",
        suffixes=("_old", "_new"),
    ).fillna(0.0)
    if feature_order is None:
        feature_order = old_plot["feature_key"].tolist() or new_plot["feature_key"].tolist()
    merged["_order"] = merged["feature_key"].map({key: idx for idx, key in enumerate(feature_order)})
    merged = merged.sort_values("_order")

    labels = merged["feature_label"].tolist()
    old_vals = merged["percent_old"].astype(float).tolist()
    new_vals = merged["percent_new"].astype(float).tolist()

    x = np.arange(len(labels), dtype=float) * 1.75
    width = 0.34

    fig, ax = plt.subplots(figsize=(9.5, 5.2))
    old_bars = ax.bar(x - width / 2, old_vals, width=width, color="#5b8ff9", label=old_label)
    new_bars = ax.bar(x + width / 2, new_vals, width=width, color="#5ad8a6", label=new_label)
    ax.set_xticks(x, labels)
    ax.set_ylim(0, 100)
    ax.set_ylabel("Percent of players")
    ax.set_xlabel("Features")
    ax.set_title(title)
    ax.grid(True, axis="y", alpha=0.25)
    ax.legend()

    for bars in [old_bars, new_bars]:
        for bar in bars:
            height = float(bar.get_height())
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                height + 1.5,
                f"{height:.1f}%",
                ha="center",
                va="bottom",
                fontsize=9,
            )

    fig.tight_layout()
    fig.savefig(out_png, dpi=120)
    plt.close(fig)


def compute_level_one_onboarding_metrics(s: pd.DataFrame, a: pd.DataFrame, e: pd.DataFrame) -> pd.DataFrame:
    feature_rates = compute_level_one_feature_rates(s, a, e)
    all_players = get_all_players_from_tables(s, a, e)
    total_players = len(all_players)
    features = [
        ("started_level_1", "Started L1"),
        ("interacted_level_1", "Reached round 1\nend"),
        ("completed_level_1", "Completed L1"),
        ("attempted_level_2", "Attempted L2"),
    ]

    players_by_key = {
        row["feature_key"]: int(row["players"])
        for _, row in feature_rates.iterrows()
    }

    if not a.empty:
        player_col = pick_player_column(a)
        if player_col is not None:
            attempts = a[a[player_col].notna()].copy()
            attempts["_player"] = attempts[player_col].astype(str)
            attempts["_level_number"] = (
                pd.to_numeric(attempts["level_number"], errors="coerce")
                if "level_number" in attempts.columns
                else pd.Series(np.nan, index=attempts.index)
            )
            attempts["_passed"] = bool_series(attempts["passed"]) if "passed" in attempts.columns else False
            players_by_key["completed_level_1"] = len(
                set(attempts[(attempts["_level_number"] == 1) & attempts["_passed"]]["_player"].tolist())
            )
            players_by_key["attempted_level_2"] = len(
                set(attempts[attempts["_level_number"] == 2]["_player"].tolist())
            )
        else:
            players_by_key["completed_level_1"] = 0
            players_by_key["attempted_level_2"] = 0
    else:
        players_by_key["completed_level_1"] = 0
        players_by_key["attempted_level_2"] = 0

    rows = []
    for feature_key, feature_label in features:
        players = int(players_by_key.get(feature_key, 0))
        percent = (players / total_players * 100.0) if total_players else 0.0
        rows.append(
            {
                "feature_key": feature_key,
                "feature_label": feature_label,
                "players": players,
                "total_players": total_players,
                "percent": percent,
            }
        )
    return pd.DataFrame(rows)


def compute_early_level_completion_metrics(stats: pd.DataFrame, max_level: int = 5) -> pd.DataFrame:
    rows = []
    total_players = len(stats)
    highest = stats["highest_level_completed"] if not stats.empty and "highest_level_completed" in stats.columns else pd.Series(dtype=float)
    for level in range(1, max_level + 1):
        percent = float((highest >= level).mean() * 100.0) if total_players else 0.0
        rows.append(
            {
                "feature_key": f"completed_level_{level}",
                "feature_label": f"Completed L{level}",
                "players": int(round(percent * total_players / 100.0)) if total_players else 0,
                "total_players": total_players,
                "percent": percent,
            }
        )
    return pd.DataFrame(rows)


def load_level_one_player_flow_metrics(version_dir: Path) -> pd.DataFrame:
    path = version_dir / "level_dropoff_analysis" / "level1_player_flow_percent.csv"
    features = [
        ("quit_before_l1", "Quit Before L1", "Quit Before L1"),
        ("started_l1_quit_before_finish", "Started L1,\nQuit Before Finish", "Started L1, Quit Before Finish"),
        ("completed_l1_quit_immediately", "Completed L1,\nQuit Immediately", "Completed L1, Quit Immediately"),
        ("completed_l1_attempted_l2", "Completed L1,\nAttempted L2", "Completed L1, Attempted L2"),
    ]
    empty = pd.DataFrame(
        {
            "feature_key": [key for key, _, _ in features],
            "feature_label": [label for _, label, _ in features],
            "players": [0] * len(features),
            "total_players": [0] * len(features),
            "percent": [0.0] * len(features),
        }
    )
    if not path.exists():
        return empty

    df = normalize_columns(pd.read_csv(path))
    if df.empty:
        return empty

    name_col = df.columns[0]
    percent_col = "percent_of_players" if "percent_of_players" in df.columns else "percent"
    if percent_col not in df.columns:
        return empty

    rows = []
    for feature_key, feature_label, source_name in features:
        match = df[df[name_col].astype(str).str.strip() == source_name]
        percent = float(pd.to_numeric(match[percent_col], errors="coerce").iloc[0]) if not match.empty else 0.0
        rows.append(
            {
                "feature_key": feature_key,
                "feature_label": feature_label,
                "players": 0,
                "total_players": 0,
                "percent": percent,
            }
        )
    return pd.DataFrame(rows)


def load_adaptive_retention_csv(version_dir: Path, filename: str, value_col: str) -> pd.DataFrame:
    path = version_dir / "adaptive_features" / filename
    if not path.exists():
        return pd.DataFrame()
    df = normalize_columns(pd.read_csv(path))
    required = {"adaptive_group", "minute", value_col}
    if not required <= set(df.columns):
        return pd.DataFrame()
    return df


def plot_adaptive_six_lines(
    out_png: Path,
    title: str,
    xlabel: str,
    ylabel: str,
    old_label: str,
    new_label: str,
    old_df: pd.DataFrame,
    new_df: pd.DataFrame,
    value_col: str,
    x_max: float | None = None,
) -> None:
    if old_df.empty and new_df.empty:
        return

    plt.figure(figsize=(11, 6))
    styles = {
        "unassigned": ("#9c755f", "o"),
        "B": ("#e15759", "s"),
        "A": ("#4e79a7", "^"),
    }
    plotted = False

    for version_label, df, linestyle in [
        (old_label, old_df, "--"),
        (new_label, new_df, "-"),
    ]:
        if df.empty:
            continue
        for group_name in ["unassigned", "B", "A"]:
            g = df[df["adaptive_group"].astype(str) == group_name].copy()
            if g.empty:
                continue
            g["minute"] = pd.to_numeric(g["minute"], errors="coerce")
            g[value_col] = pd.to_numeric(g[value_col], errors="coerce")
            g = g.dropna(subset=["minute", value_col]).sort_values("minute")
            if g.empty:
                continue
            color, marker = styles[group_name]
            plt.plot(
                g["minute"],
                g[value_col],
                linestyle=linestyle,
                marker=marker,
                color=color,
                label=f"{version_label} {label_adaptive_group(group_name)}",
            )
            plotted = True

    if not plotted:
        plt.close()
        return

    plt.ylim(0, 100)
    if x_max is not None:
        plt.xlim(0, x_max)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.title(title)
    plt.legend(ncol=2)
    plt.grid(True, alpha=0.25)
    plt.tight_layout()
    plt.savefig(out_png, dpi=130)
    plt.close()


def plot_adaptive_by_group_panels(
    out_png: Path,
    title: str,
    xlabel: str,
    ylabel: str,
    old_label: str,
    new_label: str,
    old_df: pd.DataFrame,
    new_df: pd.DataFrame,
    value_col: str,
    x_max: float | None = None,
) -> None:
    if old_df.empty and new_df.empty:
        return

    groups = ["unassigned", "B", "A"]
    colors = {old_label: "#5b8ff9", new_label: "#5ad8a6"}
    fig, axes = plt.subplots(len(groups), 1, figsize=(10, 11), sharex=True, sharey=True)
    plotted_any = False

    for ax, group_name in zip(axes, groups):
        group_plotted = False
        for version_label, df, marker, linestyle in [
            (old_label, old_df, "o", "--"),
            (new_label, new_df, "^", "-"),
        ]:
            if df.empty:
                continue
            g = df[df["adaptive_group"].astype(str) == group_name].copy()
            if g.empty:
                continue
            g["minute"] = pd.to_numeric(g["minute"], errors="coerce")
            g[value_col] = pd.to_numeric(g[value_col], errors="coerce")
            g = g.dropna(subset=["minute", value_col]).sort_values("minute")
            if g.empty:
                continue
            ax.plot(
                g["minute"],
                g[value_col],
                marker=marker,
                linestyle=linestyle,
                color=colors[version_label],
                label=version_label,
            )
            group_plotted = True
            plotted_any = True
        ax.set_title(f"{label_adaptive_group(group_name)} cohort")
        ax.set_ylabel(ylabel)
        ax.set_ylim(0, 100)
        if x_max is not None:
            ax.set_xlim(0, x_max)
        ax.grid(True, alpha=0.25)
        if group_plotted:
            ax.legend()

    if not plotted_any:
        plt.close(fig)
        return

    axes[-1].set_xlabel(xlabel)
    fig.suptitle(title)
    fig.tight_layout(rect=(0, 0, 1, 0.97))
    fig.savefig(out_png, dpi=130)
    plt.close(fig)


def get_adaptive_cohort_counts(
    version_dir: Path,
    filename: str = "adaptive_retention_time_cohorts.csv",
) -> dict[str, int]:
    path = version_dir / "adaptive_features" / filename
    counts = {"unassigned": 0, "B": 0, "A": 0}
    if not path.exists():
        return counts
    df = normalize_columns(pd.read_csv(path))
    if "adaptive_retention_group" not in df.columns:
        return counts
    grouped = df["adaptive_retention_group"].astype(str).value_counts()
    for key in counts:
        counts[key] = int(grouped.get(key, 0))
    return counts


def main() -> None:
    p = argparse.ArgumentParser(description="Compare release versions with retention curves")
    p.add_argument("--combined", type=Path, default=None, help="Optional combined export JSON (fallback to csv inputs if omitted)")
    p.add_argument("--sessions", type=Path, default=Path("prepared_data/sessions.csv"))
    p.add_argument("--attempts", type=Path, default=Path("prepared_data/attempts.csv"))
    p.add_argument("--events", type=Path, default=Path("prepared_data/events.csv"))
    p.add_argument("--old-version", type=str, default="2026.02.21")
    p.add_argument("--new-version", type=str, default="2026.03.0")
    p.add_argument("--old-dir", type=Path, default=None, help="Directory containing old version normalized CSVs")
    p.add_argument("--new-dir", type=Path, default=None, help="Directory containing new version normalized CSVs")
    p.add_argument("--outdir", type=Path, default=None)
    args = p.parse_args()

    outdir = args.outdir or Path("analysis_output") / f"version_comparison_{args.old_version}_vs_{args.new_version}"
    outdir.mkdir(parents=True, exist_ok=True)

    old_dir = args.old_dir or Path("analysis_output") / f"version_{args.old_version}"
    new_dir = args.new_dir or Path("analysis_output") / f"version_{args.new_version}"

    if old_dir.exists() and new_dir.exists():
        old_s, old_a, old_e = load_version_tables_from_dir(old_dir)
        new_s, new_a, new_e = load_version_tables_from_dir(new_dir)
    else:
        sessions, attempts, events = load_tables(args)
        old_s = filter_table_for_version(sessions, args.old_version)
        old_a = filter_table_for_version(attempts, args.old_version)
        old_e = filter_table_for_version(events, args.old_version)
        new_s = filter_table_for_version(sessions, args.new_version)
        new_a = filter_table_for_version(attempts, args.new_version)
        new_e = filter_table_for_version(events, args.new_version)

    old_stats = get_player_metrics_from_tables(old_s, old_a, old_e)
    new_stats = get_player_metrics_from_tables(new_s, new_a, new_e)
    old_level1_features = compute_level_one_feature_rates(old_s, old_a, old_e)
    new_level1_features = compute_level_one_feature_rates(new_s, new_a, new_e)
    old_level1_onboarding = compute_level_one_onboarding_metrics(old_s, old_a, old_e)
    new_level1_onboarding = compute_level_one_onboarding_metrics(new_s, new_a, new_e)
    old_early_completion = compute_early_level_completion_metrics(old_stats, max_level=5)
    new_early_completion = compute_early_level_completion_metrics(new_stats, max_level=5)
    old_level1_flow = load_level_one_player_flow_metrics(old_dir)
    new_level1_flow = load_level_one_player_flow_metrics(new_dir)
    old_time_played_outlier_player_ids = get_time_played_outlier_player_ids(old_stats)
    new_time_played_outlier_player_ids = get_time_played_outlier_player_ids(new_stats)
    old_stats_outliers_removed = filter_frame_by_player_ids(old_stats, old_time_played_outlier_player_ids)
    new_stats_outliers_removed = filter_frame_by_player_ids(new_stats, new_time_played_outlier_player_ids)

    # Keep only superimposed retention curve visuals.
    for old_png in outdir.glob("*.png"):
        old_png.unlink(missing_ok=True)

    def plot_time_metric_variants(
        metric_col: str,
        base_name: str,
        title_root: str,
        xlabel: str,
    ) -> None:
        plot_two_lines(
            outdir / f"{base_name}.png",
            title_root,
            xlabel,
            args.old_version,
            args.new_version,
            retention_curve_time(old_stats[metric_col]),
            retention_curve_time(new_stats[metric_col]),
        )
        plot_two_lines(
            outdir / f"{base_name}_first_30.png",
            f"{title_root} (First 30 Minutes)",
            xlabel,
            args.old_version,
            args.new_version,
            retention_curve_time(old_stats[metric_col]),
            retention_curve_time(new_stats[metric_col]),
            x_max=30,
        )
        plot_two_lines(
            outdir / f"{base_name}_outliers_removed.png",
            f"{title_root} (Outliers Removed)",
            xlabel,
            args.old_version,
            args.new_version,
            retention_curve_time(old_stats_outliers_removed[metric_col]),
            retention_curve_time(new_stats_outliers_removed[metric_col]),
        )
        plot_two_lines(
            outdir / f"{base_name}_outliers_removed_first_30.png",
            f"{title_root} (Outliers Removed, First 30 Minutes)",
            xlabel,
            args.old_version,
            args.new_version,
            retention_curve_time(old_stats_outliers_removed[metric_col]),
            retention_curve_time(new_stats_outliers_removed[metric_col]),
            x_max=30,
        )

    def plot_adaptive_comparison_set(
        source_filename: str,
        value_col: str,
        base_name: str,
        title_root: str,
        ylabel: str,
        title_modifier: str = "",
    ) -> None:
        old_df = load_adaptive_retention_csv(old_dir, source_filename, value_col)
        new_df = load_adaptive_retention_csv(new_dir, source_filename, value_col)
        plot_title = title_root
        plot_first_30_title = f"{title_root} (First 30 Minutes)"
        plot_by_group_title = f"{title_root} (By Group Panels)"
        plot_by_group_first_30_title = f"{title_root} (By Group Panels, First 30 Minutes)"
        if title_modifier:
            plot_title = f"{title_root} ({title_modifier})"
            plot_first_30_title = f"{title_root} ({title_modifier}, First 30 Minutes)"
            plot_by_group_title = f"{title_root} ({title_modifier}, By Group Panels)"
            plot_by_group_first_30_title = f"{title_root} ({title_modifier}, By Group Panels, First 30 Minutes)"

        plot_adaptive_six_lines(
            outdir / f"{base_name}.png",
            plot_title,
            "Gameplay time (minutes threshold)",
            ylabel,
            args.old_version,
            args.new_version,
            old_df,
            new_df,
            value_col,
        )
        plot_adaptive_six_lines(
            outdir / f"{base_name}_first_30.png",
            plot_first_30_title,
            "Gameplay time (minutes threshold)",
            ylabel,
            args.old_version,
            args.new_version,
            old_df,
            new_df,
            value_col,
            x_max=30,
        )
        plot_adaptive_by_group_panels(
            outdir / f"{base_name}_by_group.png",
            plot_by_group_title,
            "Gameplay time (minutes threshold)",
            ylabel,
            args.old_version,
            args.new_version,
            old_df,
            new_df,
            value_col,
        )
        plot_adaptive_by_group_panels(
            outdir / f"{base_name}_by_group_first_30.png",
            plot_by_group_first_30_title,
            "Gameplay time (minutes threshold)",
            ylabel,
            args.old_version,
            args.new_version,
            old_df,
            new_df,
            value_col,
            x_max=30,
        )

    plot_two_lines(
        outdir / "retention_curve_highest_level_completed.png",
        "Retention Curve by Highest Level Completed",
        "Highest level completed (threshold)",
        args.old_version,
        args.new_version,
        retention_curve(old_stats["highest_level_completed"]),
        retention_curve(new_stats["highest_level_completed"]),
    )
    plot_two_lines(
        outdir / "retention_curve_levels_completed_count.png",
        "Retention Curve by Number of Levels Completed",
        "Levels completed count (threshold)",
        args.old_version,
        args.new_version,
        retention_curve(old_stats["levels_completed_count"]),
        retention_curve(new_stats["levels_completed_count"]),
    )
    plot_time_metric_variants(
        "total_playtime_seconds",
        "retention_curve_time_played_minutes",
        "Retention Curve by Time Played",
        "Time played (minutes threshold)",
    )
    plot_time_metric_variants(
        "active_playtime_seconds",
        "retention_curve_active_playtime_minutes",
        "Retention Curve by Active Playtime",
        "Active gameplay time (minutes threshold)",
    )
    plot_time_metric_variants(
        "stats_like_round_time_seconds",
        "retention_curve_stats_like_round_time_minutes",
        "Retention Curve by Stats-Like Round Time",
        "Stats-like round time (minutes threshold)",
    )
    plot_grouped_feature_bars(
        outdir / "level_1_feature_bar_comparison.png",
        "Level 1 Feature Comparison",
        args.old_version,
        args.new_version,
        old_level1_features,
        new_level1_features,
    )
    plot_grouped_feature_bars(
        outdir / "level_1_onboarding_funnel_comparison.png",
        "Level 1 Onboarding Funnel Comparison",
        args.old_version,
        args.new_version,
        old_level1_onboarding,
        new_level1_onboarding,
        feature_order=[
            "started_level_1",
            "interacted_level_1",
            "completed_level_1",
            "attempted_level_2",
        ],
    )
    plot_grouped_feature_bars(
        outdir / "early_level_completion_comparison.png",
        "Early Level Completion Comparison",
        args.old_version,
        args.new_version,
        old_early_completion,
        new_early_completion,
        feature_order=[
            "completed_level_1",
            "completed_level_2",
            "completed_level_3",
            "completed_level_4",
            "completed_level_5",
        ],
    )
    plot_grouped_feature_bars(
        outdir / "level_1_player_flow_comparison.png",
        "Level 1 Player Flow Comparison",
        args.old_version,
        args.new_version,
        old_level1_flow,
        new_level1_flow,
        feature_order=[
            "quit_before_l1",
            "started_l1_quit_before_finish",
            "completed_l1_quit_immediately",
            "completed_l1_attempted_l2",
        ],
    )

    plot_adaptive_comparison_set(
        "adaptive_group_retention_by_time.csv",
        "percent",
        "adaptive_group_retention_by_time_comparison",
        "Adaptive Cohort Retention by Time",
        "Retention (%)",
    )
    plot_adaptive_comparison_set(
        "adaptive_group_retention_by_time_outliers_removed.csv",
        "percent",
        "adaptive_group_retention_by_time_comparison_outliers_removed",
        "Adaptive Cohort Retention by Time",
        "Retention (%)",
        "Outliers Removed",
    )

    plot_adaptive_comparison_set(
        "adaptive_group_retention_by_time_all_players.csv",
        "percent_all_players",
        "adaptive_group_retention_by_time_all_players_comparison",
        "Adaptive Cohort Retention by Time (% of All Cohort Players)",
        "Percent of All Three-Group Players (%)",
    )
    plot_adaptive_comparison_set(
        "adaptive_group_retention_by_time_all_players_outliers_removed.csv",
        "percent_all_players",
        "adaptive_group_retention_by_time_all_players_comparison_outliers_removed",
        "Adaptive Cohort Retention by Time (% of All Cohort Players)",
        "Percent of All Three-Group Players (%)",
        "Outliers Removed",
    )

    old_adaptive_counts = get_adaptive_cohort_counts(old_dir)
    new_adaptive_counts = get_adaptive_cohort_counts(new_dir)
    old_adaptive_counts_outliers_removed = get_adaptive_cohort_counts(
        old_dir,
        "adaptive_retention_time_cohorts_outliers_removed.csv",
    )
    new_adaptive_counts_outliers_removed = get_adaptive_cohort_counts(
        new_dir,
        "adaptive_retention_time_cohorts_outliers_removed.csv",
    )

    def retention_pct(stats: pd.DataFrame, min_completed_levels: int = 2) -> float:
        if stats.empty:
            return 0.0
        return float((stats["levels_completed_count"] >= min_completed_levels).mean() * 100.0)

    summary = [
        "Flash Recall Release Comparison",
        "==============================",
        f"old_version: {args.old_version}",
        f"new_version: {args.new_version}",
        "",
        "Comparison output: superimposed retention curves plus level-1 onboarding/flow and early-completion grouped bars",
        "retention_metric: attempts.time_seconds sum per player (stage gameplay time; closest complete exported proxy for reveal+recall time), fallback sessions.total_playtime_seconds",
        "active_playtime_metric: sessions.total_playtime_seconds sum per player (includes menu/result viewing until inactivity pause)",
        "stats_like_time_metric: events.round_complete.time_spent_seconds sum per player (same per-round timer source as local stats menu, but partial because final successful rounds are not emitted as round_complete)",
        f"old_players: {len(old_stats)}",
        f"new_players: {len(new_stats)}",
        f"old_retention_levels_completed_2plus_pct: {retention_pct(old_stats, 2):.2f}",
        f"new_retention_levels_completed_2plus_pct: {retention_pct(new_stats, 2):.2f}",
        f"old_avg_time_played_minutes: {(old_stats['total_playtime_seconds'].mean() / 60.0) if len(old_stats) else 0:.2f}",
        f"new_avg_time_played_minutes: {(new_stats['total_playtime_seconds'].mean() / 60.0) if len(new_stats) else 0:.2f}",
        f"old_avg_active_playtime_minutes: {(old_stats['active_playtime_seconds'].mean() / 60.0) if len(old_stats) else 0:.2f}",
        f"new_avg_active_playtime_minutes: {(new_stats['active_playtime_seconds'].mean() / 60.0) if len(new_stats) else 0:.2f}",
        f"old_avg_stats_like_round_time_minutes: {(old_stats['stats_like_round_time_seconds'].mean() / 60.0) if len(old_stats) else 0:.2f}",
        f"new_avg_stats_like_round_time_minutes: {(new_stats['stats_like_round_time_seconds'].mean() / 60.0) if len(new_stats) else 0:.2f}",
        f"time_played_outlier_threshold_minutes: {TIME_OUTLIER_THRESHOLD_MINUTES:.0f}",
        f"old_time_played_outlier_players_count: {len(old_time_played_outlier_player_ids)}",
        f"new_time_played_outlier_players_count: {len(new_time_played_outlier_player_ids)}",
        "old_time_played_outlier_player_ids: "
        + (", ".join(sorted(old_time_played_outlier_player_ids)) if old_time_played_outlier_player_ids else "none"),
        "new_time_played_outlier_player_ids: "
        + (", ".join(sorted(new_time_played_outlier_player_ids)) if new_time_played_outlier_player_ids else "none"),
        f"old_median_highest_level: {old_stats['highest_level_completed'].median() if len(old_stats) else 0}",
        f"new_median_highest_level: {new_stats['highest_level_completed'].median() if len(new_stats) else 0}",
        f"old_median_levels_completed_count: {old_stats['levels_completed_count'].median() if len(old_stats) else 0}",
        f"new_median_levels_completed_count: {new_stats['levels_completed_count'].median() if len(new_stats) else 0}",
        f"time_played_comparison_chart: {(outdir / 'retention_curve_time_played_minutes.png').name}",
        f"time_played_first_30_minutes_comparison_chart: {(outdir / 'retention_curve_time_played_minutes_first_30.png').name}",
        f"time_played_outliers_removed_comparison_chart: {(outdir / 'retention_curve_time_played_minutes_outliers_removed.png').name}",
        f"time_played_outliers_removed_first_30_comparison_chart: {(outdir / 'retention_curve_time_played_minutes_outliers_removed_first_30.png').name}",
        f"active_playtime_comparison_chart: {(outdir / 'retention_curve_active_playtime_minutes.png').name}",
        f"active_playtime_first_30_comparison_chart: {(outdir / 'retention_curve_active_playtime_minutes_first_30.png').name}",
        f"active_playtime_outliers_removed_comparison_chart: {(outdir / 'retention_curve_active_playtime_minutes_outliers_removed.png').name}",
        f"active_playtime_outliers_removed_first_30_comparison_chart: {(outdir / 'retention_curve_active_playtime_minutes_outliers_removed_first_30.png').name}",
        f"stats_like_round_time_comparison_chart: {(outdir / 'retention_curve_stats_like_round_time_minutes.png').name}",
        f"stats_like_round_time_first_30_comparison_chart: {(outdir / 'retention_curve_stats_like_round_time_minutes_first_30.png').name}",
        f"stats_like_round_time_outliers_removed_comparison_chart: {(outdir / 'retention_curve_stats_like_round_time_minutes_outliers_removed.png').name}",
        f"stats_like_round_time_outliers_removed_first_30_comparison_chart: {(outdir / 'retention_curve_stats_like_round_time_minutes_outliers_removed_first_30.png').name}",
        "adaptive_group_labels:",
        f"  A: {label_adaptive_group('A')}",
        f"  B: {label_adaptive_group('B')}",
        f"  unassigned: {label_adaptive_group('unassigned')}",
        "",
        "Level 1 feature bar chart definitions:",
        "- started_level_1 = player has any evidence of entering level 1 (attempt row, level_start, level_end, round_complete, or first-level autoplay entry)",
        "- interacted_level_1 = player started level 1 and then reached a level-1 round_complete event, whether that round ended in success or failure",
        f"level_1_feature_bar_chart: {(outdir / 'level_1_feature_bar_comparison.png').name}",
        f"old_started_level_1_pct: {old_level1_features.loc[old_level1_features['feature_key'] == 'started_level_1', 'percent'].iloc[0]:.2f}",
        f"new_started_level_1_pct: {new_level1_features.loc[new_level1_features['feature_key'] == 'started_level_1', 'percent'].iloc[0]:.2f}",
        f"old_interacted_level_1_pct: {old_level1_features.loc[old_level1_features['feature_key'] == 'interacted_level_1', 'percent'].iloc[0]:.2f}",
        f"new_interacted_level_1_pct: {new_level1_features.loc[new_level1_features['feature_key'] == 'interacted_level_1', 'percent'].iloc[0]:.2f}",
        f"level_1_onboarding_funnel_chart: {(outdir / 'level_1_onboarding_funnel_comparison.png').name}",
        f"old_completed_level_1_pct: {old_level1_onboarding.loc[old_level1_onboarding['feature_key'] == 'completed_level_1', 'percent'].iloc[0]:.2f}",
        f"new_completed_level_1_pct: {new_level1_onboarding.loc[new_level1_onboarding['feature_key'] == 'completed_level_1', 'percent'].iloc[0]:.2f}",
        f"old_attempted_level_2_pct: {old_level1_onboarding.loc[old_level1_onboarding['feature_key'] == 'attempted_level_2', 'percent'].iloc[0]:.2f}",
        f"new_attempted_level_2_pct: {new_level1_onboarding.loc[new_level1_onboarding['feature_key'] == 'attempted_level_2', 'percent'].iloc[0]:.2f}",
        f"early_level_completion_chart: {(outdir / 'early_level_completion_comparison.png').name}",
        f"old_completed_level_3_pct: {old_early_completion.loc[old_early_completion['feature_key'] == 'completed_level_3', 'percent'].iloc[0]:.2f}",
        f"new_completed_level_3_pct: {new_early_completion.loc[new_early_completion['feature_key'] == 'completed_level_3', 'percent'].iloc[0]:.2f}",
        f"level_1_player_flow_chart: {(outdir / 'level_1_player_flow_comparison.png').name}",
        f"old_quit_before_l1_pct: {old_level1_flow.loc[old_level1_flow['feature_key'] == 'quit_before_l1', 'percent'].iloc[0]:.2f}",
        f"new_quit_before_l1_pct: {new_level1_flow.loc[new_level1_flow['feature_key'] == 'quit_before_l1', 'percent'].iloc[0]:.2f}",
        f"old_started_l1_quit_before_finish_pct: {old_level1_flow.loc[old_level1_flow['feature_key'] == 'started_l1_quit_before_finish', 'percent'].iloc[0]:.2f}",
        f"new_started_l1_quit_before_finish_pct: {new_level1_flow.loc[new_level1_flow['feature_key'] == 'started_l1_quit_before_finish', 'percent'].iloc[0]:.2f}",
        f"old_adaptive_unassigned_players: {old_adaptive_counts['unassigned']}",
        f"old_adaptive_b_players: {old_adaptive_counts['B']}",
        f"old_adaptive_a_players: {old_adaptive_counts['A']}",
        f"new_adaptive_unassigned_players: {new_adaptive_counts['unassigned']}",
        f"new_adaptive_b_players: {new_adaptive_counts['B']}",
        f"new_adaptive_a_players: {new_adaptive_counts['A']}",
        f"old_adaptive_unassigned_players_outliers_removed: {old_adaptive_counts_outliers_removed['unassigned']}",
        f"old_adaptive_b_players_outliers_removed: {old_adaptive_counts_outliers_removed['B']}",
        f"old_adaptive_a_players_outliers_removed: {old_adaptive_counts_outliers_removed['A']}",
        f"new_adaptive_unassigned_players_outliers_removed: {new_adaptive_counts_outliers_removed['unassigned']}",
        f"new_adaptive_b_players_outliers_removed: {new_adaptive_counts_outliers_removed['B']}",
        f"new_adaptive_a_players_outliers_removed: {new_adaptive_counts_outliers_removed['A']}",
        f"adaptive_time_comparison_graph: {(outdir / 'adaptive_group_retention_by_time_comparison.png').name}",
        f"adaptive_time_first_30_comparison_graph: {(outdir / 'adaptive_group_retention_by_time_comparison_first_30.png').name}",
        f"adaptive_time_comparison_by_group_graph: {(outdir / 'adaptive_group_retention_by_time_comparison_by_group.png').name}",
        f"adaptive_time_first_30_comparison_by_group_graph: {(outdir / 'adaptive_group_retention_by_time_comparison_by_group_first_30.png').name}",
        f"adaptive_time_outliers_removed_comparison_graph: {(outdir / 'adaptive_group_retention_by_time_comparison_outliers_removed.png').name}",
        f"adaptive_time_outliers_removed_first_30_comparison_graph: {(outdir / 'adaptive_group_retention_by_time_comparison_outliers_removed_first_30.png').name}",
        f"adaptive_time_outliers_removed_comparison_by_group_graph: {(outdir / 'adaptive_group_retention_by_time_comparison_outliers_removed_by_group.png').name}",
        f"adaptive_time_outliers_removed_first_30_comparison_by_group_graph: {(outdir / 'adaptive_group_retention_by_time_comparison_outliers_removed_by_group_first_30.png').name}",
        f"adaptive_time_all_players_comparison_graph: {(outdir / 'adaptive_group_retention_by_time_all_players_comparison.png').name}",
        f"adaptive_time_all_players_first_30_comparison_graph: {(outdir / 'adaptive_group_retention_by_time_all_players_comparison_first_30.png').name}",
        f"adaptive_time_all_players_comparison_by_group_graph: {(outdir / 'adaptive_group_retention_by_time_all_players_comparison_by_group.png').name}",
        f"adaptive_time_all_players_first_30_comparison_by_group_graph: {(outdir / 'adaptive_group_retention_by_time_all_players_comparison_by_group_first_30.png').name}",
        f"adaptive_time_all_players_outliers_removed_comparison_graph: {(outdir / 'adaptive_group_retention_by_time_all_players_comparison_outliers_removed.png').name}",
        f"adaptive_time_all_players_outliers_removed_first_30_comparison_graph: {(outdir / 'adaptive_group_retention_by_time_all_players_comparison_outliers_removed_first_30.png').name}",
        f"adaptive_time_all_players_outliers_removed_comparison_by_group_graph: {(outdir / 'adaptive_group_retention_by_time_all_players_comparison_outliers_removed_by_group.png').name}",
        f"adaptive_time_all_players_outliers_removed_first_30_comparison_by_group_graph: {(outdir / 'adaptive_group_retention_by_time_all_players_comparison_outliers_removed_by_group_first_30.png').name}",
    ]
    (outdir / "summary.txt").write_text("\n".join(map(str, summary)) + "\n", encoding="utf-8")
    old_stats.to_csv(outdir / "old_version_player_stats.csv", index=False)
    new_stats.to_csv(outdir / "new_version_player_stats.csv", index=False)
    old_stats_outliers_removed.to_csv(outdir / "old_version_player_stats_outliers_removed.csv", index=False)
    new_stats_outliers_removed.to_csv(outdir / "new_version_player_stats_outliers_removed.csv", index=False)
    old_level1_features.assign(version=args.old_version).to_csv(outdir / "old_version_level_1_feature_rates.csv", index=False)
    new_level1_features.assign(version=args.new_version).to_csv(outdir / "new_version_level_1_feature_rates.csv", index=False)
    old_level1_onboarding.assign(version=args.old_version).to_csv(outdir / "old_version_level_1_onboarding_rates.csv", index=False)
    new_level1_onboarding.assign(version=args.new_version).to_csv(outdir / "new_version_level_1_onboarding_rates.csv", index=False)
    old_early_completion.assign(version=args.old_version).to_csv(outdir / "old_version_early_level_completion_rates.csv", index=False)
    new_early_completion.assign(version=args.new_version).to_csv(outdir / "new_version_early_level_completion_rates.csv", index=False)
    old_level1_flow.assign(version=args.old_version).to_csv(outdir / "old_version_level_1_player_flow_rates.csv", index=False)
    new_level1_flow.assign(version=args.new_version).to_csv(outdir / "new_version_level_1_player_flow_rates.csv", index=False)

    print(f"Comparison complete. Outputs written to: {outdir}")


if __name__ == "__main__":
    main()
