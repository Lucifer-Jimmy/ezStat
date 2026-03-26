package org.jimmyl.ezstat.Controller;

import jakarta.validation.Valid;
import org.jimmyl.ezstat.DTO.BudgetResponse;
import org.jimmyl.ezstat.DTO.BudgetSaveRequest;
import org.jimmyl.ezstat.Entity.User;
import org.jimmyl.ezstat.Service.BudgetService;
import org.jimmyl.ezstat.Service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetService budgetService;
    private final UserService userService;

    public BudgetController(BudgetService budgetService, UserService userService) {
        this.budgetService = budgetService;
        this.userService = userService;
    }

    @GetMapping
    public List<BudgetResponse> list() {
        User current = userService.getCurrentAuthenticatedUser();
        return budgetService.list(current);
    }

    @GetMapping("/{month}")
    public BudgetResponse byMonth(@PathVariable String month) {
        User current = userService.getCurrentAuthenticatedUser();
        return budgetService.getByMonth(current, YearMonth.parse(month));
    }

    @PostMapping
    public ResponseEntity<BudgetResponse> save(@Valid @RequestBody BudgetSaveRequest request) {
        User current = userService.getCurrentAuthenticatedUser();
        return ResponseEntity.status(HttpStatus.CREATED).body(budgetService.save(current, request));
    }

    @PutMapping("/{id}")
    public BudgetResponse update(@PathVariable Long id, @Valid @RequestBody BudgetSaveRequest request) {
        User current = userService.getCurrentAuthenticatedUser();
        return budgetService.update(current, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        User current = userService.getCurrentAuthenticatedUser();
        budgetService.delete(current, id);
        return ResponseEntity.noContent().build();
    }
}

