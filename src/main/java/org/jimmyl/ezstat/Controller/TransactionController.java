package org.jimmyl.ezstat.Controller;

import jakarta.validation.Valid;
import org.jimmyl.ezstat.DTO.PageResponse;
import org.jimmyl.ezstat.DTO.TransactionResponse;
import org.jimmyl.ezstat.DTO.TransactionSaveRequest;
import org.jimmyl.ezstat.Entity.Transaction;
import org.jimmyl.ezstat.Entity.User;
import org.jimmyl.ezstat.Service.TransactionService;
import org.jimmyl.ezstat.Service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final UserService userService;

    public TransactionController(TransactionService transactionService, UserService userService) {
        this.transactionService = transactionService;
        this.userService = userService;
    }

    @GetMapping
    public PageResponse<TransactionResponse> list(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) Transaction.TransactionType type,
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) Long mainCategoryId,
            @RequestParam(required = false) Long subCategoryId,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate
    ) {
        validateDateRange(startDate, endDate);
        User current = userService.getCurrentAuthenticatedUser();
        return transactionService.list(current, page, size, type, accountId, mainCategoryId, subCategoryId, startDate, endDate);
    }

    @GetMapping("/{id}")
    public TransactionResponse detail(@PathVariable Long id) {
        validatePositiveId(id, "交易ID不合法");
        User current = userService.getCurrentAuthenticatedUser();
        return transactionService.detail(current, id);
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> create(@Valid @RequestBody TransactionSaveRequest request) {
        User current = userService.getCurrentAuthenticatedUser();
        return ResponseEntity.status(HttpStatus.CREATED).body(transactionService.create(current, request));
    }

    @PutMapping("/{id}")
    public TransactionResponse update(@PathVariable Long id, @Valid @RequestBody TransactionSaveRequest request) {
        validatePositiveId(id, "交易ID不合法");
        User current = userService.getCurrentAuthenticatedUser();
        return transactionService.update(current, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        validatePositiveId(id, "交易ID不合法");
        User current = userService.getCurrentAuthenticatedUser();
        transactionService.delete(current, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary")
    public Map<String, BigDecimal> summary(
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate
    ) {
        validateDateRange(startDate, endDate);
        User current = userService.getCurrentAuthenticatedUser();
        return transactionService.summary(current, startDate, endDate);
    }

    @GetMapping("/trend")
    public List<Map<String, Object>> trend(@RequestParam(defaultValue = "6") int months) {
        User current = userService.getCurrentAuthenticatedUser();
        return transactionService.trend(current, months);
    }

    @GetMapping("/category-breakdown")
    public Map<String, List<Map<String, Object>>> categoryBreakdown(
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate
    ) {
        validateDateRange(startDate, endDate);
        User current = userService.getCurrentAuthenticatedUser();
        return transactionService.categoryBreakdown(current, startDate, endDate);
    }

    @GetMapping(value = "/export", produces = "text/csv")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) Transaction.TransactionType type,
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) Long mainCategoryId,
            @RequestParam(required = false) Long subCategoryId,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate
    ) {
        validateDateRange(startDate, endDate);
        User current = userService.getCurrentAuthenticatedUser();
        String csv = transactionService.exportCsv(current, type, accountId, mainCategoryId, subCategoryId, startDate, endDate);
        String filename = "transactions-" + LocalDate.now() + ".csv";
        byte[] content = ("\uFEFF" + csv).getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                .body(content);
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("开始日期不能晚于结束日期");
        }
    }

    private void validatePositiveId(Long id, String message) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException(message);
        }
    }
}

