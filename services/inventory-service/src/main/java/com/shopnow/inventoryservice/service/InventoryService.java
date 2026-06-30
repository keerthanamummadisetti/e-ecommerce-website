package com.shopnow.inventoryservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shopnow.inventoryservice.dto.BulkUpdateRequest;
import com.shopnow.inventoryservice.model.Inventory;
import com.shopnow.inventoryservice.model.Reservation;
import com.shopnow.inventoryservice.repository.InventoryRepository;
import com.shopnow.inventoryservice.repository.ReservationRepository;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ReservationRepository reservationRepository;
    private final RedisLockService lockService;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public InventoryService(InventoryRepository inventoryRepository,
                            ReservationRepository reservationRepository,
                            RedisLockService lockService,
                            KafkaTemplate<String, String> kafkaTemplate) {
        this.inventoryRepository = inventoryRepository;
        this.reservationRepository = reservationRepository;
        this.lockService = lockService;
        this.kafkaTemplate = kafkaTemplate;
    }

    public int getStock(UUID productId) {
        return inventoryRepository.findByProductId(productId)
                .map(Inventory::getQuantity)
                .orElse(0);
    }

    @Transactional
    public UUID reserveStock(UUID productId, int quantity) {
        String lockKey = "lock:inventory:" + productId.toString();
        String lockValue = UUID.randomUUID().toString();

        // 1. Acquire Redis Lock (Redlock pattern)
        boolean locked = lockService.acquireLock(lockKey, lockValue, 10);
        if (!locked) {
            throw new IllegalStateException("INVENTORY_LOCKED_TRY_AGAIN");
        }

        try {
            Inventory inventory = inventoryRepository.findByProductId(productId)
                    .orElseThrow(() -> new IllegalArgumentException("PRODUCT_NOT_IN_INVENTORY"));

            if (inventory.getQuantity() < quantity) {
                throw new IllegalArgumentException("INSUFFICIENT_STOCK");
            }

            // Deduct stock immediately to hold reservation
            inventory.setQuantity(inventory.getQuantity() - quantity);
            inventoryRepository.save(inventory);

            // Create reservation entry with 15 minutes TTL
            Reservation reservation = new Reservation();
            reservation.setProductId(productId);
            reservation.setQuantity(quantity);
            reservation.setExpiresAt(Instant.now().plus(15, ChronoUnit.MINUTES));
            reservation.setStatus("PENDING");

            Reservation saved = reservationRepository.save(reservation);
            return saved.getId();

        } finally {
            // 2. Release Lock
            lockService.releaseLock(lockKey, lockValue);
        }
    }

    @Transactional
    public void releaseReservation(UUID reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("RESERVATION_NOT_FOUND"));

        if (!"PENDING".equals(reservation.getStatus())) {
            return; // Already processed
        }

        Inventory inventory = inventoryRepository.findByProductId(reservation.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("PRODUCT_NOT_IN_INVENTORY"));

        // Return stock back
        inventory.setQuantity(inventory.getQuantity() + reservation.getQuantity());
        inventoryRepository.save(inventory);

        // Update reservation status
        reservation.setStatus("RELEASED");
        reservationRepository.save(reservation);
        
        System.out.println("Released reservation: " + reservationId);
    }

    @Transactional
    public void confirmReservation(UUID reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("RESERVATION_NOT_FOUND"));

        if (!"PENDING".equals(reservation.getStatus())) {
            return;
        }

        reservation.setStatus("CONFIRMED");
        reservationRepository.save(reservation);

        // Check if low-stock alert is triggered
        Inventory inventory = inventoryRepository.findByProductId(reservation.getProductId()).orElse(null);
        if (inventory != null && inventory.getQuantity() < inventory.getThreshold()) {
            publishLowStockAlert(inventory);
        }
    }

    @Transactional
    public void bulkUpdate(List<BulkUpdateRequest> updates) {
        for (BulkUpdateRequest request : updates) {
            Inventory inventory = inventoryRepository.findByProductId(request.getProductId())
                    .orElse(new Inventory());
            
            if (inventory.getProductId() == null) {
                inventory.setProductId(request.getProductId());
            }
            inventory.setQuantity(request.getQuantity());
            inventory.setWarehouseId(request.getWarehouseId());
            inventory.setThreshold(request.getThreshold());

            inventoryRepository.save(inventory);
        }
    }

    // Cron job to run every 1 minute to release expired reservations
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void releaseExpiredReservations() {
        List<Reservation> expired = reservationRepository.findByStatusAndExpiresAtBefore("PENDING", Instant.now());
        for (Reservation res : expired) {
            releaseReservation(res.getId());
        }
    }

    private void publishLowStockAlert(Inventory inventory) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("specversion", "1.0");
            event.put("type", "com.shopnow.inventory.low_stock");
            event.put("source", "/services/inventory-service");
            event.put("id", "event-" + UUID.randomUUID().toString());
            event.put("time", Instant.now().toString());
            event.put("datacontenttype", "application/json");

            Map<String, Object> data = new HashMap<>();
            data.put("productId", inventory.getProductId().toString());
            data.put("currentQty", inventory.getQuantity());
            data.put("threshold", inventory.getThreshold());
            data.put("warehouseId", inventory.getWarehouseId());
            event.put("data", data);

            String messagePayload = objectMapper.writeValueAsString(event);
            
            // Resilient Kafka send
            kafkaTemplate.send("inventory.low_stock", inventory.getProductId().toString(), messagePayload);
            System.out.println("Published inventory.low_stock Kafka event for Product ID: " + inventory.getProductId());
        } catch (Exception e) {
            System.err.println("Failed to publish inventory.low_stock Kafka event: " + e.getMessage());
        }
    }
}
