# =========================
# Stage 1: Builder
# =========================
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip
RUN pip install --upgrade pip

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# =========================
# Stage 2: Runtime
# =========================
FROM python:3.12-slim

WORKDIR /app

# Install runtime dependency
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r shopnow && useradd -r -g shopnow shopnow

# Copy virtual environment
COPY --from=builder --chown=shopnow:shopnow /opt/venv /opt/venv

# Copy application
COPY --chown=shopnow:shopnow . .

ENV PATH="/opt/venv/bin:$PATH"

USER shopnow

EXPOSE 8090

ENV PORT=8090

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8090"]