package org.jimmyl.ezstat.Service;

import org.jimmyl.ezstat.DTO.TransferResponse;
import org.jimmyl.ezstat.DTO.TransferSaveRequest;
import org.jimmyl.ezstat.Entity.Account;
import org.jimmyl.ezstat.Entity.Transfer;
import org.jimmyl.ezstat.Entity.User;
import org.jimmyl.ezstat.Repository.TransferRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TransferService {

    private final TransferRepository transferRepository;
    private final AccountService accountService;

    public TransferService(TransferRepository transferRepository, AccountService accountService) {
        this.transferRepository = transferRepository;
        this.accountService = accountService;
    }

    @Transactional(readOnly = true)
    public List<TransferResponse> list(User user) {
        return transferRepository.findByFromAccountUserIdOrToAccountUserIdOrderByOccurredAtDesc(user.getId(), user.getId())
                .stream().map(TransferResponse::from).toList();
    }

    @Transactional
    public TransferResponse create(User user, TransferSaveRequest request) {
        if (request.fromAccountId().equals(request.toAccountId())) {
            throw new IllegalArgumentException("转出账户和转入账户不能相同");
        }

        Account from = accountService.getOwnedEntity(request.fromAccountId(), user.getId());
        Account to = accountService.getOwnedEntity(request.toAccountId(), user.getId());

        accountService.applyBalanceDelta(from, request.amount().negate());
        accountService.applyBalanceDelta(to, request.amount());

        Transfer transfer = new Transfer();
        transfer.setFromAccount(from);
        transfer.setToAccount(to);
        transfer.setAmount(request.amount());
        transfer.setDescription(request.description());
        transfer.setOccurredAt(LocalDateTime.now());

        return TransferResponse.from(transferRepository.save(transfer));
    }
}

