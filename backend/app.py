import json
import os
import re
import time

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

load_dotenv()

API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

app = Flask(__name__, static_folder=None)
CORS(app)

ASSET_TYPES = ["core", "growth", "high_yield", "hedge"]

PROMPT_TEMPLATE = """
Ты — AI-модуль платформы Education Portfolio, который переносит логику
инвестиционного портфеля на планирование образования и поступления.

Профиль абитуриента:
- Класс/возраст: {grade}
- Средний балл / GPA: {gpa}
- Уровень языка: {language_level}
- Бюджет (USD/мес или всего, как указано): {budget}
- Часы в неделю на подготовку: {hours_per_week}
- Целевая страна/направление: {target_country}
- Целевая специальность/профессия: {target_field}

Классы активов, которые нужно использовать:
- core (Базовые активы): целевые университеты/факультеты
- growth (Активы роста): стажировки, исследования, соц. проекты
- high_yield (Высокодоходные активы): олимпиады, хакатоны
- hedge (Защитные активы): курсы, сертификации, языковые экзамены

Верни СТРОГО валидный JSON без пояснений и без markdown-обёртки, со следующей структурой:
{{
  "diagnosis": "1-2 предложения с оценкой текущего профиля и главным риском",
  "win_rate": <целое число 0-100, общая вероятность успеха портфеля>,
  "assets": [
    {{
      "type": "core|growth|high_yield|hedge",
      "name": "конкретное название (вуз/олимпиада/курс)",
      "risk": <0-100>,
      "roe": <0-100>,
      "effort_hours_per_week": <число>,
      "reason": "почему этот актив снижает риск или повышает доходность портфеля"
    }}
  ],
  "next_step": "одно конкретное действие с дедлайном"
}}

Верни 4-6 активов, старайся закрыть все 4 класса активов хотя бы одним элементом.
"""


def extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    return json.loads(text)


def call_gemini(prompt: str) -> str:
    # thinkingBudget=0 disables extended reasoning: it isn't needed for this
    # structured-JSON task, and Render's ~30s proxy timeout would otherwise
    # kill the request before a "thinking" response finishes (it was taking 30s+).
    attempts = 3
    for attempt in range(attempts):
        resp = requests.post(
            GEMINI_URL,
            params={"key": API_KEY},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"thinkingConfig": {"thinkingBudget": 0}},
            },
            timeout=15,
        )
        # Gemini's shared endpoints occasionally 503/429 under load; retrying
        # briefly clears most of these without risking Render's ~30s timeout.
        if resp.status_code in (429, 503) and attempt < attempts - 1:
            time.sleep(1 + attempt)
            continue
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]


@app.route("/api/analyze", methods=["POST"])
def analyze():
    if not API_KEY:
        return jsonify({"error": "GEMINI_API_KEY is not configured on the server."}), 500

    profile = request.get_json(silent=True) or {}

    required = ["grade", "gpa", "language_level", "budget", "hours_per_week", "target_country", "target_field"]
    missing = [f for f in required if not profile.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    prompt = PROMPT_TEMPLATE.format(**profile)

    try:
        text = call_gemini(prompt)
        data = extract_json(text)
    except (json.JSONDecodeError, ValueError, KeyError, IndexError) as exc:
        return jsonify({"error": f"Model returned invalid JSON: {exc}"}), 502
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 429:
            return jsonify({"error": "Gemini API rate limit reached. Подождите минуту и попробуйте снова."}), 429
        return jsonify({"error": f"Gemini request failed: {exc}"}), 502
    except requests.RequestException as exc:
        return jsonify({"error": f"Gemini request failed: {exc}"}), 502

    return jsonify(data)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME, "gemini_configured": bool(API_KEY)})


@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    debug = os.environ.get("FLASK_DEBUG") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
