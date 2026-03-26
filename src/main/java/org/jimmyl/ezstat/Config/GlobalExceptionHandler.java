package org.jimmyl.ezstat.Config;

import jakarta.validation.ConstraintViolationException;
import org.jimmyl.ezstat.DTO.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        FieldError first = ex.getBindingResult().getFieldErrors().stream().findFirst().orElse(null);
        String message = first == null ? "请求参数不合法" : first.getDefaultMessage();
        Map<String, String> details = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fieldError -> {
            if (!details.containsKey(fieldError.getField())) {
                details.put(fieldError.getField(), fieldError.getDefaultMessage());
            }
        });
        return ResponseEntity.badRequest().body(ErrorResponse.ofValidation(400, "BAD_REQUEST", "VALIDATION_ERROR", message, details));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .findFirst()
                .map(v -> v.getMessage())
                .orElse("请求参数不合法");
        return ResponseEntity.badRequest().body(ErrorResponse.of(400, "BAD_REQUEST", "VALIDATION_ERROR", message));
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ErrorResponse> handleTypeMismatch(Exception ex) {
        return ResponseEntity.badRequest().body(ErrorResponse.of(400, "BAD_REQUEST", "INVALID_FORMAT", "请求参数格式不正确"));
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<ErrorResponse> handleBusiness(RuntimeException ex) {
        return ResponseEntity.badRequest().body(ErrorResponse.of(400, "BAD_REQUEST", "BUSINESS_ERROR", ex.getMessage()));
    }

    @ExceptionHandler({UsernameNotFoundException.class, AccessDeniedException.class})
    public ResponseEntity<ErrorResponse> handleForbidden(Exception ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of(403, "FORBIDDEN", "ACCESS_DENIED", ex.getMessage()));
    }

    @ExceptionHandler({DisabledException.class, LockedException.class})
    public ResponseEntity<ErrorResponse> handleUnauthorized(Exception ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of(401, "UNAUTHORIZED", "AUTH_ERROR", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnknown(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(500, "INTERNAL_SERVER_ERROR", "INTERNAL_ERROR", "系统异常，请稍后重试"));
    }
}

