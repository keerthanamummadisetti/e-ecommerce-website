import json
from fastapi import APIRouter, Query, Depends
from src.config.db import get_es_client, get_redis_client

router = APIRouter(prefix="/search")

CACHE_TTL = 300  # 5 minutes query cache

@router.get("")
async def search_products(
    q: str = Query(None),
    category: str = Query(None),
    minPrice: float = Query(None),
    maxPrice: float = Query(None),
    minRating: float = Query(None),
    inStock: bool = Query(None),
    page: int = Query(1),
    limit: int = Query(10),
    sort: str = Query("relevance")
):
    redis = get_redis_client()
    
    # 1. Construct Cache Key
    cache_key = f"search:q:{q}:cat:{category}:min:{minPrice}:max:{maxPrice}:rating:{minRating}:stock:{inStock}:page:{page}:limit:{limit}:sort:{sort}"
    try:
        cached_result = await redis.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
    except Exception:
        pass

    # 2. Build Elasticsearch Query
    es_query = {"bool": {"must": [], "filter": []}}
    
    if q:
        es_query["bool"]["must"].append({
            "multi_match": {
                "query": q,
                "fields": ["name^3", "description^1", "attributes.brand^2", "attributes.tags^2"],
                "fuzziness": "AUTO"
            }
        })
    else:
        es_query["bool"]["must"].append({"match_all": {}})

    if category:
        es_query["bool"]["filter"].append({"term": {"category.keyword": category}})

    if minPrice is not None or maxPrice is not None:
        price_range = {}
        if minPrice is not None:
            price_range["gte"] = minPrice
        if maxPrice is not None:
            price_range["lte"] = maxPrice
        es_query["bool"]["filter"].append({"range": {"price": price_range}})

    if minRating is not None:
        es_query["bool"]["filter"].append({"range": {"averageRating": {"gte": minRating}}})

    if inStock is not None:
        if inStock:
            es_query["bool"]["filter"].append({"range": {"stock": {"gt": 0}}})
        else:
            es_query["bool"]["filter"].append({"term": {"stock": 0}})

    # Sorting
    sort_body = []
    if sort == "price_asc":
        sort_body.append({"price": "asc"})
    elif sort == "price_desc":
        sort_body.append({"price": "desc"})
    elif sort == "rating_desc":
        sort_body.append({"averageRating": "desc"})
    elif sort == "newest":
        sort_body.append({"createdAt": "desc"})
    else:
        sort_body.append({"_score": "desc"})

    body = {
        "from": (page - 1) * limit,
        "size": limit,
        "query": es_query,
        "sort": sort_body,
        "aggs": {
            "categories": {
                "terms": {"field": "category.keyword"}
            },
            "price_stats": {
                "stats": {"field": "price"}
            }
        }
    }

    es = get_es_client()
    res = es.search(index="products", body=body)

    # 3. Format Response
    products = [
        {"productId": hit["_id"], **hit["_source"]}
        for hit in res["hits"]["hits"]
    ]

    facets = {
        "categories": [
            {"name": bucket["key"], "count": bucket["doc_count"]}
            for bucket in res.get("aggregations", {}).get("categories", {}).get("buckets", [])
        ],
        "price_stats": res.get("aggregations", {}).get("price_stats", {})
    }

    result = {
        "products": products,
        "total": res["hits"]["total"]["value"] if isinstance(res["hits"]["total"], dict) else res["hits"]["total"],
        "currentPage": page,
        "limit": limit,
        "facets": facets
    }

    # 4. Save to Redis cache
    try:
        await redis.set(cache_key, json.dumps(result), ex=CACHE_TTL)
    except Exception:
        pass

    return result

@router.get("/autocomplete")
async def autocomplete(q: str = Query("")):
    if not q:
        return []

    redis = get_redis_client()
    cache_key = f"autocomplete:q:{q}"
    try:
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    # Use Completion Suggester for p99 < 50ms performance target
    body = {
        "suggest": {
            "product-suggest": {
                "prefix": q,
                "completion": {
                    "field": "suggest",
                    "size": 5,
                    "skip_duplicates": True
                }
            }
        }
    }

    es = get_es_client()
    res = es.search(index="products", body=body)
    
    suggestions = []
    options = res.get("suggest", {}).get("product-suggest", [{}])[0].get("options", [])
    for opt in options:
        suggestions.append(opt["text"])

    try:
        await redis.set(cache_key, json.dumps(suggestions), ex=CACHE_TTL)
    except Exception:
        pass

    return suggestions

@router.get("/filters")
async def get_search_filters():
    # Helper to return list of active categories
    body = {
        "size": 0,
        "aggs": {
            "categories": {
                "terms": {"field": "category.keyword"}
            }
        }
    }
    es = get_es_client()
    res = es.search(index="products", body=body)
    categories = [
        bucket["key"]
        for bucket in res.get("aggregations", {}).get("categories", {}).get("buckets", [])
    ]
    return {
        "categories": categories,
        "price_ranges": ["0-25", "25-50", "50-100", "100-200", "200+"]
    }

@router.get("/recommendations/{userId}")
async def get_recommendations(userId: str):
    # Mock personalized product recommendations
    body = {
        "query": {"match_all": {}},
        "size": 4
    }
    es = get_es_client()
    res = es.search(index="products", body=body)
    products = [
        {"productId": hit["_id"], **hit["_source"]}
        for hit in res["hits"]["hits"]
    ]
    return products
