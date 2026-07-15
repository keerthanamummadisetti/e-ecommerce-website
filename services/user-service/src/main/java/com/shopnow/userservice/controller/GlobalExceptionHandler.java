package com.shopnow.userservice.controller;

import com.shopnow.userservice.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.UUID;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        String msg = ex.getMessage();
        HttpStatus status = HttpStatus.BAD_REQUEST;
        String error = "BAD_REQUEST";

        if ("EMAIL_ALREADY_EXISTS".equals(msg)) {
            status = HttpStatus.CONFLICT;
            error = "EMAIL_ALREADY_EXISTS";
            msg = "An account with this email already exists.";
        } else if ("USER_NOT_FOUND".equals(msg)) {
            status = HttpStatus.NOT_FOUND;
            error = "USER_NOT_FOUND";
            msg = "The requested user was not found.";
        }

        ErrorResponse errorResponse = new ErrorResponse(error, msg, UUID.randomUUID().toString());
        return ResponseEntity.status(status).body(errorResponse);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ErrorResponse> handleSecurityException(SecurityException ex) {
        String msg = ex.getMessage();
        HttpStatus status = HttpStatus.UNAUTHORIZED;
        String error = "UNAUTHORIZED";

        if ("RATE_LIMIT_EXCEEDED".equals(msg)) {
            status = HttpStatus.TOO_MANY_REQUESTS;
            error = "RATE_LIMIT_EXCEEDED";
            msg = "Too many failed login attempts. Please try again in 15 minutes.";
        } else if ("ACCESS_DENIED".equals(msg)) {
            status = HttpStatus.FORBIDDEN;
            error = "FORBIDDEN";
            msg = "You do not have permission to access this resource.";
        } else if ("INVALID_CREDENTIALS".equals(msg)) {
            status = HttpStatus.UNAUTHORIZED;
            error = "INVALID_CREDENTIALS";
            msg = "Invalid email or password.";
        }

        ErrorResponse errorResponse = new ErrorResponse(error, msg, UUID.randomUUID().toString());
        return ResponseEntity.status(status).body(errorResponse);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        String details = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));

        ErrorResponse errorResponse = new ErrorResponse("VALIDATION_ERROR", details, UUID.randomUUID().toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        ErrorResponse errorResponse = new ErrorResponse("NOT_FOUND", ex.getMessage(), UUID.randomUUID().toString());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        ErrorResponse errorResponse = new ErrorResponse("INTERNAL_SERVER_ERROR", ex.getMessage(), UUID.randomUUID().toString());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
}
