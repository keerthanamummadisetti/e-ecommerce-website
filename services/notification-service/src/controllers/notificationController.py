from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from src.config.db import get_db
from src.models.notification import NotificationLog, NotificationPreference

router = APIRouter(prefix="/notifications")

class PreferenceUpdate(BaseModel):
    user_id: str
    event_type: str
    email_enabled: bool = True
    sms_enabled: bool = True
    push_enabled: bool = True

@router.get("/{userId}")
def get_user_notifications(userId: str, db: Session = Depends(get_db)):
    logs = db.query(NotificationLog).filter(NotificationLog.user_id == userId).order_by(NotificationLog.created_at.desc()).limit(50).all()
    return logs

@router.put("/{id}/read")
def mark_read(id: str, db: Session = Depends(get_db)):
    log = db.query(NotificationLog).filter(NotificationLog.id == id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Notification not found")
    log.status = "READ"
    db.commit()
    return {"status": "SUCCESS"}

@router.put("/user/{userId}/read-all")
def mark_all_read(userId: str, db: Session = Depends(get_db)):
    db.query(NotificationLog).filter(NotificationLog.user_id == userId, NotificationLog.status == "SENT").update({"status": "READ"}, synchronize_session=False)
    db.commit()
    return {"status": "SUCCESS"}

@router.get("/preferences/{userId}")
def get_preferences(userId: str, db: Session = Depends(get_db)):
    prefs = db.query(NotificationPreference).filter(NotificationPreference.user_id == userId).all()
    return prefs

@router.post("/preferences")
def save_preferences(pref_in: PreferenceUpdate, db: Session = Depends(get_db)):
    pref = db.query(NotificationPreference).filter_by(user_id=pref_in.user_id, event_type=pref_in.event_type).first()
    if not pref:
        pref = NotificationPreference(
            user_id=pref_in.user_id,
            event_type=pref_in.event_type
        )
        db.add(pref)
    
    pref.email_enabled = pref_in.email_enabled
    pref.sms_enabled = pref_in.sms_enabled
    pref.push_enabled = pref_in.push_enabled
    db.commit()
    return {"status": "SUCCESS", "preference": pref_in}
