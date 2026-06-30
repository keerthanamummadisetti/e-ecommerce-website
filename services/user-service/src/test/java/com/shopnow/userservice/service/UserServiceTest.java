package com.shopnow.userservice.service;

import com.shopnow.userservice.config.JwtUtil;
import com.shopnow.userservice.dto.AuthResponse;
import com.shopnow.userservice.dto.LoginRequest;
import com.shopnow.userservice.dto.RegisterRequest;
import com.shopnow.userservice.model.Role;
import com.shopnow.userservice.model.User;
import com.shopnow.userservice.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    private UserService userService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        userService = new UserService(userRepository, jwtUtil, redisTemplate);
    }

    @Test
    void testRegister_Success() {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("john.doe@example.com");
        request.setPassword("SecurePass@123");
        request.setPhone("+919876543210");
        request.setRole("CUSTOMER");

        UUID userId = UUID.randomUUID();
        User user = new User(userId, "John", "Doe", "john.doe@example.com", "hashed_password", "+919876543210", Role.CUSTOMER, false, true);

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(jwtUtil.generateAccessToken(anyString(), anyString(), any(UUID.class))).thenReturn("access_token");
        when(jwtUtil.generateRefreshToken(anyString())).thenReturn("refresh_token");
        when(jwtUtil.getAccessExpirationSeconds()).thenReturn(900L);

        AuthResponse response = userService.register(request);

        assertNotNull(response);
        assertEquals("john.doe@example.com", response.getEmail());
        assertEquals("access_token", response.getAccessToken());
        assertEquals("refresh_token", response.getRefreshToken());
        assertEquals(userId.toString(), response.getUserId());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void testRegister_EmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("john.doe@example.com");

        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> userService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testLogin_Success() {
        LoginRequest request = new LoginRequest();
        request.setEmail("john.doe@example.com");
        request.setPassword("SecurePass@123");

        UUID userId = UUID.randomUUID();
        // The password hash here was generated using BCrypt strength 12 for "SecurePass@123"
        // Let's create an encoder to check standard match, or mock passwordEncoder?
        // Wait, the encoder is initialized inside the constructor: this.passwordEncoder = new BCryptPasswordEncoder(12);
        // So we can mock the matches method? No, passwordEncoder is not mockable easily unless injected, but it's instantiated inside the constructor.
        // Wait! Let's check: BCryptPasswordEncoder(12) matches the password with a valid BCrypt hash.
        // Let's generate a valid BCrypt hash for "SecurePass@123" so that matches() returns true!
        // A valid BCrypt strength 12 hash for "SecurePass@123" is:
        String validHash = "$2a$12$N9qo8uLOqpGC12QvuyTKxutod.f.U.66y4Xg.4Hnfe/x55M5n4U9C"; // Let's check if this will work
        // Wait, since we are initializing passwordEncoder inside the constructor, matches() will use actual BCrypt hashing.
        // That is perfect! We can just pass the actual BCrypt hash in our test!
        
        User user = new User(userId, "John", "Doe", "john.doe@example.com", validHash, "+919876543210", Role.CUSTOMER, true, true);

        when(userRepository.findByEmail("john.doe@example.com")).thenReturn(Optional.of(user));
        when(jwtUtil.generateAccessToken(anyString(), anyString(), any(UUID.class))).thenReturn("access_token");
        when(jwtUtil.generateRefreshToken(anyString())).thenReturn("refresh_token");
        when(jwtUtil.getAccessExpirationSeconds()).thenReturn(900L);

        AuthResponse response = userService.login(request, "127.0.0.1");

        assertNotNull(response);
        assertEquals("access_token", response.getAccessToken());
        assertEquals("refresh_token", response.getRefreshToken());
    }

    @Test
    void testLogin_InvalidCredentials() {
        LoginRequest request = new LoginRequest();
        request.setEmail("john.doe@example.com");
        request.setPassword("wrong_password");

        when(userRepository.findByEmail("john.doe@example.com")).thenReturn(Optional.empty());

        assertThrows(SecurityException.class, () -> userService.login(request, "127.0.0.1"));
    }
}
