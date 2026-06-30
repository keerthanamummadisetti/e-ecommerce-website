import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv(
    "SPRING_DATASOURCE_URL", 
    "postgresql://postgres:postgrespassword@localhost:5432/shopnow_notification"
)

# Resilient fallback to SQLite for local development if postgres isn't running
try:
    # Basic check to see if database url is reachable or use sqlite if requested
    if "sqlite" in DATABASE_URL or not DATABASE_URL.startswith("postgresql"):
        raise ValueError("Use SQLite")
    
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    # Check connection
    with engine.connect() as conn:
        pass
    logging.info("SQLAlchemy PostgreSQL Connected successfully.")
except Exception as e:
    logging.warn(f"PostgreSQL not available ({e}). Falling back to local SQLite.")
    sqlite_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "notifications.db"))
    DATABASE_URL = f"sqlite:///{sqlite_path}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
