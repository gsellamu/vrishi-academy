# Build context = PrepPractices repo root (see academy-compose.yml)
FROM python:3.11-slim
WORKDIR /app
COPY services/academy-orchestrator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY packages/session-templates /app/packages/session-templates
COPY services/academy-orchestrator/main.py .
ENV SESSION_TEMPLATE_DIR=/app/packages/session-templates
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
