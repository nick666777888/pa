"""任务管理 API。"""
from flask import Blueprint, jsonify, request

from app.config import VALID_DIFFICULTY, VALID_STATUS, VALID_TASK_TYPES, VALID_URGENCY
from app.database import bump_stats, get_db, utc_now_iso
from app.models import row_to_task, task_advice, task_sort_key

bp = Blueprint("tasks", __name__)


@bp.get("/api/tasks")
def list_tasks():
    db = get_db()
    rows = db.execute(
        "SELECT id, name, task_type, urgency, difficulty, status, created_at, updated_at FROM tasks"
    ).fetchall()
    rows_sorted = sorted(rows, key=task_sort_key)
    items = []
    for r in rows_sorted:
        t = row_to_task(r)
        t["advice"] = task_advice(t["urgency"], t["difficulty"])
        items.append(t)
    return jsonify(items)


@bp.post("/api/tasks")
def create_task():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    task_type = data.get("task_type") or "other"
    urgency = data.get("urgency") or "medium"
    difficulty = data.get("difficulty") or "medium"
    if task_type not in VALID_TASK_TYPES:
        return jsonify({"error": "invalid task_type"}), 400
    if urgency not in VALID_URGENCY:
        return jsonify({"error": "invalid urgency"}), 400
    if difficulty not in VALID_DIFFICULTY:
        return jsonify({"error": "invalid difficulty"}), 400
    now = utc_now_iso()
    db = get_db()
    cur = db.execute(
        """
        INSERT INTO tasks (name, task_type, urgency, difficulty, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
        """,
        (name, task_type, urgency, difficulty, now, now),
    )
    db.commit()
    row = db.execute(
        "SELECT id, name, task_type, urgency, difficulty, status, created_at, updated_at FROM tasks WHERE id = ?",
        (cur.lastrowid,),
    ).fetchone()
    out = row_to_task(row)
    out["advice"] = task_advice(out["urgency"], out["difficulty"])
    return jsonify(out), 201


@bp.post("/api/tasks/from-memo")
def task_from_memo():
    data = request.get_json(silent=True) or {}
    memo_id = data.get("memo_id")
    if memo_id is None:
        return jsonify({"error": "memo_id required"}), 400
    db = get_db()
    row = db.execute("SELECT id, title, body FROM memos WHERE id = ?", (int(memo_id),)).fetchone()
    if row is None:
        return jsonify({"error": "memo not found"}), 404
    name = (row["title"] or row["body"] or "备忘任务").strip()[:200]
    task_type = data.get("task_type") or "other"
    urgency = data.get("urgency") or "medium"
    difficulty = data.get("difficulty") or "medium"
    if task_type not in VALID_TASK_TYPES or urgency not in VALID_URGENCY or difficulty not in VALID_DIFFICULTY:
        return jsonify({"error": "invalid task fields"}), 400
    now = utc_now_iso()
    cur = db.execute(
        """
        INSERT INTO tasks (name, task_type, urgency, difficulty, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
        """,
        (name, task_type, urgency, difficulty, now, now),
    )
    db.commit()
    tid = cur.lastrowid
    trow = db.execute(
        "SELECT id, name, task_type, urgency, difficulty, status, created_at, updated_at FROM tasks WHERE id = ?",
        (tid,),
    ).fetchone()
    out = row_to_task(trow)
    out["advice"] = task_advice(out["urgency"], out["difficulty"])
    return jsonify(out), 201


@bp.patch("/api/tasks/<int:task_id>")
def patch_task(task_id: int):
    data = request.get_json(silent=True) or {}
    db = get_db()
    row = db.execute(
        "SELECT id, name, task_type, urgency, difficulty, status FROM tasks WHERE id = ?",
        (task_id,),
    ).fetchone()
    if row is None:
        return jsonify({"error": "not found"}), 404
    fields = []
    vals: list = []
    if "name" in data:
        fields.append("name = ?")
        vals.append(str(data["name"]).strip())
    if "task_type" in data:
        if data["task_type"] not in VALID_TASK_TYPES:
            return jsonify({"error": "invalid task_type"}), 400
        fields.append("task_type = ?")
        vals.append(data["task_type"])
    if "urgency" in data:
        if data["urgency"] not in VALID_URGENCY:
            return jsonify({"error": "invalid urgency"}), 400
        fields.append("urgency = ?")
        vals.append(data["urgency"])
    if "difficulty" in data:
        if data["difficulty"] not in VALID_DIFFICULTY:
            return jsonify({"error": "invalid difficulty"}), 400
        fields.append("difficulty = ?")
        vals.append(data["difficulty"])
    if "status" in data:
        if data["status"] not in VALID_STATUS:
            return jsonify({"error": "invalid status"}), 400
        fields.append("status = ?")
        vals.append(data["status"])
    if not fields:
        return jsonify({"error": "no fields"}), 400
    fields.append("updated_at = ?")
    vals.append(utc_now_iso())
    vals.append(task_id)
    db.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?", vals)
    db.commit()
    was_done = row["status"] != "done" and data.get("status") == "done"
    if was_done:
        bump_stats(db, tasks=1)
    nrow = db.execute(
        "SELECT id, name, task_type, urgency, difficulty, status, created_at, updated_at FROM tasks WHERE id = ?",
        (task_id,),
    ).fetchone()
    out = row_to_task(nrow)
    out["advice"] = task_advice(out["urgency"], out["difficulty"])
    return jsonify(out)


@bp.delete("/api/tasks/<int:task_id>")
def delete_task(task_id: int):
    db = get_db()
    cur = db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    db.commit()
    if cur.rowcount == 0:
        return jsonify({"error": "not found"}), 404
    return "", 204
