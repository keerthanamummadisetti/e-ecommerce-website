package com.shopnow.orderservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shopnow.orderservice.dto.OrderRequest;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class OrderKafkaListener {

    private final OrderService orderService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OrderKafkaListener(OrderService orderService) {
        this.orderService = orderService;
    }

    @KafkaListener(topics = "cart.checkout_initiated", groupId = "order-group")
    public void handleCheckoutInitiated(String message) {
        try {
            System.out.println("Received cart.checkout_initiated Kafka event");
            JsonNode rootNode = objectMapper.readTree(message);
            JsonNode dataNode = rootNode.get("data");

            OrderRequest request = new OrderRequest();
            if (dataNode.has("orderId")) {
                request.setOrderId(UUID.fromString(dataNode.get("orderId").asText()));
            }
            request.setUserId(UUID.fromString(dataNode.get("userId").asText()));
            request.setTotalAmount(new BigDecimal(dataNode.get("totalAmount").asText()));
            request.setShippingAddr(dataNode.get("shippingAddress").asText());
            // Map cartId as the idempotencyKey
            request.setIdempotencyKey(dataNode.get("cartId").asText());

            List<OrderRequest.OrderItemDto> itemsList = new ArrayList<>();
            JsonNode itemsNode = dataNode.get("items");
            if (itemsNode != null && itemsNode.isArray()) {
                for (JsonNode itemNode : itemsNode) {
                    OrderRequest.OrderItemDto itemDto = new OrderRequest.OrderItemDto();
                    itemDto.setProductId(UUID.fromString(itemNode.get("productId").asText()));
                    itemDto.setQuantity(itemNode.get("quantity").asInt());
                    itemDto.setPrice(new BigDecimal(itemNode.get("unitPrice").asText()));
                    itemDto.setProductSnapshot(itemNode.toString());
                    itemsList.add(itemDto);
                }
            }
            request.setItems(itemsList);

            // Execute order creation
            orderService.createOrder(request);

        } catch (Exception e) {
            System.err.println("Error parsing cart.checkout_initiated event: " + e.getMessage());
        }
    }

    @KafkaListener(topics = "payment.success", groupId = "order-group")
    public void handlePaymentSuccess(String message) {
        try {
            System.out.println("Received payment.success Kafka event");
            JsonNode rootNode = objectMapper.readTree(message);
            JsonNode dataNode = rootNode.get("data");

            UUID orderId = UUID.fromString(dataNode.get("orderId").asText());
            UUID paymentId = UUID.fromString(dataNode.get("paymentId").asText());

            orderService.confirmOrder(orderId, paymentId);
        } catch (Exception e) {
            System.err.println("Error processing payment.success: " + e.getMessage());
        }
    }

    @KafkaListener(topics = "payment.failed", groupId = "order-group")
    public void handlePaymentFailed(String message) {
        try {
            System.out.println("Received payment.failed Kafka event");
            JsonNode rootNode = objectMapper.readTree(message);
            JsonNode dataNode = rootNode.get("data");

            UUID orderId = UUID.fromString(dataNode.get("orderId").asText());
            String reason = dataNode.has("reason") ? dataNode.get("reason").asText() : "Payment failure";

            orderService.cancelOrder(orderId, reason);
        } catch (Exception e) {
            System.err.println("Error processing payment.failed: " + e.getMessage());
        }
    }
}
