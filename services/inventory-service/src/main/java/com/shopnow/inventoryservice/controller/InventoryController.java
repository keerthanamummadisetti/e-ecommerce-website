package com.shopnow.inventoryservice.controller;

import com.shopnow.inventoryservice.dto.BulkUpdateRequest;
import com.shopnow.inventoryservice.dto.ReserveRequest;
import com.shopnow.inventoryservice.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping("/{productId}")
    public ResponseEntity<Map<String, Object>> getStock(@PathVariable UUID productId) {
        int quantity = inventoryService.getStock(productId);
        Map<String, Object> response = new HashMap<>();
        response.put("productId", productId);
        response.put("quantity", quantity);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{productId}/reserve")
    public ResponseEntity<Map<String, Object>> reserveStock(@PathVariable UUID productId, @Valid @RequestBody ReserveRequest request) {
        if (!productId.equals(request.getProductId())) {
            return ResponseEntity.badRequest().build();
        }
        UUID reservationId = inventoryService.reserveStock(request.getProductId(), request.getQuantity());
        Map<String, Object> response = new HashMap<>();
        response.put("reservationId", reservationId);
        response.put("status", "SUCCESS");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{productId}/release")
    public ResponseEntity<Map<String, Object>> releaseStock(@PathVariable UUID productId, @RequestBody Map<String, String> body) {
        String reservationIdStr = body.get("reservationId");
        if (reservationIdStr == null) {
            return ResponseEntity.badRequest().build();
        }
        inventoryService.releaseReservation(UUID.fromString(reservationIdStr));
        Map<String, Object> response = new HashMap<>();
        response.put("status", "RELEASED");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{productId}/reduce")
    public ResponseEntity<Map<String, Object>> reduceStock(@PathVariable UUID productId, @RequestBody Map<String, String> body) {
        // Redirection as part of order completion flow
        String reservationIdStr = body.get("reservationId");
        if (reservationIdStr == null) {
            return ResponseEntity.badRequest().build();
        }
        inventoryService.confirmReservation(UUID.fromString(reservationIdStr));
        Map<String, Object> response = new HashMap<>();
        response.put("status", "REDUCED");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/bulk-update")
    public ResponseEntity<Map<String, Object>> bulkUpdate(@Valid @RequestBody List<BulkUpdateRequest> updates) {
        inventoryService.bulkUpdate(updates);
        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "Bulk inventory update successful");
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
