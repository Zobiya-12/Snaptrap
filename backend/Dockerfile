# ═══════════════════════════════════════════════════════════════
#  SNAPTRAP Backend — used by both api and honeypot services
#  Python 3.11-slim keeps the image small (~200MB)
# ═══════════════════════════════════════════════════════════════

FROM python:3.11-slim

# System deps — psycopg2 needs libpq
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        gcc \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer caching — only re-runs if requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend source
COPY . .

# Create directories that the app expects
RUN mkdir -p /app/models /app/data

# Copy entrypoint scripts and make them executable
COPY entrypoint.sh entrypoint-honeypot.sh ./
RUN chmod +x entrypoint.sh entrypoint-honeypot.sh

# Hosted platforms: unbuffered logs + the port app.py listens on (it reads FLASK_PORT, not PORT)
ENV PYTHONUNBUFFERED=1 \
    FLASK_PORT=5000
EXPOSE 5000

# Default entrypoint — overridden per service in docker-compose
ENTRYPOINT ["./entrypoint.sh"]
