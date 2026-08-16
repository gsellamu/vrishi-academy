# Build context = PrepPractices repo root (see academy-compose.yml)
FROM python:3.11-slim
WORKDIR /app
COPY services/academy-orchestrator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY packages/session-templates /app/packages/session-templates
COPY services/academy-orchestrator/main.py .
RUN adduser --disabled-password --gecos "" --uid 1001 academy
USER academy
ENV SESSION_TEMPLATE_DIR=/app/packages/session-templates
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
