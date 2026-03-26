package org.jimmyl.ezstat.Entity;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不合法")
    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(nullable = false)
    private Integer failedLoginAttempts = 0;

    private LocalDateTime accountLockedUntil;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Role role = Role.USER;

    public enum Role {
        USER,
        ADMIN
    }

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public boolean isAdmin() {
        return this.role == Role.ADMIN;
    }
}
