import logging
import asyncio
from fastapi import FastAPI
from src.config.db import connect_redis
from src.controllers import searchController
from src.services.kafkaConsumer import consume_events

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("search-main")

app = FastAPI(title="ShopNow Search & Discovery Service", version="1.0.0")

app.include_router(searchController.router)

# Health endpoint for Kubernetes check
@app.get("/actuator/health")
def health():
    return {"status": "UP"}

# Background task reference
consumer_task = None

@app.on_event("startup")
async def startup_event():
    global consumer_task
    logger.info("Initializing search Redis connections and event listeners...")
    await connect_redis()
    consumer_task = asyncio.create_task(consume_events())

@app.on_event("shutdown")
async def shutdown_event():
    if consumer_task:
        consumer_task.cancel()
        logger.info("Background event sync listeners terminated.")
