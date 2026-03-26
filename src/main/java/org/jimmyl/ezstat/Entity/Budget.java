package org.jimmyl.ezstat.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;


@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "budgets",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "month"}))
public class Budget {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 7)
    private YearMonth month;  // 格式为 "YYYY-MM"

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;  // 预算金额

    @Transient
    private BigDecimal spent = BigDecimal.ZERO;  // 已花费金额（从交易表实时计算）

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;  // 预算所属用户

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public BigDecimal getRemainingAmount() {
        BigDecimal used = spent != null ? spent : BigDecimal.ZERO;
        return amount.subtract(used);
    }

    public BigDecimal getUsagePercentage() {
        if(amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal used = spent != null ? spent : BigDecimal.ZERO;
        return used.multiply(new BigDecimal(100)).divide(amount, 2, RoundingMode.HALF_UP);
    }
}
