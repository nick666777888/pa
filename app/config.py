"""应用配置与验证常量。"""
from __future__ import annotations

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "memos.db"

VALID_RELATIONSHIPS = frozenset({"brother", "bestie", "partner", "senior"})
VALID_SCENES = frozenset({"study", "bedroom", "living"})
VALID_TASK_TYPES = frozenset({"homework", "review", "hobby", "other"})
VALID_URGENCY = frozenset({"high", "medium", "low"})
VALID_DIFFICULTY = frozenset({"easy", "medium", "hard"})
VALID_STATUS = frozenset({"pending", "in_progress", "done"})

DEFAULT_SETTINGS = {
    "relationship": "bestie",
    "scene": "study",
    "avatar_style": "2d",
    "night_mode": False,
    "pomodoro_work_minutes": 25,
    "pomodoro_break_minutes": 5,
    "music_mood": "focus",
}
