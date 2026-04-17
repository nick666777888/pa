"""备忘录 API。"""
from flask import Blueprint, jsonify, request

from app.database import get_db, utc_now_iso
from app.models import row_to_memo

bp = Blueprint("memos", __name__)


@bp.get("/api/memos")
def list_memos():
    db = get_db()
    rows = db.execute(
        "SELECT id, title, body, important, created_at, updated_at FROM memos ORDER BY important DESC, updated_at DESC"
    ).fetchall()
    return jsonify([row_to_memo(r) for r in rows])


@bp.post("/api/memos")
def create_memo():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    body = (data.get("body") or "").strip()
    if not title and not body:
        return jsonify({"error": "title or body is required"}), 400
    now = utc_now_iso()
    important = 1 if data.get("important") else 0
    db = get_db()
    cur = db.execute(
        "INSERT INTO memos (title, body, important, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (title, body, important, now, now),
    )
    db.commit()
    row = db.execute(
        "SELECT id, title, body, important, created_at, updated_at FROM memos WHERE id = ?",
        (cur.lastrowid,),
    ).fetchone()
    return jsonify(row_to_memo(row)), 201


@bp.get("/api/memos/<int:memo_id>")
def get_memo(memo_id: int):
    db = get_db()
    row = db.execute(
        "SELECT id, title, body, important, created_at, updated_at FROM memos WHERE id = ?",
        (memo_id,),
    ).fetchone()
    if row is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(row_to_memo(row))


@bp.patch("/api/memos/<int:memo_id>")
@bp.put("/api/memos/<int:memo_id>")
def update_memo(memo_id: int):
    db = get_db()
    row = db.execute("SELECT id FROM memos WHERE id = ?", (memo_id,)).fetchone()
    if row is None:
        return jsonify({"error": "not found"}), 404
    data = request.get_json(silent=True) or {}
    title = data.get("title")
    body = data.get("body")
    important = data.get("important")
    if title is None and body is None and important is None:
        return jsonify({"error": "no fields to update"}), 400
    cur = db.execute(
        "SELECT title, body, important FROM memos WHERE id = ?",
        (memo_id,),
    ).fetchone()
    new_title = cur["title"] if title is None else str(title).strip()
    new_body = cur["body"] if body is None else str(body).strip()
    new_imp = cur["important"] if important is None else (1 if important else 0)
    now = utc_now_iso()
    db.execute(
        "UPDATE memos SET title = ?, body = ?, important = ?, updated_at = ? WHERE id = ?",
        (new_title, new_body, new_imp, now, memo_id),
    )
    db.commit()
    updated = db.execute(
        "SELECT id, title, body, important, created_at, updated_at FROM memos WHERE id = ?",
        (memo_id,),
    ).fetchone()
    return jsonify(row_to_memo(updated))


@bp.delete("/api/memos/<int:memo_id>")
def delete_memo(memo_id: int):
    db = get_db()
    cur = db.execute("DELETE FROM memos WHERE id = ?", (memo_id,))
    db.commit()
    if cur.rowcount == 0:
        return jsonify({"error": "not found"}), 404
    return "", 204
