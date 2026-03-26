package org.jimmyl.ezstat.Service;

import org.jimmyl.ezstat.DTO.PageResponse;
import org.jimmyl.ezstat.DTO.TransactionResponse;
import org.jimmyl.ezstat.DTO.TransactionSaveRequest;
import org.jimmyl.ezstat.Entity.Account;
import org.jimmyl.ezstat.Entity.Category;
import org.jimmyl.ezstat.Entity.Transaction;
import org.jimmyl.ezstat.Entity.User;
import org.jimmyl.ezstat.Repository.TransactionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountService accountService;
    private final CategoryService categoryService;

    public TransactionService(
            TransactionRepository transactionRepository,
            AccountService accountService,
            CategoryService categoryService
    ) {
        this.transactionRepository = transactionRepository;
        this.accountService = accountService;
        this.categoryService = categoryService;
    }

    @Transactional(readOnly = true)
    public PageResponse<TransactionResponse> list(
            User user,
            Integer page,
            Integer size,
            Transaction.TransactionType type,
            Long accountId,
            Long mainCategoryId,
            Long subCategoryId,
            LocalDate startDate,
            LocalDate endDate
    ) {
        int resolvedPage = page == null || page < 0 ? 0 : page;
        int resolvedSize = size == null || size <= 0 ? 20 : Math.min(size, 100);
        Pageable pageable = PageRequest.of(resolvedPage, resolvedSize, Sort.by(Sort.Direction.DESC, "transactionDate", "id"));

        LocalDateTime start = resolveStartDateTime(startDate);
        LocalDateTime end = resolveEndDateTime(endDate);

        return PageResponse.from(transactionRepository.findPageDynamic(
                user.getId(), type, accountId, mainCategoryId, subCategoryId, start, end, pageable
        ).map(TransactionResponse::from));
    }

    @Transactional(readOnly = true)
    public TransactionResponse detail(User user, Long id) {
        Transaction tx = transactionRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("交易不存在"));
        return TransactionResponse.from(tx);
    }

    @Transactional
    public TransactionResponse create(User user, TransactionSaveRequest request) {
        validateRequestInput(request);

        Account account = accountService.getOwnedEntity(request.accountId(), user.getId());
        Category mainCategory = categoryService.getEnabledEntity(request.mainCategoryId());
        Category subCategory = categoryService.getEnabledEntity(request.subCategoryId());
        validateCategory(request.type(), mainCategory, subCategory);

        BigDecimal normalizedAmount = normalizeAmount(request.amount());
        applyBalance(account, request.type(), normalizedAmount);

        Transaction tx = new Transaction();
        tx.setUser(user);
        tx.setType(request.type());
        tx.setAmount(normalizedAmount);
        tx.setTransactionDate(request.transactionDate());
        tx.setAccount(account);
        tx.setMainCategory(mainCategory);
        tx.setSubCategory(subCategory);
        tx.setDescription(request.description());

        return TransactionResponse.from(transactionRepository.save(tx));
    }

    @Transactional
    public TransactionResponse update(User user, Long id, TransactionSaveRequest request) {
        validateRequestInput(request);

        Transaction existing = transactionRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("交易不存在"));

        // rollback old effect first, then apply new effect
        applyBalance(existing.getAccount(), reverseType(existing.getType()), existing.getAmount());

        Account account = accountService.getOwnedEntity(request.accountId(), user.getId());
        Category mainCategory = categoryService.getEnabledEntity(request.mainCategoryId());
        Category subCategory = categoryService.getEnabledEntity(request.subCategoryId());
        validateCategory(request.type(), mainCategory, subCategory);
        BigDecimal normalizedAmount = normalizeAmount(request.amount());
        applyBalance(account, request.type(), normalizedAmount);

        existing.setType(request.type());
        existing.setAmount(normalizedAmount);
        existing.setTransactionDate(request.transactionDate());
        existing.setAccount(account);
        existing.setMainCategory(mainCategory);
        existing.setSubCategory(subCategory);
        existing.setDescription(request.description());

        return TransactionResponse.from(transactionRepository.save(existing));
    }

    @Transactional
    public void delete(User user, Long id) {
        Transaction existing = transactionRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("交易不存在"));
        applyBalance(existing.getAccount(), reverseType(existing.getType()), existing.getAmount());
        transactionRepository.delete(existing);
    }

    @Transactional(readOnly = true)
    public Map<String, BigDecimal> summary(User user, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = resolveStartDateTime(startDate);
        LocalDateTime end = resolveEndDateTime(endDate);
        BigDecimal income = transactionRepository.sumAmountByUserAndTypeAndDateRange(user.getId(), Transaction.TransactionType.INCOME, start, end);
        BigDecimal expense = transactionRepository.sumAmountByUserAndTypeAndDateRange(user.getId(), Transaction.TransactionType.EXPENSE, start, end);
        return Map.of(
                "income", income,
                "expense", expense,
                "balance", income.subtract(expense)
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> trend(User user, int months) {
        if (months < 1) months = 6;
        if (months > 24) months = 24;

        List<Map<String, Object>> result = new ArrayList<>();
        YearMonth now = YearMonth.now();

        for (int i = months - 1; i >= 0; i--) {
            YearMonth ym = now.minusMonths(i);
            LocalDateTime start = ym.atDay(1).atStartOfDay();
            LocalDateTime end = ym.atEndOfMonth().atTime(LocalTime.MAX);

            List<Object[]> rows = transactionRepository.sumByUserAndDateRangeGroupByType(user.getId(), start, end);
            BigDecimal income = BigDecimal.ZERO;
            BigDecimal expense = BigDecimal.ZERO;

            for (Object[] row : rows) {
                Transaction.TransactionType type = (Transaction.TransactionType) row[0];
                BigDecimal amount = (BigDecimal) row[1];
                if (type == Transaction.TransactionType.INCOME) {
                    income = amount;
                } else {
                    expense = amount;
                }
            }

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("month", ym.toString());
            entry.put("income", income);
            entry.put("expense", expense);
            entry.put("balance", income.subtract(expense));
            result.add(entry);
        }

        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, List<Map<String, Object>>> categoryBreakdown(User user, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = resolveStartDateTime(startDate);
        LocalDateTime end = resolveEndDateTime(endDate);

        List<Object[]> rows = transactionRepository.sumByUserAndDateRangeGroupByCategory(user.getId(), start, end);

        List<Map<String, Object>> expenseList = new ArrayList<>();
        List<Map<String, Object>> incomeList = new ArrayList<>();

        for (Object[] row : rows) {
            String categoryName = (String) row[0];
            Transaction.TransactionType type = (Transaction.TransactionType) row[1];
            BigDecimal amount = (BigDecimal) row[2];

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", categoryName);
            item.put("value", amount);

            if (type == Transaction.TransactionType.EXPENSE) {
                expenseList.add(item);
            } else {
                incomeList.add(item);
            }
        }

        Map<String, List<Map<String, Object>>> result = new LinkedHashMap<>();
        result.put("expense", expenseList);
        result.put("income", incomeList);
        return result;
    }

    @Transactional(readOnly = true)
    public String exportCsv(
            User user,
            Transaction.TransactionType type,
            Long accountId,
            Long mainCategoryId,
            Long subCategoryId,
            LocalDate startDate,
            LocalDate endDate
    ) {
        LocalDateTime start = resolveStartDateTime(startDate);
        LocalDateTime end = resolveEndDateTime(endDate);

        List<Transaction> rows = transactionRepository.findForExport(
                user.getId(),
                type,
                accountId,
                mainCategoryId,
                subCategoryId,
                start,
                end
        );

        StringBuilder csv = new StringBuilder();
        csv.append("ID,时间,类型,账户,主分类,子分类,金额,备注\n");
        for (Transaction tx : rows) {
            csv.append(tx.getId()).append(',')
                    .append(csvValue(tx.getTransactionDate())).append(',')
                    .append(csvValue(tx.getType())).append(',')
                    .append(csvValue(tx.getAccount().getName())).append(',')
                    .append(csvValue(tx.getMainCategory().getName())).append(',')
                    .append(csvValue(tx.getSubCategory().getName())).append(',')
                    .append(tx.getAmount().setScale(2, java.math.RoundingMode.HALF_UP)).append(',')
                    .append(csvValue(tx.getDescription()))
                    .append('\n');
        }
        return csv.toString();
    }

    private void applyBalance(Account account, Transaction.TransactionType type, BigDecimal amount) {
        BigDecimal delta = type == Transaction.TransactionType.INCOME ? amount : amount.negate();
        accountService.applyBalanceDelta(account, delta);
    }

    private Transaction.TransactionType reverseType(Transaction.TransactionType type) {
        return type == Transaction.TransactionType.INCOME
                ? Transaction.TransactionType.EXPENSE
                : Transaction.TransactionType.INCOME;
    }

    private void validateCategory(Transaction.TransactionType txType, Category main, Category sub) {
        Category.CategoryType expected = txType == Transaction.TransactionType.INCOME
                ? Category.CategoryType.INCOME
                : Category.CategoryType.EXPENSE;
        if (main.getType() != expected) {
            throw new IllegalArgumentException("交易类型与分类类型不一致");
        }
        if (sub != null && sub.getType() != expected) {
            throw new IllegalArgumentException("交易类型与分类类型不一致");
        }
        if (sub != null && (sub.getParent() == null || !sub.getParent().getId().equals(main.getId()))) {
            throw new IllegalArgumentException("子分类不属于主分类");
        }
    }

    private String csvValue(Object value) {
        if (value == null) {
            return "";
        }
        String text = String.valueOf(value);
        String escaped = text.replace("\"", "\"\"");
        return '"' + escaped + '"';
    }

    private void validateRequestInput(TransactionSaveRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("请求参数不能为空");
        }
        if (request.accountId() == null || request.accountId() <= 0) {
            throw new IllegalArgumentException("账户ID不合法");
        }
        if (request.mainCategoryId() == null || request.mainCategoryId() <= 0) {
            throw new IllegalArgumentException("主分类ID不合法");
        }
        if (request.subCategoryId() == null || request.subCategoryId() <= 0) {
            throw new IllegalArgumentException("子分类ID不合法");
        }
        if (request.transactionDate() == null) {
            throw new IllegalArgumentException("交易时间不能为空");
        }

        LocalDateTime now = LocalDateTime.now();
        if (request.transactionDate().isAfter(now.plusMinutes(1))) {
            throw new IllegalArgumentException("交易时间不能晚于当前时间");
        }
        if (request.transactionDate().isBefore(LocalDateTime.of(2000, 1, 1, 0, 0))) {
            throw new IllegalArgumentException("交易时间不合理");
        }
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        if (amount == null) {
            throw new IllegalArgumentException("金额不能为空");
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("金额必须大于0");
        }
        return amount.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private LocalDateTime resolveStartDateTime(LocalDate date) {
        LocalDate start = date == null ? LocalDate.of(1970, 1, 1) : date;
        return start.atStartOfDay();
    }

    private LocalDateTime resolveEndDateTime(LocalDate date) {
        LocalDate end = date == null ? LocalDate.of(2999, 12, 31) : date;
        return end.atTime(LocalTime.MAX);
    }
}

