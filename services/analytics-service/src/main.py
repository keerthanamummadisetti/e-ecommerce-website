import logging
import asyncio
from fastapi import FastAPI
from src.config.db import connect_analytics_db
from src.controllers import analyticsController
from src.services.kafkaConsumer import consume_events

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("analytics-main")

app = FastAPI(title="ShopNow Analytics Service", version="1.0.0")

app.include_router(analyticsController.router)

# Health check endpoint
@app.get("/actuator/health")
def health():
    return {"status": "UP"}

# Background task reference
consumer_task = None

@app.on_event("startup")
async def startup_event():
    global consumer_task
    logger.info("Initializing analytics database and consumer thread...")
    connect_analytics_db()
    consumer_task = asyncio.create_task(consume_events())

@app.on_event("shutdown")
async def shutdown_event():
    if consumer_task:
        consumer_task.cancel()
        logger.info("Background consumer threads terminated.")
