import json
import os
import re

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

import google.generativeai as genai

load_dotenv()

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set. Copy .env.example to .env and fill it in.")

genai.configure(api_key=API_KEY)
MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")

app = Flask(__name__)
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


@app.route("/api/analyze", methods=["POST"])
def analyze():
    profile = request.get_json(silent=True) or {}

    required = ["grade", "gpa", "language_level", "budget", "hours_per_week", "target_country", "target_field"]
    missing = [f for f in required if not profile.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    prompt = PROMPT_TEMPLATE.format(**profile)

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)
        data = extract_json(response.text)
    except (json.JSONDecodeError, ValueError) as exc:
        return jsonify({"error": f"Model returned invalid JSON: {exc}"}), 502
    except Exception as exc:  # network / auth / quota errors from the Gemini SDK
        return jsonify({"error": f"Gemini request failed: {exc}"}), 502

    return jsonify(data)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME})


if __name__ == "__main__":
    app.run(debug=True, port=5001)
