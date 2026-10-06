FROM python:3.12-slim
WORKDIR /app

COPY services/academy_shared/ /app/academy_shared/
COPY services/academy-builder-svc/requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY services/academy-builder-svc/ /app/
COPY scripts/generate_client_docs.py /app/
COPY scripts/session_prep.py /app/

ENV PORT=8000
EXPOSE 8000
CMD ["python", "main.py"]
