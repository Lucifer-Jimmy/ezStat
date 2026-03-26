package org.jimmyl.ezstat.DTO;

import java.time.LocalDateTime;
import java.util.Map;

public record ErrorResponse(
        int status,
        String error,
        String code,
        String message,
        Map<String, String> details,
        LocalDateTime timestamp
) {
    public static ErrorResponse of(int status, String error, String message) {
        return new ErrorResponse(status, error, error, message, null, LocalDateTime.now());
    }

    public static ErrorResponse of(int status, String error, String code, String message) {
        return new ErrorResponse(status, error, code, message, null, LocalDateTime.now());
    }

    public static ErrorResponse ofValidation(int status, String error, String code, String message, Map<String, String> details) {
        return new ErrorResponse(status, error, code, message, details, LocalDateTime.now());
    }
}

