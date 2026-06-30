package com.shopnow.userservice.service;

import com.shopnow.userservice.config.JwtUtil;
import com.shopnow.userservice.dto.AuthResponse;
import com.shopnow.userservice.dto.LoginRequest;
import com.shopnow.userservice.dto.RegisterRequest;
import com.shopnow.userservice.dto.UserResponse;
import com.shopnow.userservice.model.Role;
import com.shopnow.userservice.model.User;
import com.shopnow.userservice.repository.UserRepository;
import io.jsonwebtoken.Claims;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RedisTemplate<String, Object> redisTemplate;

    // Resilient fallback storage when Redis is unavailable during local execution
    private final ConcurrentHashMap<String, String> localTokenStore = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> localRateLimiter = new ConcurrentHashMap<>();

    public UserService(UserRepository userRepository, JwtUtil jwtUtil, RedisTemplate<String, Object> redisTemplate) {
        this.userRepository = userRepository;
        this.passwordEncoder = new BCryptPasswordEncoder(12); // Strength 12 as requested
        this.jwtUtil = jwtUtil;
        this.redisTemplate = redisTemplate;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("EMAIL_ALREADY_EXISTS");
        }

        User user = new User();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPhone(request.getPhone());
        
        Role role = Role.CUSTOMER;
        if (request.getRole() != null) {
            try {
                role = Role.valueOf(request.getRole().toUpperCase());
            } catch (IllegalArgumentException e) {
                // Ignore and use default CUSTOMER
            }
        }
        user.setRole(role);
        user.setVerified(false); // verification required
        user.setActive(true);

        User savedUser = userRepository.save(user);

        String accessToken = jwtUtil.generateAccessToken(savedUser.getEmail(), savedUser.getRole().name(), savedUser.getId());
        String refreshToken = jwtUtil.generateRefreshToken(savedUser.getEmail());

        storeRefreshToken(savedUser.getEmail(), refreshToken);

        return new AuthResponse(savedUser.getId().toString(), savedUser.getEmail(), accessToken, refreshToken, jwtUtil.getAccessExpirationSeconds());
    }

    public AuthResponse login(LoginRequest request, String ipAddress) {
        String rateLimitKey = "ratelimit:login:" + request.getEmail();
        checkRateLimit(rateLimitKey);

        User user = userRepository.findByEmail(request.getEmail())
                .orElse(null);

        if (user == null || !user.isActive() || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            incrementRateLimit(rateLimitKey);
            throw new SecurityException("INVALID_CREDENTIALS");
        }

        // Reset rate limit on success
        clearRateLimit(rateLimitKey);

        String accessToken = jwtUtil.generateAccessToken(user.getEmail(), user.getRole().name(), user.getId());
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        storeRefreshToken(user.getEmail(), refreshToken);

        return new AuthResponse(user.getId().toString(), user.getEmail(), accessToken, refreshToken, jwtUtil.getAccessExpirationSeconds());
    }

    public AuthResponse refresh(String refreshToken) {
        try {
            Claims claims = jwtUtil.parseToken(refreshToken);
            String email = claims.getSubject();

            String stored = getStoredRefreshToken(email);
            if (stored == null || !stored.equals(refreshToken)) {
                throw new SecurityException("INVALID_REFRESH_TOKEN");
            }

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));

            String newAccessToken = jwtUtil.generateAccessToken(user.getEmail(), user.getRole().name(), user.getId());
            return new AuthResponse(user.getId().toString(), user.getEmail(), newAccessToken, refreshToken, jwtUtil.getAccessExpirationSeconds());
        } catch (Exception e) {
            throw new SecurityException("INVALID_REFRESH_TOKEN");
        }
    }

    public void logout(String email) {
        deleteRefreshToken(email);
    }

    public UserResponse getUserProfile(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        return new UserResponse(user);
    }

    public UserResponse updateUserProfile(UUID id, RegisterRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        User saved = userRepository.save(user);
        return new UserResponse(saved);
    }

    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        user.setActive(false); // soft delete
        userRepository.save(user);
    }

    // --- Redis/Local helpers ---

    private void storeRefreshToken(String email, String token) {
        try {
            redisTemplate.opsForValue().set("token:" + email, token, Duration.ofDays(7));
        } catch (Exception e) {
            localTokenStore.put(email, token);
        }
    }

    private String getStoredRefreshToken(String email) {
        try {
            Object token = redisTemplate.opsForValue().get("token:" + email);
            return token != null ? token.toString() : localTokenStore.get(email);
        } catch (Exception e) {
            return localTokenStore.get(email);
        }
    }

    private void deleteRefreshToken(String email) {
        try {
            redisTemplate.delete("token:" + email);
        } catch (Exception e) {
            // ignore
        }
        localTokenStore.remove(email);
    }

    private void checkRateLimit(String key) {
        int limit = 5;
        Integer attempts = 0;
        try {
            Object val = redisTemplate.opsForValue().get(key);
            attempts = val != null ? (Integer) val : 0;
        } catch (Exception e) {
            attempts = localRateLimiter.getOrDefault(key, 0);
        }

        if (attempts >= limit) {
            throw new SecurityException("RATE_LIMIT_EXCEEDED");
        }
    }

    private void incrementRateLimit(String key) {
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, Duration.ofMinutes(15));
            }
        } catch (Exception e) {
            localRateLimiter.put(key, localRateLimiter.getOrDefault(key, 0) + 1);
        }
    }

    private void clearRateLimit(String key) {
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            // ignore
        }
        localRateLimiter.remove(key);
    }
}
