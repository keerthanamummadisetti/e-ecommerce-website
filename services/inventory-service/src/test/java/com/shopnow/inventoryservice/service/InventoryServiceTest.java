package com.shopnow.inventoryservice.service;

import com.shopnow.inventoryservice.model.Inventory;
import com.shopnow.inventoryservice.model.Reservation;
import com.shopnow.inventoryservice.repository.InventoryRepository;
import com.shopnow.inventoryservice.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class InventoryServiceTest {

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private RedisLockService lockService;

    @Mock
    private KafkaTemplate<String, String> kafkaTemplate;

    private InventoryService inventoryService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        inventoryService = new InventoryService(inventoryRepository, reservationRepository, lockService, kafkaTemplate);
    }

    @Test
    void testGetStock_Exists() {
        UUID productId = UUID.randomUUID();
        Inventory inventory = new Inventory(UUID.randomUUID(), productId, 50, "WH1", 5);

        when(inventoryRepository.findByProductId(productId)).thenReturn(Optional.of(inventory));

        int qty = inventoryService.getStock(productId);

        assertEquals(50, qty);
    }

    @Test
    void testGetStock_NotExists() {
        UUID productId = UUID.randomUUID();
        when(inventoryRepository.findByProductId(productId)).thenReturn(Optional.empty());

        int qty = inventoryService.getStock(productId);

        assertEquals(0, qty);
    }

    @Test
    void testReserveStock_Success() {
        UUID productId = UUID.randomUUID();
        Inventory inventory = new Inventory(UUID.randomUUID(), productId, 50, "WH1", 5);
        Reservation reservation = new Reservation(UUID.randomUUID(), productId, 10, Instant.now().plusSeconds(900), "PENDING");

        when(lockService.acquireLock(anyString(), anyString(), anyLong())).thenReturn(true);
        when(inventoryRepository.findByProductId(productId)).thenReturn(Optional.of(inventory));
        when(reservationRepository.save(any(Reservation.class))).thenReturn(reservation);

        UUID resId = inventoryService.reserveStock(productId, 10);

        assertNotNull(resId);
        assertEquals(40, inventory.getQuantity());
        verify(inventoryRepository, times(1)).save(inventory);
        verify(reservationRepository, times(1)).save(any(Reservation.class));
    }

    @Test
    void testReserveStock_InsufficientStock() {
        UUID productId = UUID.randomUUID();
        Inventory inventory = new Inventory(UUID.randomUUID(), productId, 5, "WH1", 5);

        when(lockService.acquireLock(anyString(), anyString(), anyLong())).thenReturn(true);
        when(inventoryRepository.findByProductId(productId)).thenReturn(Optional.of(inventory));

        assertThrows(IllegalArgumentException.class, () -> inventoryService.reserveStock(productId, 10));
    }

    @Test
    void testReleaseReservation_Success() {
        UUID reservationId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        Reservation reservation = new Reservation(reservationId, productId, 10, Instant.now().plusSeconds(900), "PENDING");
        Inventory inventory = new Inventory(UUID.randomUUID(), productId, 40, "WH1", 5);

        when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));
        when(inventoryRepository.findByProductId(productId)).thenReturn(Optional.of(inventory));

        inventoryService.releaseReservation(reservationId);

        assertEquals(50, inventory.getQuantity());
        assertEquals("RELEASED", reservation.getStatus());
        verify(inventoryRepository, times(1)).save(inventory);
        verify(reservationRepository, times(1)).save(reservation);
    }
}
