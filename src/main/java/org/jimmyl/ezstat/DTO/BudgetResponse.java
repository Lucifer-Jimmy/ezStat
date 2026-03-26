package org.jimmyl.ezstat.DTO;

import org.jimmyl.ezstat.Entity.Budget;

import java.math.BigDecimal;
import java.time.YearMonth;

public record BudgetResponse(
        Long id,
        YearMonth month,
        BigDecimal amount,
        BigDecimal spent,
        BigDecimal remaining,
        BigDecimal usagePercentage
) {
    public static BudgetResponse from(Budget budget) {
        return new BudgetResponse(
                budget.getId(),
                budget.getMonth(),
                budget.getAmount(),
                budget.getSpent(),
                budget.getRemainingAmount(),
                budget.getUsagePercentage()
        );
    }
}

