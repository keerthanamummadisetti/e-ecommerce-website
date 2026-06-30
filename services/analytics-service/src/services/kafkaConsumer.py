import os
import json
import asyncio
import logging
from aiokafka import AIOKafkaConsumer
from src.config.db import insert_event

logger = logging.getLogger("kafka-consumer")

async def consume_events():
    kafka_brokers = os.getenv("KAFKA_BROKERS", "localhost:9092")
    topics = [
        "user.registered",
        "order.created",
        "order.confirmed",
        "order.cancelled",
        "payment.success",
        "payment.failed",
        "cart.checkout_initiated"
    ]

    logger.info(f"Connecting to Kafka brokers: {kafka_brokers} to consume analytics events")
    
    # Resilient connection loop
    consumer = None
    while True:
        try:
            consumer = AIOKafkaConsumer(
                *topics,
                bootstrap_servers=kafka_brokers,
                group_id="analytics-group",
                auto_offset_reset="earliest"
            )
            await consumer.start()
            logger.info("Kafka Analytics Consumer started successfully.")
            break
        except Exception as e:
            logger.warn(f"Failed to connect to Kafka brokers ({e}). Retrying in 10 seconds...")
            await asyncio.sleep(10)

    try:
        async for msg in consumer:
            try:
                payload = json.loads(msg.value.decode('utf-8'))
                event_type = payload.get("type", msg.topic)
                event_id = payload.get("id", f"evt-{msg.offset}")
                event_time = payload.get("time", msg.timestamp)
                
                data = payload.get("data", {})
                user_id = data.get("userId", "")
                
                # Check for order amount or payment amount
                amount = 0.0
                if "totalAmount" in data:
                    amount = float(data.get("totalAmount"))
                elif "amount" in data:
                    amount = float(data.get("amount"))
                elif "refundAmount" in data:
                    amount = float(data.get("refundAmount"))

                # Check for product ID (e.g. if single product or first item)
                product_id = ""
                items = data.get("items", [])
                if items and isinstance(items, list):
                    product_id = items[0].get("productId", "")
                elif "productId" in data:
                    product_id = data.get("productId", "")

                raw_payload = json.dumps(payload)

                # Store event
                insert_event(
                    event_id=event_id,
                    event_type=event_type,
                    event_time=event_time,
                    user_id=user_id,
                    product_id=product_id,
                    amount=amount,
                    payload=raw_payload
                )
                logger.info(f"Ingested event: {event_type} for analytics.")

            except Exception as parse_err:
                logger.error(f"Error handling analytics event: {parse_err}")

    finally:
        await consumer.stop()
