package com.shopnow.userservice.dto;

import java.time.Instant;

public class ErrorResponse {

    private String error;
    private String message;
    private String timestamp;
    private String traceId;

    public ErrorResponse() {}

    public ErrorResponse(String error, String message, String traceId) {
        this.error = error;
        this.message = message;
        this.timestamp = Instant.now().toString();
        this.traceId = traceId;
    }

    // Getters and Setters
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getTraceId() { return traceId; }
    public void setTraceId(String traceId) { this.traceId = traceId; }
}
