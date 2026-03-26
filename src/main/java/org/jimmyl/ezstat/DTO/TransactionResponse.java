package org.jimmyl.ezstat.DTO;

import org.jimmyl.ezstat.Entity.Transaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionResponse(
        Long id,
        Transaction.TransactionType type,
        BigDecimal amount,
        LocalDateTime transactionDate,
        Long accountId,
        String accountName,
        Long mainCategoryId,
        String mainCategoryName,
        Long subCategoryId,
        String subCategoryName,
        String description
) {
    public static TransactionResponse from(Transaction transaction) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getType(),
                transaction.getAmount(),
                transaction.getTransactionDate(),
                transaction.getAccount().getId(),
                transaction.getAccount().getName(),
                transaction.getMainCategory().getId(),
                transaction.getMainCategory().getName(),
                transaction.getSubCategory().getId(),
                transaction.getSubCategory().getName(),
                transaction.getDescription()
        );
    }
}

