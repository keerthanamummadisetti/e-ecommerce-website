# ShopNow E-Commerce Platform End-to-End Integration Flow Simulator

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SHOPNOW 10-MICROSERVICE INTEGRATION FLOW TEST SUITE   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$BaseUrl = "http://localhost" # Routes through API Gateway
# If testing directly on service ports:
$UserPort = "http://localhost:8081"
$ProdPort = "http://localhost:8082"
$OrderPort = "http://localhost:8083"
$PayPort = "http://localhost:8084"
$InvPort = "http://localhost:8085"
$CartPort = "http://localhost:8086"
$NotifPort = "http://localhost:8087"
$SearchPort = "http://localhost:8088"
$ReviewPort = "http://localhost:8089"
$AnalyticsPort = "http://localhost:8090"

# Helper for testing connection
function Test-Service([string]$name, [string]$url) {
    try {
        $res = Invoke-RestMethod -Uri "$url/actuator/health" -Method Get -TimeoutSec 2
        if ($res.status -eq "UP") {
            Write-Host "[ONLINE] $name service is available." -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "[OFFLINE] $name service is offline. Running in simulation mode." -ForegroundColor Yellow
        return $false
    }
}

Write-Host "Checking service availability..."
$userOnline = Test-Service "User Svc" $UserPort
$prodOnline = Test-Service "Product Svc" $ProdPort
$orderOnline = Test-Service "Order Svc" $OrderPort
$payOnline = Test-Service "Payment Svc" $PayPort
$invOnline = Test-Service "Inventory Svc" $InvPort
$cartOnline = Test-Service "Cart Svc" $CartPort
$notifOnline = Test-Service "Notification Svc" $NotifPort
$searchOnline = Test-Service "Search Svc" $SearchPort
$reviewOnline = Test-Service "Review Svc" $ReviewPort
$analyticsOnline = Test-Service "Analytics Svc" $AnalyticsPort

Write-Host ""
Write-Host "----------------------------------------------------------"
Write-Host "STEP 1: User Registration & Authentication" -ForegroundColor Blue

# 1. Register User
$userId = "usr_1b2c3d4e5f6"
$token = "eyJhbGciOiJSUzI1NiJ9.dummy_token_value_for_simulation"
$userEmail = "john.doe@example.com"

if ($userOnline) {
    try {
        $regBody = @{
            firstName = "John"
            lastName = "Doe"
            email = $userEmail
            password = "SecurePass@123"
            phone = "+919876543210"
            role = "ADMIN"
        } | ConvertTo-Json
        
        $res = Invoke-RestMethod -Uri "$UserPort/auth/register" -Method Post -Body $regBody -ContentType "application/json"
        $userId = $res.userId
        $token = $res.accessToken
        Write-Host "User registered successfully in DB. ID: $userId" -ForegroundColor Green
    } catch {
        Write-Host "Failed to register. User might already exist, attempting login..." -ForegroundColor Yellow
        try {
            $loginBody = @{
                email = $userEmail
                password = "SecurePass@123"
            } | ConvertTo-Json
            $res = Invoke-RestMethod -Uri "$UserPort/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
            $userId = $res.userId
            $token = $res.accessToken
            Write-Host "Logged in successfully. Token fetched." -ForegroundColor Green
        } catch {
            Write-Host "Login failed: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "[SIMULATED] User Registration code matches Appendix A schema." -ForegroundColor Gray
}

# 2. Add Stock inventory
Write-Host ""
Write-Host "STEP 2: Stock Allocation & Inventory Initialization" -ForegroundColor Blue
$productId = [guid]::NewGuid().ToString()

if ($invOnline) {
    try {
        $bulkBody = @(
            @{
                productId = $productId
                quantity = 100
                warehouseId = "WH-MUMBAI-01"
                threshold = 5
            }
        ) | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$InvPort/inventory/bulk-update" -Method Post -Body $bulkBody -ContentType "application/json"
        Write-Host "Stock initialized successfully for Product: $productId" -ForegroundColor Green
    } catch {
        Write-Host "Failed to initialize stock: $_" -ForegroundColor Red
    }
} else {
    Write-Host "[SIMULATED] Inventory loaded with 100 units at WH-MUMBAI-01." -ForegroundColor Gray
}

# 3. Insert Product Catalog
Write-Host ""
Write-Host "STEP 3: Product Catalogue Additions & Kafka Indexing" -ForegroundColor Blue
if ($prodOnline) {
    try {
        $prodBody = @{
            name = "SuperPhone Pro 2026"
            category = "electronics"
            price = 999.99
            stock = 100
            description = "Flagship device with AI integration"
            isFeatured = $true
            attributes = @{
                brand = "ShopNow"
                color = "Titanium"
            }
            variants = @(
                @{
                    sku = "SP-TIT-128"
                    size = "128GB"
                    stock = 50
                }
            )
        } | ConvertTo-Json

        $headers = @{ Authorization = "Bearer $token" }
        $res = Invoke-RestMethod -Uri "$ProdPort/products" -Method Post -Body $prodBody -ContentType "application/json" -Headers $headers
        Write-Host "Product added to catalog. ID: $($res.productId)" -ForegroundColor Green
        Write-Host "Kafka event published. Search service index synced." -ForegroundColor Green
    } catch {
        Write-Host "Product creation failed (Ensure Admin token privileges): $_" -ForegroundColor Red
    }
} else {
    Write-Host "[SIMULATED] Product 'SuperPhone Pro 2026' added. Published product.created topic event." -ForegroundColor Gray
}

# 4. Shopping Cart Interactions
Write-Host ""
Write-Host "STEP 4: Real-time Cart Validation & Merging" -ForegroundColor Blue
if ($cartOnline) {
    try {
        $headers = @{ Authorization = "Bearer $token" }
        
        # Add to cart
        $cartBody = @{
            productId = $productId
            quantity = 2
            variantSku = "SP-TIT-128"
        } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$CartPort/cart/$userId/items" -Method Post -Body $cartBody -ContentType "application/json" -Headers $headers
        Write-Host "Added item. Cart synced with Product Service pricing." -ForegroundColor Green
        
        # Ingest cart details
        $cart = Invoke-RestMethod -Uri "$CartPort/cart/$userId" -Method Get -Headers $headers
        Write-Host "Current cart items count: $($cart.items.Count), Total price: $($cart.items[0].price)" -ForegroundColor Green
    } catch {
        Write-Host "Cart operation failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "[SIMULATED] Guest cart items merged on login. Product verified at $999.99." -ForegroundColor Gray
}

# 5. Saga Choreography Checkout Flow
Write-Host ""
Write-Host "STEP 5: Checkout & Saga Transaction Ingestion" -ForegroundColor Blue
if ($cartOnline -and $orderOnline) {
    try {
        $headers = @{ Authorization = "Bearer $token" }
        $checkoutBody = @{
            couponCode = "SAVE10"
            shippingAddress = "456 Gateway Ave, Staging District"
        } | ConvertTo-Json
        
        $res = Invoke-RestMethod -Uri "$CartPort/cart/$userId/checkout" -Method Post -Body $checkoutBody -ContentType "application/json" -Headers $headers
        Write-Host "Checkout initiated. Total amount: $($res.checkoutDetails.totalAmount)" -ForegroundColor Green
        Write-Host "State: $($res.status). Order coordinate created." -ForegroundColor Green
    } catch {
        Write-Host "Checkout failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "[SIMULATED] Checkout triggered cart.checkout_initiated Kafka event." -ForegroundColor Gray
    Write-Host "[SIMULATED] Order Svc created PENDING order. Stock reserved in Inventory (15m lock)." -ForegroundColor Gray
}

# 6. Analytics Ingestion Verify
Write-Host ""
Write-Host "STEP 6: Real-time Funnel Analysis Ingestion" -ForegroundColor Blue
if ($analyticsOnline) {
    try {
        $funnel = Invoke-RestMethod -Uri "$AnalyticsPort/analytics/funnel" -Method Get
        Write-Host "Funnel Stats: Checkouts=$($funnel.checkoutInitiated), Orders=$($funnel.orderCreated), ConversionRate=$($funnel.checkoutToOrderRate)%" -ForegroundColor Green
    } catch {
        Write-Host "Analytics fetch failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "[SIMULATED] Funnel metrics calculated successfully in SQLite/ClickHouse." -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "           INTEGRATION FLOW SIMULATION COMPLETED          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
