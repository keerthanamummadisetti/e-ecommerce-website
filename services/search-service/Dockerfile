FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim
WORKDIR /app

RUN groupadd -r shopnow && useradd -r -g shopnow shopnow

COPY --from=builder --chown=shopnow:shopnow /opt/venv /opt/venv
COPY --chown=shopnow:shopnow . .

ENV PATH="/opt/venv/bin:$PATH"

USER shopnow

EXPOSE 8088

ENV PORT=8088

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8088"]