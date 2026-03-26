package org.jimmyl.ezstat.DTO;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record TransferSaveRequest(
        @NotNull(message = "转出账户不能为空") Long fromAccountId,
        @NotNull(message = "转入账户不能为空") Long toAccountId,
        @NotNull(message = "转账金额不能为空") @DecimalMin(value = "0.01", message = "转账金额必须大于0") @Digits(integer = 17, fraction = 2, message = "转账金额格式不合法") BigDecimal amount,
        @Size(max = 500, message = "备注长度不能超过500") String description
) {
}

