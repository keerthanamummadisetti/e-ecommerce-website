package com.shopnow.orderservice.service;

import com.shopnow.orderservice.dto.OrderRequest;
import com.shopnow.orderservice.model.Order;
import com.shopnow.orderservice.model.OrderStatus;
import com.shopnow.orderservice.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.kafka.core.KafkaTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private KafkaTemplate<String, String> kafkaTemplate;

    private OrderService orderService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        orderService = new OrderService(orderRepository, kafkaTemplate);
    }

    @Test
    void testGetOrder_Exists() {
        UUID orderId = UUID.randomUUID();
        Order order = new Order(orderId, UUID.randomUUID(), OrderStatus.PENDING, BigDecimal.valueOf(99.99), "Address 1", "key123", null);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        Order result = orderService.getOrderById(orderId);

        assertNotNull(result);
        assertEquals(orderId, result.getId());
    }

    @Test
    void testGetOrder_NotExists() {
        UUID orderId = UUID.randomUUID();
        when(orderRepository.findById(orderId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> orderService.getOrderById(orderId));
    }

    @Test
    void testCreateOrder_Success() {
        OrderRequest request = new OrderRequest();
        request.setUserId(UUID.randomUUID());
        request.setTotalAmount(BigDecimal.valueOf(50.00));
        request.setShippingAddr("123 Street");
        request.setIdempotencyKey("idemp_123");
        
        List<OrderRequest.OrderItemDto> items = new ArrayList<>();
        OrderRequest.OrderItemDto item = new OrderRequest.OrderItemDto();
        item.setProductId(UUID.randomUUID());
        item.setQuantity(2);
        item.setPrice(BigDecimal.valueOf(25.00));
        items.add(item);
        request.setItems(items);

        UUID orderId = UUID.randomUUID();
        Order order = new Order(orderId, request.getUserId(), OrderStatus.PENDING, request.getTotalAmount(), request.getShippingAddr(), request.getIdempotencyKey(), null);

        when(orderRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenReturn(order);

        Order result = orderService.createOrder(request);

        assertNotNull(result);
        assertEquals(orderId, result.getId());
        verify(orderRepository, times(1)).save(any(Order.class));
    }

    @Test
    void testConfirmOrder_Success() {
        UUID orderId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        Order order = new Order(orderId, UUID.randomUUID(), OrderStatus.PENDING, BigDecimal.valueOf(99.99), "Address 1", "key123", null);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        orderService.confirmOrder(orderId, paymentId);

        assertEquals(OrderStatus.CONFIRMED, order.getStatus());
        assertEquals(paymentId, order.getPaymentId());
        verify(orderRepository, times(1)).save(order);
    }
}
