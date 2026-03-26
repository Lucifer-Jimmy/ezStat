package org.jimmyl.ezstat.DTO;

import org.jimmyl.ezstat.Entity.Transfer;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransferResponse(
        Long id,
        Long fromAccountId,
        String fromAccountName,
        Long toAccountId,
        String toAccountName,
        BigDecimal amount,
        LocalDateTime occurredAt,
        String description
) {
    public static TransferResponse from(Transfer transfer) {
        return new TransferResponse(
                transfer.getId(),
                transfer.getFromAccount().getId(),
                transfer.getFromAccount().getName(),
                transfer.getToAccount().getId(),
                transfer.getToAccount().getName(),
                transfer.getAmount(),
                transfer.getOccurredAt(),
                transfer.getDescription()
        );
    }
}

