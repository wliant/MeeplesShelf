# ── Stage 1: Build React/Vite frontend ───────────────────────────────────────
FROM node:20-alpine AS web-builder

WORKDIR /build/web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ── Stage 2: Python application ───────────────────────────────────────────────
FROM python:3.12-slim AS app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /srv

COPY app/pyproject.toml app/uv.lock ./
RUN uv sync --frozen --no-dev

COPY app/ ./

COPY --from=web-builder /build/web/dist /srv/static

ENV PYTHONPATH=/srv
ENV STATIC_DIR=/srv/static

EXPOSE 8000

CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
