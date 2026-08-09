# Build context = PrepPractices repo root (see academy-compose.yml)
FROM python:3.11-slim
WORKDIR /app
COPY services/persona-svc/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/persona-svc/main.py .
COPY services/persona-svc/personas /app/personas
ENV PERSONA_DIR=/app/personas
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
