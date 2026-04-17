"""用户偏好 API。"""
from flask import Blueprint, jsonify, request

from app.config import DEFAULT_SETTINGS
from app.database import get_db
from app.models import load_settings, save_settings

bp = Blueprint("settings", __name__)


@bp.get("/api/settings")
def get_settings():
    return jsonify(load_settings(get_db()))


@bp.patch("/api/settings")
def patch_settings():
    data = request.get_json(silent=True) or {}
    allowed = {k: data[k] for k in DEFAULT_SETTINGS if k in data}
    if not allowed:
        return jsonify({"error": "no valid fields"}), 400
    return jsonify(save_settings(get_db(), allowed))
