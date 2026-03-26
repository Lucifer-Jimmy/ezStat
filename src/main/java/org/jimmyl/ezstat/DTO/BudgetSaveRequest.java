package org.jimmyl.ezstat.DTO;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.YearMonth;

public record BudgetSaveRequest(
        @NotNull(message = "预算月份不能为空") YearMonth month,
        @NotNull(message = "预算金额不能为空") @DecimalMin(value = "0.01", message = "预算金额必须大于0") @Digits(integer = 17, fraction = 2, message = "预算金额格式不合法") BigDecimal amount
) {
}

