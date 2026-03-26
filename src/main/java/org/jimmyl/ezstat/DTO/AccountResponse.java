package org.jimmyl.ezstat.DTO;

import org.jimmyl.ezstat.Entity.Account;

import java.math.BigDecimal;

public record AccountResponse(
        Long id,
        String name,
        Account.AccountType type,
        BigDecimal balance,
        String description,
        Boolean enabled
) {
    public static AccountResponse from(Account account) {
        return new AccountResponse(
                account.getId(),
                account.getName(),
                account.getType(),
                account.getBalance(),
                account.getDescription(),
                account.getEnabled()
        );
    }
}

