"""伴学话术 API。"""
import random

from flask import Blueprint, jsonify, request

from app.companion import anxiety_system_tip, companion_lines, pick_companion
from app.database import get_db
from app.models import load_settings

bp = Blueprint("companion", __name__)


@bp.post("/api/companion/reply")
def companion_reply():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    mode = data.get("mode") or "chat"
    db = get_db()
    rel = load_settings(db).get("relationship", "bestie")
    if mode == "anxiety":
        if not message:
            return jsonify({"error": "message required"}), 400
        reply = pick_companion(rel, "anxiety", message)
        return jsonify({"reply": reply, "tip": anxiety_system_tip()})
    if not message:
        return jsonify({"error": "message required"}), 400
    reply = pick_companion(rel, "chat", message)
    return jsonify({"reply": reply})


@bp.post("/api/companion/tap")
def companion_tap():
    db = get_db()
    rel = load_settings(db).get("relationship", "bestie")
    line = random.choice(companion_lines()[rel]["tap"])
    return jsonify({"reply": line})
