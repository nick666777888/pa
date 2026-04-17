"""伴学搭子 Flask 应用工厂。"""
from __future__ import annotations

from flask import Flask
from flask_cors import CORS

from app.database import close_db, init_db
from app.routes import register_routes


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.teardown_appcontext(close_db)
    register_routes(app)
    init_db()

    return app
