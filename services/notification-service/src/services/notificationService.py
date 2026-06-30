import os
import time
import logging
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session
from src.models.notification import NotificationLog, NotificationPreference

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("notification-service")

TEMPLATE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "templates"))
jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

# Mock send handlers
def send_email_gateway(to_email, subject, body_html):
    # Standard output logs for simulation
    logger.info(f"\n--- [SIMULATING EMAIL SEND] ---")
    logger.info(f"To: {to_email}")
    logger.info(f"Subject: {subject}")
    logger.info(f"Body: {body_html[:300]}...")
    logger.info(f"-------------------------------\n")
    # Return true on success
    return True

def send_sms_gateway(to_phone, text):
    logger.info(f"\n--- [SIMULATING SMS SEND] ---")
    logger.info(f"To: {to_phone}")
    logger.info(f"Text: {text}")
    logger.info(f"-----------------------------\n")
    return True

def dispatch_notification(
    db: Session,
    user_id: str,
    event_type: str,
    user_email: str,
    user_phone: str = None,
    template_name: str = None,
    template_data: dict = None,
    sms_text: str = None
):
    # 1. Fetch/Default preferences
    pref = db.query(NotificationPreference).filter_by(user_id=user_id, event_type=event_type).first()
    email_enabled = pref.email_enabled if pref else True
    sms_enabled = pref.sms_enabled if pref else True

    # 2. Process Email
    if email_enabled and template_name and user_email:
        try:
            template = jinja_env.get_template(template_name)
            html_content = template.render(**(template_data or {}))
            
            # Send with retry loop (Exponential Backoff: 3 retries)
            success = False
            for retry in range(3):
                try:
                    success = send_email_gateway(user_email, f"Notification: {event_type}", html_content)
                    if success:
                        break
                except Exception as ex:
                    logger.warn(f"Email send attempt {retry + 1} failed: {ex}")
                    time.sleep(2 ** retry) # 1s, 2s, 4s delay

            status = "SENT" if success else "FAILED"
            log = NotificationLog(
                user_id=user_id,
                event_type=event_type,
                channel="EMAIL",
                content=html_content[:500],
                status=status,
                retry_count=0
            )
            db.add(log)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to process email dispatch: {e}")

    # 3. Process SMS
    if sms_enabled and sms_text and user_phone:
        try:
            success = False
            for retry in range(3):
                try:
                    success = send_sms_gateway(user_phone, sms_text)
                    if success:
                        break
                except Exception as ex:
                    logger.warn(f"SMS send attempt {retry + 1} failed: {ex}")
                    time.sleep(2 ** retry)

            status = "SENT" if success else "FAILED"
            log = NotificationLog(
                user_id=user_id,
                event_type=event_type,
                channel="SMS",
                content=sms_text,
                status=status,
                retry_count=0
            )
            db.add(log)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to process SMS dispatch: {e}")
