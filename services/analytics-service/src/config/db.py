import os
import logging
import clickhouse_connect
from sqlalchemy import create_engine, Column, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

# ClickHouse credentials
CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_PORT = int(os.getenv("CLICKHOUSE_PORT", "8123"))
CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER", "clickhouse_user")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "clickhousepassword")
CLICKHOUSE_DB = os.getenv("CLICKHOUSE_DB", "shopnow_analytics")

# SQLite fallback config
sqlite_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "analytics.db"))
SQLiteBase = declarative_base()

class SQLiteEventLog(SQLiteBase):
    __tablename__ = "event_logs"
    event_id = Column(String(50), primary_key=True)
    event_type = Column(String(100), nullable=False, index=True)
    event_time = Column(DateTime, nullable=False)
    user_id = Column(String(50))
    product_id = Column(String(50))
    amount = Column(Float, default=0.0)
    payload = Column(String(2000))

sqlite_engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})
SQLiteSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)

ch_client = None
use_sqlite = False

def connect_analytics_db():
    global ch_client, use_sqlite
    try:
        ch_client = clickhouse_connect.get_client(
            host=CLICKHOUSE_HOST,
            port=CLICKHOUSE_PORT,
            username=CLICKHOUSE_USER,
            password=CLICKHOUSE_PASSWORD,
            database=CLICKHOUSE_DB
        )
        logger = logging.getLogger("analytics-db")
        logger.info("Connected to ClickHouse successfully.")
        
        # Initialize ClickHouse table
        ch_client.command(f"""
            CREATE TABLE IF NOT EXISTS event_logs (
                event_id String,
                event_type String,
                event_time DateTime,
                user_id String,
                product_id String,
                amount Float64,
                payload String
            ) ENGINE = MergeTree()
            ORDER BY (event_type, event_time)
        """)
        use_sqlite = False
    except Exception as e:
        logging.warn(f"ClickHouse is down ({e}). Initializing SQLite local fallback DB.")
        SQLiteBase.metadata.create_all(bind=sqlite_engine)
        use_sqlite = True

def get_analytics_client():
    global ch_client, use_sqlite
    return ch_client, use_sqlite

def insert_event(event_id, event_type, event_time, user_id="", product_id="", amount=0.0, payload=""):
    client, sqlite_mode = get_analytics_client()
    if sqlite_mode:
        db = SQLiteSessionLocal()
        try:
            # Parse datetime if string
            if isinstance(event_time, str):
                event_time = datetime.fromisoformat(event_time.replace("Z", "+00:00"))
            log = SQLiteEventLog(
                event_id=event_id,
                event_type=event_type,
                event_time=event_time,
                user_id=user_id,
                product_id=product_id,
                amount=amount,
                payload=payload
            )
            db.add(log)
            db.commit()
        finally:
            db.close()
    else:
        # ClickHouse insert
        data = [[event_id, event_type, event_time, user_id, product_id, amount, payload]]
        client.insert("event_logs", data, column_names=["event_id", "event_type", "event_time", "user_id", "product_id", "amount", "payload"])
