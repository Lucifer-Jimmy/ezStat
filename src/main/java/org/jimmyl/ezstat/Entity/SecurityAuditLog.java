package org.jimmyl.ezstat.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@NoArgsConstructor
@Table(name = "security_audit_logs", indexes = {
        @Index(name = "idx_audit_created_at", columnList = "createdAt"),
        @Index(name = "idx_audit_username", columnList = "username"),
        @Index(name = "idx_audit_action", columnList = "action")
})
public class SecurityAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 50, nullable = false)
    private String action;

    @Column(nullable = false)
    private Boolean success;

    private Long userId;

    @Column(length = 128)
    private String username;

    @Column(length = 255)
    private String message;

    @Column(length = 64)
    private String ipAddress;

    @Column(length = 255)
    private String userAgent;

    @CreationTimestamp
    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;
}

