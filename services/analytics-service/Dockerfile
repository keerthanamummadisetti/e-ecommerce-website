# Stage 1: Build
FROM python:3.12-alpine AS builder
WORKDIR /app
COPY requirements.txt .
RUN apk add --no-cache gcc musl-dev postgresql-dev g++
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-alpine
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
# Run as non-root user
RUN addgroup -S shopnow && adduser -S shopnow -G shopnow
USER shopnow
EXPOSE 8090
ENV PORT=8090
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8090"]
