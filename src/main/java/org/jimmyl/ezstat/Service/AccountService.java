package org.jimmyl.ezstat.Service;

import org.jimmyl.ezstat.DTO.AccountResponse;
import org.jimmyl.ezstat.DTO.AccountSaveRequest;
import org.jimmyl.ezstat.Entity.Account;
import org.jimmyl.ezstat.Entity.User;
import org.jimmyl.ezstat.Repository.AccountRepository;
import org.jimmyl.ezstat.Repository.TransactionRepository;
import org.jimmyl.ezstat.Repository.TransferRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final TransferRepository transferRepository;

    public AccountService(AccountRepository accountRepository,
                          TransactionRepository transactionRepository,
                          TransferRepository transferRepository) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.transferRepository = transferRepository;
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> listCurrentUserAccounts(User user, Boolean enabled) {
        List<Account> accounts;
        if (enabled == null) {
            accounts = accountRepository.findByUserId(user.getId());
        } else if (Boolean.TRUE.equals(enabled)) {
            accounts = accountRepository.findByUserIdAndEnabledTrue(user.getId());
        } else {
            accounts = accountRepository.findByUserIdAndEnabled(user.getId(), false);
        }
        return accounts.stream().map(AccountResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Account getOwnedEntity(Long accountId, Long userId) {
        return accountRepository.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new IllegalArgumentException("账户不存在"));
    }

    @Transactional
    public AccountResponse create(User user, AccountSaveRequest request) {
        Account account = new Account();
        account.setUser(user);
        account.setName(request.name().trim());
        account.setType(request.type());
        account.setBalance(normalizeMoney(request.balance()));
        account.setDescription(request.description());
        account.setEnabled(request.enabled() == null || request.enabled());
        return AccountResponse.from(accountRepository.save(account));
    }

    @Transactional
    public AccountResponse update(User user, Long accountId, AccountSaveRequest request) {
        Account account = getOwnedEntity(accountId, user.getId());
        account.setName(request.name().trim());
        account.setType(request.type());
        account.setBalance(normalizeMoney(request.balance()));
        account.setDescription(request.description());
        if (request.enabled() != null) {
            account.setEnabled(request.enabled());
        }
        return AccountResponse.from(accountRepository.save(account));
    }

    @Transactional
    public void delete(User user, Long accountId) {
        Account account = getOwnedEntity(accountId, user.getId());
        if (transactionRepository.existsByAccountId(accountId)) {
            throw new IllegalArgumentException("该账户下存在交易记录，无法直接删除。请先删除或迁移相关交易");
        }
        if (transferRepository.existsByFromAccountIdOrToAccountId(accountId, accountId)) {
            throw new IllegalArgumentException("该账户下存在转账记录，无法直接删除。请先删除相关转账");
        }
        accountRepository.delete(account);
    }

    @Transactional
    public void applyBalanceDelta(Account account, BigDecimal delta) {
        BigDecimal next = account.getBalance().add(delta);
        if (next.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("账户余额不足");
        }
        account.setBalance(next);
        accountRepository.save(account);
    }

    private BigDecimal normalizeMoney(BigDecimal value) {
        if (value == null) {
            throw new IllegalArgumentException("金额不能为空");
        }
        return value.setScale(2, java.math.RoundingMode.HALF_UP);
    }
}

