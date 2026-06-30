import logging
import asyncio
from fastapi import FastAPI
from src.config.db import engine, Base
from src.controllers import notificationController
from src.services.kafkaConsumer import consume_events

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("notification-main")

# Auto-create tables (SQLite/PostgreSQL)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ShopNow Notification Service", version="1.0.0")

# Include controller routers
app.include_router(notificationController.router)

# Health endpoint for Kubernetes liveness/readiness check
@app.get("/actuator/health")
def health():
    return {"status": "UP"}

# Background task reference
consumer_task = None

@app.on_event("startup")
async def startup_event():
    global consumer_task
    logger.info("Initializing background event listeners...")
    consumer_task = asyncio.create_task(consume_events())

@app.on_event("shutdown")
async def shutdown_event():
    if consumer_task:
        consumer_task.cancel()
        logger.info("Background event listeners terminated.")
