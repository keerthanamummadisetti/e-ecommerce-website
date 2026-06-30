package com.shopnow.userservice.controller;

import com.shopnow.userservice.dto.RegisterRequest;
import com.shopnow.userservice.dto.UserResponse;
import com.shopnow.userservice.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable UUID id) {
        validateSelfOrAdmin(id);
        UserResponse response = userService.getUserProfile(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable UUID id, @RequestBody RegisterRequest request) {
        validateSelfOrAdmin(id);
        UserResponse response = userService.updateUserProfile(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        // Only admins can delete, checked at config/SecurityConfig level but good to double check
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    private void validateSelfOrAdmin(UUID targetUserId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new SecurityException("UNAUTHORIZED");
        }

        // Inside JwtAuthenticationFilter, credentials holds target userId string
        String currentUserIdStr = (String) authentication.getCredentials();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin && (currentUserIdStr == null || !currentUserIdStr.equals(targetUserId.toString()))) {
            throw new SecurityException("ACCESS_DENIED");
        }
    }
}
