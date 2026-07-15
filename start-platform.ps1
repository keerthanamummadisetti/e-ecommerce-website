# ShopNow E-Commerce Platform One-Click Bootstrapper & Database Seeder

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         SHOPNOW PLATFORM BOOTSTRAP & SEED SCRIPT         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Start Infrastructure and Microservices
Write-Host "[1/3] Building microservices sequentially to prevent Docker resource exhaustion..." -ForegroundColor Yellow
cd infrastructure
docker-compose build user-service
docker-compose build product-service
docker-compose build cart-service
docker-compose build order-service
docker-compose build payment-service
docker-compose build inventory-service
docker-compose build notification-service
docker-compose build review-service
docker-compose build search-service
docker-compose build analytics-service
docker-compose build web-app

Write-Host "Starting all Docker containers..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker-compose failed to start. Ensure Docker Desktop is running." -ForegroundColor Red
    exit 1
}
cd ..

# 2. Wait for services to be healthy
Write-Host "[2/3] Waiting for database and messaging engines to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# 3. Seed MongoDB and PostgreSQL Inventory
Write-Host "[3/3] Running database seeder script..." -ForegroundColor Yellow
cd services/product-service
node src/seed-db.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to seed databases." -ForegroundColor Red
    exit 1
}
cd ../..

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "    SHOPNOW PLATFORM IS ONLINE AND SEEDED SUCCESSFULLY!    " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Access Swagger documentation endpoints at:" -ForegroundColor Green
Write-Host " - User Service: http://localhost:8081/swagger-ui/index.html" -ForegroundColor Green
Write-Host " - Order Service: http://localhost:8083/swagger-ui/index.html" -ForegroundColor Green
Write-Host " - Inventory Service: http://localhost:8085/swagger-ui/index.html" -ForegroundColor Green
Write-Host " - Review Service: http://localhost:8089/swagger-ui/index.html" -ForegroundColor Green
Write-Host ""
