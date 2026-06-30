import os
import json
import asyncio
import logging
from aiokafka import AIOKafkaConsumer
from src.config.db import get_es_client

logger = logging.getLogger("kafka-consumer")

async def consume_events():
    kafka_brokers = os.getenv("KAFKA_BROKERS", "localhost:9092")
    topics = ["product.created", "product.updated"]

    logger.info(f"Connecting to Kafka brokers: {kafka_brokers} to consume product sync events")
    
    # Resilient connection loop
    consumer = None
    while True:
        try:
            consumer = AIOKafkaConsumer(
                *topics,
                bootstrap_servers=kafka_brokers,
                group_id="search-group",
                auto_offset_reset="earliest"
            )
            await consumer.start()
            logger.info("Kafka Search Sync Consumer started successfully.")
            break
        except Exception as e:
            logger.warn(f"Failed to connect to Kafka brokers ({e}). Retrying in 10 seconds...")
            await asyncio.sleep(10)

    es = get_es_client()

    try:
        async for msg in consumer:
            try:
                payload = json.loads(msg.value.decode('utf-8'))
                event_type = msg.topic
                data = payload.get("data", {})
                product_id = data.get("productId")

                if not product_id:
                    continue

                if event_type == "product.created":
                    logger.info(f"Indexing new product in ES: {product_id}")
                    doc = {
                        "name": data.get("name"),
                        "category": data.get("category"),
                        "price": float(data.get("price")),
                        "stock": int(data.get("stock", 0)),
                        "description": data.get("description", ""),
                        "isFeatured": data.get("isFeatured", False),
                        "attributes": data.get("attributes", {}),
                        "suggest": {
                            "input": [data.get("name"), data.get("category")]
                        }
                    }
                    es.index(index="products", id=product_id, document=doc)
                
                elif event_type == "product.updated":
                    logger.info(f"Updating product in ES: {product_id}")
                    changed_fields = data.get("changedFields", {})
                    # Standard partial update document
                    update_body = {"doc": changed_fields}
                    es.update(index="products", id=product_id, doc=update_body)

            except Exception as parse_err:
                logger.error(f"Error handling search sync event: {parse_err}")

    finally:
        await consumer.stop()
