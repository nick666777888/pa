"""每日统计 API。"""
from datetime import date, timedelta

from flask import Blueprint, jsonify, request

from app.database import bump_stats, get_db, today_key

bp = Blueprint("stats", __name__)


@bp.get("/api/stats/today")
def stats_today():
    db = get_db()
    day = today_key()
    row = db.execute(
        "SELECT day, focus_seconds, tasks_completed, pomodoros FROM daily_stats WHERE day = ?",
        (day,),
    ).fetchone()
    if row is None:
        return jsonify({"day": day, "focus_seconds": 0, "tasks_completed": 0, "pomodoros": 0})
    return jsonify(
        {
            "day": row["day"],
            "focus_seconds": row["focus_seconds"],
            "tasks_completed": row["tasks_completed"],
            "pomodoros": row["pomodoros"],
        }
    )


@bp.get("/api/stats/history")
def stats_history():
    days = request.args.get("days", 7, type=int)
    days = max(1, min(days, 90))
    today = date.today()
    start = (today - timedelta(days=days - 1)).isoformat()
    db = get_db()
    rows = db.execute(
        "SELECT day, focus_seconds, tasks_completed, pomodoros FROM daily_stats WHERE day >= ? ORDER BY day",
        (start,),
    ).fetchall()
    data_map = {
        r["day"]: {
            "day": r["day"],
            "focus_seconds": r["focus_seconds"],
            "tasks_completed": r["tasks_completed"],
            "pomodoros": r["pomodoros"],
        }
        for r in rows
    }
    result = []
    for i in range(days):
        d = (today - timedelta(days=days - 1 - i)).isoformat()
        result.append(data_map.get(d, {"day": d, "focus_seconds": 0, "tasks_completed": 0, "pomodoros": 0}))
    return jsonify(result)


@bp.post("/api/stats/event")
def stats_event():
    data = request.get_json(silent=True) or {}
    typ = data.get("type")
    db = get_db()
    if typ == "pomodoro_complete":
        seconds = int(data.get("focus_seconds") or 0)
        bump_stats(db, focus_seconds=max(0, seconds), pomos=1)
    else:
        return jsonify({"error": "unknown type"}), 400
    return jsonify({"ok": True})


@bp.get("/api/health")
def health():
    return jsonify({"ok": True})
