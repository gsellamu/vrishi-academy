# Build context = PrepPractices repo root (see academy-compose.yml)
FROM python:3.11-slim

RUN groupadd -r academy && useradd -r -g academy -d /app -s /sbin/nologin academy

WORKDIR /app
COPY services/academy-grader-svc/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/academy_shared/ /app/academy_shared/
COPY services/academy-grader-svc/main.py .

RUN chown -R academy:academy /app
USER academy

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
