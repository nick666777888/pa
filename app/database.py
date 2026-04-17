"""数据库初始化、连接管理、迁移。"""
from __future__ import annotations

import sqlite3
from contextlib import closing
from datetime import date, datetime, timezone

from flask import g

from app.config import DB_PATH


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def today_key() -> str:
    return date.today().isoformat()


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(_exc=None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def _migrate(conn: sqlite3.Connection) -> None:
    cols = {r[1] for r in conn.execute("PRAGMA table_info(memos)").fetchall()}
    if "important" not in cols:
        conn.execute("ALTER TABLE memos ADD COLUMN important INTEGER NOT NULL DEFAULT 0")


def init_db() -> None:
    with closing(sqlite3.connect(DB_PATH)) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS memos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL DEFAULT '',
                body TEXT NOT NULL DEFAULT '',
                important INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                task_type TEXT NOT NULL DEFAULT 'other',
                urgency TEXT NOT NULL DEFAULT 'medium',
                difficulty TEXT NOT NULL DEFAULT 'medium',
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS daily_stats (
                day TEXT PRIMARY KEY,
                focus_seconds INTEGER NOT NULL DEFAULT 0,
                tasks_completed INTEGER NOT NULL DEFAULT 0,
                pomodoros INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.commit()
        _migrate(conn)
        conn.commit()


def bump_stats(db: sqlite3.Connection, *, focus_seconds: int = 0, tasks: int = 0, pomos: int = 0) -> None:
    day = today_key()
    db.execute(
        """
        INSERT INTO daily_stats(day, focus_seconds, tasks_completed, pomodoros)
        VALUES(?, ?, ?, ?)
        ON CONFLICT(day) DO UPDATE SET
          focus_seconds = focus_seconds + excluded.focus_seconds,
          tasks_completed = tasks_completed + excluded.tasks_completed,
          pomodoros = pomodoros + excluded.pomodoros
        """,
        (day, focus_seconds, tasks, pomos),
    )
    db.commit()
