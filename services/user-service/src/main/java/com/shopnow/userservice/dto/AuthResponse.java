package com.shopnow.userservice.dto;

public class AuthResponse {

    private String userId;
    private String email;
    private String accessToken;
    private String refreshToken;
    private long expiresIn;
    private final String tokenType = "Bearer";

    public AuthResponse() {}

    public AuthResponse(String userId, String email, String accessToken, String refreshToken, long expiresIn) {
        this.userId = userId;
        this.email = email;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresIn = expiresIn;
    }

    // Getters and Setters
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public long getExpiresIn() { return expiresIn; }
    public void setExpiresIn(long expiresIn) { this.expiresIn = expiresIn; }

    public String getTokenType() { return tokenType; }
}
