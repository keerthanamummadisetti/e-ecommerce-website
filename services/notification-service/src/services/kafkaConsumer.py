import os
import json
import asyncio
import logging
from aiokafka import AIOKafkaConsumer
from src.config.db import SessionLocal
from src.services.notificationService import dispatch_notification

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
        "inventory.low_stock"
    ]

    logger.info(f"Connecting to Kafka brokers: {kafka_brokers} to consume notifications")
    
    # Resilient startup loop to prevent app crashing when Kafka is offline locally
    consumer = None
    while True:
        try:
            consumer = AIOKafkaConsumer(
                *topics,
                bootstrap_servers=kafka_brokers,
                group_id="notification-group",
                auto_offset_reset="earliest"
            )
            await consumer.start()
            logger.info("Kafka Notification Consumer started successfully.")
            break
        except Exception as e:
            logger.warn(f"Failed to connect to Kafka brokers ({e}). Retrying in 10 seconds...")
            await asyncio.sleep(10)

    try:
        async for msg in consumer:
            try:
                payload = json.loads(msg.value.decode('utf-8'))
                event_type = msg.topic
                logger.info(f"Processing event topic: {event_type}")

                db = SessionLocal()
                try:
                    data = payload.get("data", {})
                    
                    if event_type == "user.registered":
                        user_id = data.get("userId")
                        email = data.get("email")
                        name = data.get("name", "User")
                        dispatch_notification(
                            db=db,
                            user_id=user_id,
                            event_type=event_type,
                            user_email=email,
                            template_name="email_welcome.html",
                            template_data={"name": name, "otp_code": "128456"}
                        )
                    
                    elif event_type == "order.created":
                        user_id = data.get("userId")
                        order_id = data.get("orderId")
                        total_amount = data.get("totalAmount")
                        # For simulation, since user email isn't in order.created directly, we fetch/use default user email
                        email = f"user_{user_id[:8]}@example.com"
                        dispatch_notification(
                            db=db,
                            user_id=user_id,
                            event_type=event_type,
                            user_email=email,
                            template_name="email_order_created.html",
                            template_data={"order_id": order_id, "total_amount": total_amount}
                        )

                    elif event_type == "order.confirmed":
                        user_id = data.get("userId")
                        order_id = data.get("orderId")
                        est_del = data.get("estimatedDelivery")
                        email = f"user_{user_id[:8]}@example.com"
                        sms_text = f"ShopNow Order #{order_id} has been confirmed. Est delivery: {est_del}"
                        dispatch_notification(
                            db=db,
                            user_id=user_id,
                            event_type=event_type,
                            user_email=email,
                            sms_text=sms_text,
                            user_phone="+919876543210"
                        )

                    elif event_type == "order.cancelled":
                        user_id = data.get("userId")
                        order_id = data.get("orderId")
                        reason = data.get("reason", "Refund issue")
                        email = f"user_{user_id[:8]}@example.com"
                        sms_text = f"ShopNow Order #{order_id} was cancelled. Reason: {reason}."
                        dispatch_notification(
                            db=db,
                            user_id=user_id,
                            event_type=event_type,
                            user_email=email,
                            sms_text=sms_text,
                            user_phone="+919876543210"
                        )
                    
                    elif event_type == "inventory.low_stock":
                        prod_id = data.get("productId")
                        qty = data.get("currentQty")
                        wh_id = data.get("warehouseId")
                        logger.warn(f"[ADMIN SYSTEM EVENT] Product {prod_id} is running low at warehouse {wh_id}. Current Qty: {qty}")
                        
                finally:
                    db.close()

            except Exception as parse_err:
                logger.error(f"Error parsing event record value: {parse_err}")

    finally:
        await consumer.stop()
