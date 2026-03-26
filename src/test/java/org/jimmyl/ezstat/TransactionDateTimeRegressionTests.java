package org.jimmyl.ezstat;

import org.jimmyl.ezstat.DTO.BudgetResponse;
import org.jimmyl.ezstat.DTO.BudgetSaveRequest;
import org.jimmyl.ezstat.DTO.PageResponse;
import org.jimmyl.ezstat.DTO.TransactionResponse;
import org.jimmyl.ezstat.DTO.TransactionSaveRequest;
import org.jimmyl.ezstat.Entity.Account;
import org.jimmyl.ezstat.Entity.Category;
import org.jimmyl.ezstat.Entity.Transaction;
import org.jimmyl.ezstat.Entity.User;
import org.jimmyl.ezstat.Repository.AccountRepository;
import org.jimmyl.ezstat.Repository.CategoryRepository;
import org.jimmyl.ezstat.Repository.UserRepository;
import org.jimmyl.ezstat.Service.BudgetService;
import org.jimmyl.ezstat.Service.TransactionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class TransactionDateTimeRegressionTests {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private BudgetService budgetService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CategoryRepository categoryRepository;


    @Test
    void createAndUpdate_shouldKeepMinutePrecision() {
        User user = createUser();
        Account account = createAccount(user, "现金账户");
        Category main = createRootCategory(user, Category.CategoryType.EXPENSE, "餐饮");
        Category sub = createChildCategory(user, Category.CategoryType.EXPENSE, main, "午餐");

        LocalDateTime originalTime = LocalDateTime.of(2026, 3, 10, 10, 15);
        TransactionSaveRequest createRequest = new TransactionSaveRequest(
                Transaction.TransactionType.EXPENSE,
                new BigDecimal("35.50"),
                originalTime,
                account.getId(),
                main.getId(),
                sub.getId(),
                "工作日午餐"
        );

        TransactionResponse created = transactionService.create(user, createRequest);
        assertEquals(originalTime, created.transactionDate());

        LocalDateTime updatedTime = LocalDateTime.of(2026, 3, 10, 18, 45);
        TransactionSaveRequest updateRequest = new TransactionSaveRequest(
                Transaction.TransactionType.EXPENSE,
                new BigDecimal("48.90"),
                updatedTime,
                account.getId(),
                main.getId(),
                sub.getId(),
                "晚餐"
        );

        TransactionResponse updated = transactionService.update(user, created.id(), updateRequest);
        assertEquals(updatedTime, updated.transactionDate());
        assertEquals(0, new BigDecimal("48.90").compareTo(updated.amount()));
    }

    @Test
    void listExportAndBudget_shouldRespectDateRangeAndDateTime() {
        User user = createUser();
        Account account = createAccount(user, "银行卡");
        Category main = createRootCategory(user, Category.CategoryType.EXPENSE, "交通");
        Category sub = createChildCategory(user, Category.CategoryType.EXPENSE, main, "地铁");

        LocalDateTime inRangeTime = LocalDateTime.of(2026, 3, 10, 8, 30);
        LocalDateTime outRangeTime = LocalDateTime.of(2026, 2, 2, 9, 0);

        transactionService.create(user, new TransactionSaveRequest(
                Transaction.TransactionType.EXPENSE,
                new BigDecimal("12.80"),
                inRangeTime,
                account.getId(),
                main.getId(),
                sub.getId(),
                "通勤"
        ));

        transactionService.create(user, new TransactionSaveRequest(
                Transaction.TransactionType.EXPENSE,
                new BigDecimal("25.00"),
                outRangeTime,
                account.getId(),
                main.getId(),
                sub.getId(),
                "跨月支出"
        ));

        PageResponse<TransactionResponse> marchPage = transactionService.list(
                user,
                0,
                20,
                null,
                null,
                null,
                null,
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 3, 31)
        );

        assertEquals(1, marchPage.content().size());
        assertEquals(inRangeTime, marchPage.content().get(0).transactionDate());

        String csv = transactionService.exportCsv(
                user,
                null,
                null,
                null,
                null,
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 3, 31)
        );

        assertTrue(csv.contains("时间"));
        assertTrue(csv.contains("2026-03-10T08:30"));
        assertFalse(csv.contains("跨月支出"));

        BudgetResponse budget = budgetService.save(user, new BudgetSaveRequest(YearMonth.of(2026, 3), new BigDecimal("500.00")));
        assertEquals(0, new BigDecimal("12.80").compareTo(budget.spent().setScale(2, RoundingMode.HALF_UP)));

        BudgetResponse byMonth = budgetService.getByMonth(user, YearMonth.of(2026, 3));
        assertEquals(0, new BigDecimal("12.80").compareTo(byMonth.spent().setScale(2, RoundingMode.HALF_UP)));
    }

    @Test
    void create_shouldRejectFutureTransactionTime() {
        User user = createUser();
        Account account = createAccount(user, "校验账户");
        Category main = createRootCategory(user, Category.CategoryType.EXPENSE, "校验分类");
        Category sub = createChildCategory(user, Category.CategoryType.EXPENSE, main, "校验子分类");

        TransactionSaveRequest request = new TransactionSaveRequest(
                Transaction.TransactionType.EXPENSE,
                new BigDecimal("20.00"),
                LocalDateTime.now().plusDays(1),
                account.getId(),
                main.getId(),
                sub.getId(),
                "未来时间测试"
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> transactionService.create(user, request));
        assertTrue(ex.getMessage().contains("交易时间"));
    }

    @Test
    void budget_shouldSupportUpdateAndDelete() {
        User user = createUser();

        BudgetResponse created = budgetService.save(user,
                new BudgetSaveRequest(YearMonth.of(2026, 3), new BigDecimal("300.00")));

        BudgetResponse updated = budgetService.update(user, created.id(),
                new BudgetSaveRequest(YearMonth.of(2026, 2), new BigDecimal("450.00")));

        assertEquals(YearMonth.of(2026, 2), updated.month());
        assertEquals(0, new BigDecimal("450.00").compareTo(updated.amount()));

        BudgetResponse byMonth = budgetService.getByMonth(user, YearMonth.of(2026, 2));
        assertEquals(updated.id(), byMonth.id());

        budgetService.delete(user, updated.id());
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> budgetService.getByMonth(user, YearMonth.of(2026, 2)));
        assertTrue(ex.getMessage().contains("预算不存在"));
    }

    @Test
    void budget_shouldRejectInvalidMonth() {
        User user = createUser();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> budgetService.save(user,
                        new BudgetSaveRequest(YearMonth.of(1999, 12), new BigDecimal("100.00"))));

        assertTrue(ex.getMessage().contains("预算月份"));
    }

    private User createUser() {
        String marker = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        User user = new User();
        user.setUsername("u_" + marker);
        user.setEmail("u_" + marker + "@example.com");
        user.setPassword("$2a$10$examplehashedpasswordstring1234567890123456789012");
        user.setEnabled(true);
        user.setRole(User.Role.USER);
        user.setFailedLoginAttempts(0);
        user.setAccountLockedUntil(null);
        return userRepository.save(user);
    }

    private Account createAccount(User user, String name) {
        Account account = new Account();
        account.setUser(user);
        account.setName(name);
        account.setType(Account.AccountType.BANK_CARD);
        account.setBalance(new BigDecimal("1000.00"));
        account.setEnabled(true);
        return accountRepository.save(account);
    }

    private Category createRootCategory(User user, Category.CategoryType type, String name) {
        Category root = new Category();
        root.setUser(user);
        root.setType(type);
        root.setName(name);
        root.setEnabled(true);
        return categoryRepository.save(root);
    }

    private Category createChildCategory(User user, Category.CategoryType type, Category parent, String name) {
        Category child = new Category();
        child.setUser(user);
        child.setType(type);
        child.setParent(parent);
        child.setName(name);
        child.setEnabled(true);
        return categoryRepository.save(child);
    }
}

