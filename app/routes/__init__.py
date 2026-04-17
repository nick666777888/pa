"""注册所有蓝图。"""
from __future__ import annotations

from flask import Flask


def register_routes(app: Flask) -> None:
    from app.routes.companion import bp as companion_bp
    from app.routes.main import bp as main_bp
    from app.routes.memos import bp as memos_bp
    from app.routes.settings import bp as settings_bp
    from app.routes.stats import bp as stats_bp
    from app.routes.tasks import bp as tasks_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(memos_bp)
    app.register_blueprint(companion_bp)
    app.register_blueprint(stats_bp)
