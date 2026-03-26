package org.jimmyl.ezstat.Controller;

import jakarta.validation.Valid;
import org.jimmyl.ezstat.DTO.AccountResponse;
import org.jimmyl.ezstat.DTO.AccountSaveRequest;
import org.jimmyl.ezstat.Entity.User;
import org.jimmyl.ezstat.Service.AccountService;
import org.jimmyl.ezstat.Service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;
    private final UserService userService;

    public AccountController(AccountService accountService, UserService userService) {
        this.accountService = accountService;
        this.userService = userService;
    }

    @GetMapping
    public List<AccountResponse> list(@RequestParam(required = false) Boolean enabled) {
        User current = userService.getCurrentAuthenticatedUser();
        return accountService.listCurrentUserAccounts(current, enabled);
    }

    @PostMapping
    public ResponseEntity<AccountResponse> create(@Valid @RequestBody AccountSaveRequest request) {
        User current = userService.getCurrentAuthenticatedUser();
        return ResponseEntity.status(HttpStatus.CREATED).body(accountService.create(current, request));
    }

    @PutMapping("/{id}")
    public AccountResponse update(@PathVariable Long id, @Valid @RequestBody AccountSaveRequest request) {
        User current = userService.getCurrentAuthenticatedUser();
        return accountService.update(current, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        User current = userService.getCurrentAuthenticatedUser();
        accountService.delete(current, id);
        return ResponseEntity.noContent().build();
    }
}

