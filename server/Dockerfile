FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:0.8.0 /uv /bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY agent.py main.py knowledge.md ./
EXPOSE 8080
CMD ["uv", "run", "--no-sync", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
