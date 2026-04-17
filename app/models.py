"""数据行转换、排序逻辑、任务建议。"""
from __future__ import annotations

import sqlite3

from app.config import DEFAULT_SETTINGS, VALID_RELATIONSHIPS, VALID_SCENES


def row_to_memo(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "body": row["body"],
        "important": bool(row["important"]) if "important" in row.keys() else False,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def row_to_task(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "task_type": row["task_type"],
        "urgency": row["urgency"],
        "difficulty": row["difficulty"],
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def task_sort_key(row: sqlite3.Row) -> tuple:
    status_order = {"pending": 0, "in_progress": 1, "done": 2}
    urg = {"high": 3, "medium": 2, "low": 1}.get(row["urgency"], 1)
    diff = {"hard": 3, "medium": 2, "easy": 1}.get(row["difficulty"], 2)
    st = status_order.get(row["status"], 0)
    if st >= 2:
        return (2, 0, 0, row["updated_at"])
    return (st, -urg, -diff, row["updated_at"])


def task_advice(urgency: str, difficulty: str) -> str:
    tips = {
        ("high", "hard"): "高紧急且偏难：先拆成 3 段，配合番茄钟专注攻克第一段。",
        ("high", "medium"): "紧急中等难度：建议集中 45 分钟内一口气推进。",
        ("high", "easy"): "紧急且不难：快速批量清掉，给后面的大块任务腾时间。",
        ("medium", "hard"): "难度偏高：每天啃一小块，别想着一次吃完。",
        ("medium", "medium"): "稳步推进：完成一个勾一个，积累掌控感。",
        ("medium", "easy"): "顺手任务：穿插在两项重任务之间当缓冲。",
        ("low", "hard"): "低紧急高难度：放到精力最好的时段慢慢磨。",
        ("low", "medium"): "不着急：列进周计划，避免占用当下黄金时间。",
        ("low", "easy"): "调剂型任务：学累了再做，当作奖励。",
    }
    return tips.get((urgency, difficulty), "先开始 5 分钟，动起来最难的是起步。")


def load_settings(db: sqlite3.Connection) -> dict:
    out = dict(DEFAULT_SETTINGS)
    rows = db.execute("SELECT key, value FROM settings").fetchall()
    for r in rows:
        k, v = r["key"], r["value"]
        if k in ("night_mode",):
            out[k] = v in ("1", "true", "True", "yes")
        elif k in ("pomodoro_work_minutes", "pomodoro_break_minutes"):
            try:
                out[k] = int(v)
            except ValueError:
                pass
        elif k in out:
            out[k] = v
    return out


def save_settings(db: sqlite3.Connection, data: dict) -> dict:
    cur = load_settings(db)
    for key, val in data.items():
        if key not in cur:
            continue
        if key == "night_mode":
            sval = "1" if bool(val) else "0"
        elif key in ("pomodoro_work_minutes", "pomodoro_break_minutes"):
            sval = str(int(val))
        else:
            sval = str(val)
        if key == "relationship" and sval not in VALID_RELATIONSHIPS:
            continue
        if key == "scene" and sval not in VALID_SCENES:
            continue
        if key == "avatar_style" and sval not in ("2d", "3d"):
            continue
        if key == "music_mood" and sval not in ("focus", "calm", "energy"):
            continue
        db.execute(
            "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, sval),
        )
    db.commit()
    return load_settings(db)
