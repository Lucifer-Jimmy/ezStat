package org.jimmyl.ezstat.Service;

import jakarta.servlet.http.HttpServletRequest;
import org.jimmyl.ezstat.Entity.SecurityAuditLog;
import org.jimmyl.ezstat.Repository.SecurityAuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class SecurityAuditLogService {

    private final SecurityAuditLogRepository securityAuditLogRepository;

    public SecurityAuditLogService(SecurityAuditLogRepository securityAuditLogRepository) {
        this.securityAuditLogRepository = securityAuditLogRepository;
    }

    @Transactional
    public void log(String action, boolean success, Long userId, String username, String message) {
        SecurityAuditLog log = new SecurityAuditLog();
        log.setAction(action);
        log.setSuccess(success);
        log.setUserId(userId);
        log.setUsername(username);
        log.setMessage(message);

        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletAttributes) {
            HttpServletRequest request = servletAttributes.getRequest();
            log.setIpAddress(extractClientIp(request));
            log.setUserAgent(request.getHeader("User-Agent"));
        }

        securityAuditLogRepository.save(log);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

