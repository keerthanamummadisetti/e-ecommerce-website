# ShopNow Architecture Documentation

This directory contains the architecture documentation and designs for the ShopNow E-Commerce platform.

## High-Level System Architecture

```mermaid
graph TD
    Client[Web/Mobile/Dashboard Clients] -->|HTTPS| Gateway[Kong API Gateway]
    
    subgraph Microservices Layer
        Gateway -->|HTTP/REST| UserSvc[User & Auth Service]
        Gateway -->|HTTP/REST| ProductSvc[Product Catalogue Service]
        Gateway -->|HTTP/REST| CartSvc[Shopping Cart Service]
        Gateway -->|HTTP/REST| OrderSvc[Order Management Service]
        Gateway -->|HTTP/REST| ReviewSvc[Review & Rating Service]
        Gateway -->|HTTP/REST| SearchSvc[Search & Discovery Service]
        Gateway -->|HTTP/REST| AnalyticsSvc[Analytics & Reporting Service]
        
        OrderSvc -->|HTTP/REST| InventorySvc[Inventory Service]
        CartSvc -->|HTTP/REST| ProductSvc
    end
    
    subgraph Event Bus
        OrderSvc -->|Publish Events| Kafka[Apache Kafka]
        PaymentSvc[Payment Service] -->|Publish Events| Kafka
        ProductSvc -->|Publish Events| Kafka
        InventorySvc -->|Publish Events| Kafka
        ReviewSvc -->|Publish Events| Kafka
        CartSvc -->|Publish Events| Kafka
        
        Kafka -->|Subscribe Events| NotificationSvc[Notification Service]
        Kafka -->|Subscribe Events| SearchSvc
        Kafka -->|Subscribe Events| AnalyticsSvc
        Kafka -->|Subscribe Events| OrderSvc
        Kafka -->|Subscribe Events| InventorySvc
    end
    
    subgraph Data & Infrastructure Layer
        UserSvc --> PostgreSQL[(PostgreSQL)]
        OrderSvc --> PostgreSQL
        PaymentSvc --> PostgreSQL
        InventorySvc --> PostgreSQL
        NotificationSvc --> PostgreSQL
        
        ProductSvc --> MongoDB[(MongoDB)]
        ReviewSvc --> MongoDB
        
        CartSvc --> Redis[(Redis)]
        UserSvc --> Redis
        ProductSvc --> Redis
        InventorySvc --> Redis
        NotificationSvc --> Redis
        SearchSvc --> Redis
        
        SearchSvc --> ES[(Elasticsearch)]
        AnalyticsSvc --> ClickHouse[(ClickHouse)]
    end
```

## Data Persistence & Technology Choices

| Service | Language/Framework | Database | Message Broker | Cache / Lock Store |
| :--- | :--- | :--- | :--- | :--- |
| **User Service** | Java Spring Boot | PostgreSQL | - | Redis (Token list / TTL) |
| **Product Catalogue** | Node.js Express | MongoDB | Kafka (Producer) | Redis (Page Cache) |
| **Order Management** | Java Spring Boot | PostgreSQL | Kafka (Prod & Cons) | - |
| **Payment Service** | Node.js Express | PostgreSQL | Kafka (Producer) | - |
| **Inventory Service**| Java Spring Boot | PostgreSQL | Kafka (Prod & Cons) | Redis (Redlock, TTL) |
| **Shopping Cart** | Node.js Express | - | Kafka (Producer) | Redis (Cart Storage) |
| **Notification** | Python FastAPI | PostgreSQL | Kafka (Consumer) | Redis |
| **Search Service** | Python FastAPI | Elasticsearch | Kafka (Consumer) | Redis (Query Cache) |
| **Review Service** | Java Spring Boot | MongoDB | Kafka (Producer) | - |
| **Analytics Service**| Python | ClickHouse / SQLite| Kafka (Consumer) | - |
