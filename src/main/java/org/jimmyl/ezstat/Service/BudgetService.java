package org.jimmyl.ezstat.Service;

import org.jimmyl.ezstat.DTO.BudgetResponse;
import org.jimmyl.ezstat.DTO.BudgetSaveRequest;
import org.jimmyl.ezstat.Entity.Budget;
import org.jimmyl.ezstat.Entity.Transaction;
import org.jimmyl.ezstat.Entity.User;
import org.jimmyl.ezstat.Repository.BudgetRepository;
import org.jimmyl.ezstat.Repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.List;

@Service
public class BudgetService {

    private static final YearMonth MIN_BUDGET_MONTH = YearMonth.of(2000, 1);

    private final BudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;

    public BudgetService(BudgetRepository budgetRepository, TransactionRepository transactionRepository) {
        this.budgetRepository = budgetRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public List<BudgetResponse> list(User user) {
        return budgetRepository.findByUserIdOrderByMonthDesc(user.getId())
                .stream()
                .peek(b -> b.setSpent(calculateSpent(user.getId(), b.getMonth())))
                .map(BudgetResponse::from)
                .toList();
    }

    @Transactional
    public BudgetResponse save(User user, BudgetSaveRequest request) {
        validateBudgetMonth(request.month());
        Budget budget = budgetRepository.findByUserIdAndMonth(user.getId(), request.month()).orElseGet(Budget::new);
        budget.setUser(user);
        budget.setMonth(request.month());
        budget.setAmount(request.amount());
        budget.setSpent(calculateSpent(user.getId(), request.month()));
        return BudgetResponse.from(budgetRepository.save(budget));
    }

    @Transactional
    public BudgetResponse update(User user, Long id, BudgetSaveRequest request) {
        validateBudgetMonth(request.month());

        Budget existing = budgetRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("预算不存在"));

        budgetRepository.findByUserIdAndMonth(user.getId(), request.month())
                .filter(another -> !another.getId().equals(existing.getId()))
                .ifPresent(another -> {
                    throw new IllegalArgumentException("该月份预算已存在");
                });

        existing.setMonth(request.month());
        existing.setAmount(request.amount());
        existing.setSpent(calculateSpent(user.getId(), request.month()));
        return BudgetResponse.from(budgetRepository.save(existing));
    }

    @Transactional
    public void delete(User user, Long id) {
        Budget existing = budgetRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("预算不存在"));
        budgetRepository.delete(existing);
    }

    @Transactional(readOnly = true)
    public BudgetResponse getByMonth(User user, YearMonth month) {
        validateBudgetMonth(month);
        Budget budget = budgetRepository.findByUserIdAndMonth(user.getId(), month)
                .orElseThrow(() -> new IllegalArgumentException("预算不存在"));
        budget.setSpent(calculateSpent(user.getId(), month));
        return BudgetResponse.from(budget);
    }

    private void validateBudgetMonth(YearMonth month) {
        if (month == null) {
            throw new IllegalArgumentException("预算月份不能为空");
        }
        if (month.isBefore(MIN_BUDGET_MONTH)) {
            throw new IllegalArgumentException("预算月份不合理");
        }
        if (month.isAfter(YearMonth.now())) {
            throw new IllegalArgumentException("预算月份不能晚于当前月份");
        }
    }

    private BigDecimal calculateSpent(Long userId, YearMonth month) {
        LocalDate start = month.atDay(1);
        LocalDate end = month.atEndOfMonth();
        return transactionRepository.sumAmountByUserAndTypeAndDateRange(
                userId,
                Transaction.TransactionType.EXPENSE,
                LocalDateTime.of(start, LocalTime.MIN),
                LocalDateTime.of(end, LocalTime.MAX)
        );
    }
}

