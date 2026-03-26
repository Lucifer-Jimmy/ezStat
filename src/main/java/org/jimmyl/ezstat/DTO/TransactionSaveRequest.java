package org.jimmyl.ezstat.DTO;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import org.jimmyl.ezstat.Entity.Transaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionSaveRequest(
        @NotNull(message = "交易类型不能为空") Transaction.TransactionType type,
        @NotNull(message = "金额不能为空") @DecimalMin(value = "0.01", message = "金额必须大于0") @Digits(integer = 17, fraction = 2, message = "金额格式不合法") BigDecimal amount,
        @NotNull(message = "交易时间不能为空") @PastOrPresent(message = "交易时间不能晚于当前时间") LocalDateTime transactionDate,
        @NotNull(message = "账户不能为空") Long accountId,
        @NotNull(message = "主分类不能为空") Long mainCategoryId,
        @NotNull(message = "子分类不能为空") Long subCategoryId,
        @Size(max = 500, message = "备注长度不能超过500") String description
) {
}

