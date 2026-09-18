# Education Portfolio AI

Лендинг-презентация для хакатона по концепции **Education Portfolio AI** — образование
как инвестиционный портфель.

Идея: вместо одной рискованной «ставки» на один ВУЗ пользователь собирает
сбалансированный образовательный портфель из активов (целевые ВУЗы, стажировки,
олимпиады, курсы), каждый из которых оценивается ИИ по стоимости, риску и доходности.

## Структура сайта

- Проблематика поступления
- Классификация активов (Core / Growth / High-Yield / Hedge)
- AI-метрики (Capital & Effort, Win Rate, ROE, Academic Volatility)
- Путь пользователя (7 шагов: анкета → диагностика → рекомендации → дорожная карта)
- Сравнение стратегий («Агрессивная» vs «Сбалансированная»)
- Почему идея работает для хакатона

## Запуск локально

Flask-сервер раздаёт и статический фронтенд, и `/api/*` — поднимать нужно только один процесс.

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example ../.env      # впишите свой GEMINI_API_KEY в .env
python app.py                   # поднимется на http://localhost:5001
```

Откройте `http://localhost:5001` — увидите и лендинг, и рабочую секцию «AI-демо».
`.env` не коммитится в репозиторий (см. `.gitignore`) — ключ Gemini хранится только локально.

Без backend'а сайт тоже можно открыть как статику (просто [index.html](index.html) в браузере
или `npx serve .`) — тогда всё, кроме секции «AI-демо», работает как обычно.

## Деплой на Render

В репозитории есть `render.yaml` (Blueprint) — один web-сервис на Python, который отдаёт
и фронтенд, и `/api/analyze`.

1. На [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint** → выбрать этот репозиторий.
2. Render прочитает `render.yaml` и создаст сервис `education-portfolio-ai` (root: `backend`,
   `gunicorn app:app`, план Free).
3. В настройках сервиса → **Environment** задать `GEMINI_API_KEY` (не коммитится, только через Render UI).
4. Дождаться деплоя — сайт будет доступен по адресу вида `https://education-portfolio-ai.onrender.com`.

## Стек

- Frontend: чистые HTML / CSS / JS, без сборщиков и внешних библиотек
- Backend: Python (Flask + gunicorn) + Gemini API (`google-generativeai`)
- Деплой: Render (единый web-сервис, `render.yaml`)
