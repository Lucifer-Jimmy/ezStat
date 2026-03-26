package org.jimmyl.ezstat.DTO;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.jimmyl.ezstat.Entity.Account;

import java.math.BigDecimal;

public record AccountSaveRequest(
        @NotBlank(message = "账户名称不能为空") @Size(max = 50, message = "账户名称长度不能超过50") String name,
        @NotNull(message = "账户类型不能为空") Account.AccountType type,
        @NotNull(message = "初始余额不能为空") @DecimalMin(value = "0.00", message = "余额不能为负数") @Digits(integer = 17, fraction = 2, message = "余额格式不合法") BigDecimal balance,
        @Size(max = 500, message = "描述长度不能超过500") String description,
        Boolean enabled
) {
}

