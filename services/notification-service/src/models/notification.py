import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, DateTime
from ..config.db import Base

class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(50), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    channel = Column(String(20), nullable=False)
    content = Column(String(1000), nullable=False)
    status = Column(String(20), nullable=False, default="SENT")  # SENT, FAILED, READ
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    # Compound primary key for user_id and event_type
    user_id = Column(String(50), primary_key=True, index=True)
    event_type = Column(String(100), primary_key=True)
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=True)
    push_enabled = Column(Boolean, default=True)
