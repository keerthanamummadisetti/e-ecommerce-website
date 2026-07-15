import json
import pandas as pd
from datetime import datetime, timedelta
from fastapi import APIRouter, Query, Depends, HTTPException
from fastapi.responses import Response
from src.config.db import get_analytics_client, SQLiteSessionLocal, SQLiteEventLog

router = APIRouter(prefix="/analytics")

def get_event_dataframe(event_types: list, from_date: str = None, to_date: str = None):
    client, sqlite_mode = get_analytics_client()
    
    if sqlite_mode:
        db = SQLiteSessionLocal()
        try:
            query = db.query(SQLiteEventLog).filter(SQLiteEventLog.event_type.in_(event_types))
            if from_date:
                fd = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
                query = query.filter(SQLiteEventLog.event_time >= fd)
            if to_date:
                td = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
                query = query.filter(SQLiteEventLog.event_time <= td)
            
            logs = query.all()
            data = [{
                "event_id": log.event_id,
                "event_type": log.event_type,
                "event_time": log.event_time,
                "user_id": log.user_id,
                "product_id": log.product_id,
                "amount": log.amount,
                "payload": log.payload
            } for log in logs]
            return pd.DataFrame(data)
        finally:
            db.close()
    else:
        # ClickHouse query
        event_types_str = ", ".join([f"'{et}'" for et in event_types])
        sql = f"SELECT * FROM event_logs WHERE event_type IN ({event_types_str})"
        
        if from_date:
            # ClickHouse ISO format query
            sql += f" AND event_time >= '{from_date.replace('Z', '').split('.')[0]}'"
        if to_date:
            sql += f" AND event_time <= '{to_date.replace('Z', '').split('.')[0]}'"
            
        res = client.query(sql)
        df = pd.DataFrame(res.result_rows, columns=["event_id", "event_type", "event_time", "user_id", "product_id", "amount", "payload"])
        return df

# 1. GET Sales & Revenue Summary
@router.get("/sales")
def get_sales(from_date: str = None, to_date: str = None):
    # Success payments represent sales
    df = get_event_dataframe(["com.shopnow.payment.success"], from_date, to_date)
    if df.empty:
        return {"totalSales": 0.0, "transactionsCount": 0}
        
    total_sales = float(df["amount"].sum())
    count = len(df)
    return {
        "totalSales": round(total_sales, 2),
        "transactionsCount": count
    }

# 2. GET Top Products
@router.get("/products/top")
def get_top_products(limit: int = 5):
    # Extract from order.created payloads
    df = get_event_dataframe(["com.shopnow.order.created"])
    if df.empty:
        return []

    product_counts = {}
    for payload_str in df["payload"]:
        try:
            payload = json.loads(payload_str)
            items = payload.get("data", {}).get("items", [])
            for item in items:
                prod_id = item.get("productId")
                qty = int(item.get("quantity", 0))
                product_counts[prod_id] = product_counts.get(prod_id, 0) + qty
        except Exception:
            pass

    sorted_prods = sorted(product_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    return [{"productId": p[0], "unitsSold": p[1]} for p in sorted_prods]

# 3. GET User Activity Stats
@router.get("/users/activity")
def get_user_activity():
    # Active registrations vs Order placements
    df = get_event_dataframe(["com.shopnow.user.registered", "com.shopnow.order.created"])
    if df.empty:
        return {"registrations": 0, "ordersPlaced": 0}

    registrations = int((df["event_type"] == "com.shopnow.user.registered").sum())
    orders = int((df["event_type"] == "com.shopnow.order.created").sum())
    return {
        "registrations": registrations,
        "ordersPlaced": orders
    }

# 4. GET Revenue Summary Stats (revenue/hour, average order size)
@router.get("/revenue/summary")
def get_revenue_summary():
    df_payment = get_event_dataframe(["com.shopnow.payment.success"])
    if df_payment.empty:
        return {
            "totalRevenue": 0.0,
            "averageOrderSize": 0.0,
            "ordersProcessed": 0
        }

    total_revenue = float(df_payment["amount"].sum())
    orders_processed = len(df_payment)
    avg_order = total_revenue / orders_processed if orders_processed > 0 else 0.0

    return {
        "totalRevenue": round(total_revenue, 2),
        "averageOrderSize": round(avg_order, 2),
        "ordersProcessed": orders_processed
    }

# 5. GET Funnel Analysis (cart add -> checkout -> payment conversion rates)
@router.get("/funnel")
def get_funnel_analysis():
    # Funnel steps:
    # 1. Checkout Initiated (com.shopnow.cart.checkout_initiated)
    # 2. Order Created (com.shopnow.order.created)
    # 3. Payment Succeeded (com.shopnow.payment.success)
    df = get_event_dataframe([
        "com.shopnow.cart.checkout_initiated",
        "com.shopnow.order.created",
        "com.shopnow.payment.success"
    ])

    # Calculate total revenue from successful payments
    df_payment = get_event_dataframe(["com.shopnow.payment.success"])
    total_revenue = float(df_payment["amount"].sum()) if not df_payment.empty else 0.0

    if df.empty:
        return {
            "checkoutInitiated": 0,
            "orderCreated": 0,
            "paymentSuccess": 0,
            "checkoutToOrderRate": 0.0,
            "orderToPaymentRate": 0.0,
            "totalRevenue": 0.0
        }

    checkouts = int((df["event_type"] == "com.shopnow.cart.checkout_initiated").sum())
    orders = int((df["event_type"] == "com.shopnow.order.created").sum())
    payments = int((df["event_type"] == "com.shopnow.payment.success").sum())

    checkout_to_order = (orders / checkouts * 100.0) if checkouts > 0 else 0.0
    order_to_payment = (payments / orders * 100.0) if orders > 0 else 0.0

    return {
        "checkoutInitiated": checkouts,
        "orderCreated": orders,
        "paymentSuccess": payments,
        "checkoutToOrderRate": round(checkout_to_order, 2),
        "orderToPaymentRate": round(order_to_payment, 2),
        "totalRevenue": round(total_revenue, 2)
    }

# 6. POST Export Reports
@router.post("/reports/export")
def export_reports(report_type: str = Query("sales")):
    if report_type == "sales":
        df = get_event_dataframe(["com.shopnow.payment.success"])
    elif report_type == "users":
        df = get_event_dataframe(["com.shopnow.user.registered"])
    else:
        df = get_event_dataframe(["com.shopnow.order.created"])

    if df.empty:
        content = "No data found for the requested report."
    else:
        content = df.to_csv(index=False)

    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=report_{report_type}.csv"}
    )
