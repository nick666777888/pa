"""启动入口。

用法：
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    python run.py
"""
from app import create_app

app = create_app()

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)
