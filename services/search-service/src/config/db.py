import os
import logging
from elasticsearch import Elasticsearch
import redis.asyncio as aioredis

ELASTIC_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Resilient Elasticsearch setup
es_client = None
try:
    es_client = Elasticsearch(ELASTIC_URL, request_timeout=3)
    # Check health
    if not es_client.ping():
        raise ConnectionError("Ping failed")
    logging.info("Elasticsearch Client Connected successfully.")
except Exception as e:
    logging.warn(f"Elasticsearch is down ({e}). Using mock search index.")
    es_client = None

def get_es_client():
    global es_client
    if es_client is None:
        return create_mock_es_client()
    return es_client

# In-Memory ES mock for resilience
def create_mock_es_client():
    class MockES:
        def __init__(self):
            self.store = {}
        def ping(self):
            return True
        def index(self, index, id, document):
            self.store[id] = document
            return {"result": "created"}
        def update(self, index, id, doc):
            if id in self.store:
                self.store[id].update(doc.get("doc", {}))
            return {"result": "updated"}
        def search(self, index, query=None, body=None):
            # Return list of values matching simple query
            hits = []
            q_str = ""
            if body and "query" in body:
                # Basic mock query parser
                multi_match = body["query"].get("multi_match", {})
                q_str = multi_match.get("query", "").lower()
            
            for pid, doc in self.store.items():
                if not q_str or q_str in doc.get("name", "").lower() or q_str in doc.get("description", "").lower():
                    hits.append({
                        "_id": pid,
                        "_source": doc,
                        "_score": 1.0
                    })
            return {
                "hits": {
                    "total": {"value": len(hits)},
                    "hits": hits
                },
                "aggregations": {
                    "categories": {
                        "buckets": [{"key": "electronics", "doc_count": len(hits)}]
                    }
                }
            }
    return MockES()

# Resilient Async Redis setup
redis_client = None
async def connect_redis():
    global redis_client
    try:
        redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
        await redis_client.ping()
        logging.info("Redis Connected successfully for Search Service.")
    except Exception as e:
        logging.warn(f"Redis is down for Search Service ({e}). Using local in-memory query cache.")
        redis_client = create_mock_redis()

def get_redis_client():
    global redis_client
    if redis_client is None:
        redis_client = create_mock_redis()
    return redis_client

def create_mock_redis():
    class MockRedis:
        def __init__(self):
            self.store = {}
        async def get(self, key):
            return self.store.get(key)
        async def set(self, key, value, ex=None):
            self.store[key] = value
            return True
        async def ping(self):
            return True
    return MockRedis()
