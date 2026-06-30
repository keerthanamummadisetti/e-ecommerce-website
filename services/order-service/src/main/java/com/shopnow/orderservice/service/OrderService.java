package com.shopnow.orderservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shopnow.orderservice.dto.OrderRequest;
import com.shopnow.orderservice.model.Order;
import com.shopnow.orderservice.model.OrderItem;
import com.shopnow.orderservice.model.OrderStatus;
import com.shopnow.orderservice.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${inventory.service.url:http://localhost:8085}")
    private String inventoryServiceUrl;

    public OrderService(OrderRepository orderRepository, KafkaTemplate<String, String> kafkaTemplate) {
        this.orderRepository = orderRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    public Order getOrderById(UUID id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ORDER_NOT_FOUND"));
    }

    public java.util.List<Order> getOrdersByUserId(UUID userId) {
        return orderRepository.findByUserId(userId);
    }

    @Transactional
    public Order createOrder(OrderRequest request) {
        // 1. Idempotency Check
        var existing = orderRepository.findByIdempotencyKey(request.getIdempotencyKey());
        if (existing.isPresent()) {
            System.out.println("Duplicate order detected for idempotency key: " + request.getIdempotencyKey());
            return existing.get();
        }

        Order order = new Order();
        order.setUserId(request.getUserId());
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(request.getTotalAmount());
        order.setShippingAddr(request.getShippingAddr());
        order.setIdempotencyKey(request.getIdempotencyKey());

        // 2. Reserve Stock (Inventory Service REST integration)
        for (OrderRequest.OrderItemDto dto : request.getItems()) {
            UUID reservationId = reserveInventoryItem(dto.getProductId(), dto.getQuantity());
            
            OrderItem item = new OrderItem();
            item.setProductId(dto.getProductId());
            item.setQuantity(dto.getQuantity());
            item.setUnitPrice(dto.getPrice());
            // Store reservationId inside the snapshot or directly in Snapshot details
            item.setProductSnapshot(dto.getProductSnapshot() != null ? dto.getProductSnapshot() : "{\"reservationId\":\"" + reservationId + "\"}");
            
            order.addItem(item);
        }

        Order savedOrder = orderRepository.save(order);

        // 3. Emit Kafka event: order.created
        publishOrderCreatedEvent(savedOrder);

        return savedOrder;
    }

    @Transactional
    public void confirmOrder(UUID orderId, UUID paymentId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getStatus() != OrderStatus.PENDING) {
            return;
        }

        order.setStatus(OrderStatus.CONFIRMED);
        order.setPaymentId(paymentId);
        orderRepository.save(order);

        // Deduct inventory permanently (Compensation Saga step: commit)
        for (OrderItem item : order.getItems()) {
            UUID reservationId = extractReservationId(item);
            if (reservationId != null) {
                confirmInventoryItem(item.getProductId(), reservationId);
            }
        }

        // Emit Kafka event: order.confirmed
        publishOrderConfirmedEvent(order);
    }

    @Transactional
    public void cancelOrder(UUID orderId, String reason) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getStatus() == OrderStatus.CANCELLED) {
            return;
        }

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);

        // Release inventory back (Compensation Saga step: rollback)
        for (OrderItem item : order.getItems()) {
            UUID reservationId = extractReservationId(item);
            if (reservationId != null) {
                releaseInventoryItem(item.getProductId(), reservationId);
            }
        }

        // Emit Kafka event: order.cancelled
        publishOrderCancelledEvent(order, reason);
    }

    // --- Inventory REST Helpers with mock fallbacks ---

    private UUID reserveInventoryItem(UUID productId, int quantity) {
        String url = inventoryServiceUrl + "/inventory/" + productId.toString() + "/reserve";
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("productId", productId.toString());
            request.put("quantity", quantity);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.PUT, new HttpEntity<>(request), Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String resIdStr = (String) response.getBody().get("reservationId");
                return UUID.fromString(resIdStr);
            }
        } catch (Exception e) {
            System.err.println("Inventory Service reservation failed: " + e.getMessage() + ". Using mock reservation for local execution.");
        }
        return UUID.randomUUID(); // Fallback for local run
    }

    private void confirmInventoryItem(UUID productId, UUID reservationId) {
        String url = inventoryServiceUrl + "/inventory/" + productId.toString() + "/reduce";
        try {
            Map<String, String> request = new HashMap<>();
            request.put("reservationId", reservationId.toString());
            restTemplate.exchange(url, HttpMethod.PUT, new HttpEntity<>(request), Map.class);
        } catch (Exception e) {
            System.err.println("Failed to confirm inventory item: " + e.getMessage());
        }
    }

    private void releaseInventoryItem(UUID productId, UUID reservationId) {
        String url = inventoryServiceUrl + "/inventory/" + productId.toString() + "/release";
        try {
            Map<String, String> request = new HashMap<>();
            request.put("reservationId", reservationId.toString());
            restTemplate.exchange(url, HttpMethod.PUT, new HttpEntity<>(request), Map.class);
        } catch (Exception e) {
            System.err.println("Failed to release inventory item: " + e.getMessage());
        }
    }

    private UUID extractReservationId(OrderItem item) {
        try {
            Map map = objectMapper.readValue(item.getProductSnapshot(), Map.class);
            String resIdStr = (String) map.get("reservationId");
            return resIdStr != null ? UUID.fromString(resIdStr) : null;
        } catch (Exception e) {
            return null;
        }
    }

    // --- Kafka Publisher Methods ---

    private void publishOrderCreatedEvent(Order order) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("specversion", "1.0");
            event.put("type", "com.shopnow.order.created");
            event.put("source", "/services/order-service");
            event.put("id", "event-" + UUID.randomUUID().toString());
            event.put("time", Instant.now().toString());
            event.put("datacontenttype", "application/json");

            Map<String, Object> data = new HashMap<>();
            data.put("orderId", order.getId().toString());
            data.put("userId", order.getUserId().toString());
            data.put("totalAmount", order.getTotalAmount());
            data.put("timestamp", order.getCreatedAt().toString());

            java.util.List<Map<String, Object>> itemsList = order.getItems().stream().map(i -> {
                Map<String, Object> it = new HashMap<>();
                it.put("productId", i.getProductId().toString());
                it.put("quantity", i.getQuantity());
                it.put("unitPrice", i.getUnitPrice());
                return it;
            }).toList();
            data.put("items", itemsList);
            event.put("data", data);

            String messagePayload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send("order.created", order.getId().toString(), messagePayload);
            System.out.println("Published order.created Kafka event for Order ID: " + order.getId());
        } catch (Exception e) {
            System.err.println("Failed to publish order.created event: " + e.getMessage());
        }
    }

    private void publishOrderConfirmedEvent(Order order) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("specversion", "1.0");
            event.put("type", "com.shopnow.order.confirmed");
            event.put("source", "/services/order-service");
            event.put("id", "event-" + UUID.randomUUID().toString());
            event.put("time", Instant.now().toString());
            event.put("datacontenttype", "application/json");

            Map<String, Object> data = new HashMap<>();
            data.put("orderId", order.getId().toString());
            data.put("userId", order.getUserId().toString());
            data.put("estimatedDelivery", Instant.now().plus(3, ChronoUnit.DAYS).toString());
            event.put("data", data);

            String messagePayload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send("order.confirmed", order.getId().toString(), messagePayload);
        } catch (Exception e) {
            System.err.println("Failed to publish order.confirmed: " + e.getMessage());
        }
    }

    private void publishOrderCancelledEvent(Order order, String reason) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("specversion", "1.0");
            event.put("type", "com.shopnow.order.cancelled");
            event.put("source", "/services/order-service");
            event.put("id", "event-" + UUID.randomUUID().toString());
            event.put("time", Instant.now().toString());
            event.put("datacontenttype", "application/json");

            Map<String, Object> data = new HashMap<>();
            data.put("orderId", order.getId().toString());
            data.put("userId", order.getUserId().toString());
            data.put("reason", reason);
            data.put("refundAmount", order.getTotalAmount());
            event.put("data", data);

            String messagePayload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send("order.cancelled", order.getId().toString(), messagePayload);
        } catch (Exception e) {
            System.err.println("Failed to publish order.cancelled: " + e.getMessage());
        }
    }
}
