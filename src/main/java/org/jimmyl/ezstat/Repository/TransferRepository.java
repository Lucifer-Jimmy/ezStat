package org.jimmyl.ezstat.Repository;

import org.jimmyl.ezstat.Entity.Transfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransferRepository extends JpaRepository<Transfer, Long> {

    List<Transfer> findByFromAccountUserIdOrToAccountUserIdOrderByOccurredAtDesc(Long fromUserId, Long toUserId);

    boolean existsByFromAccountIdOrToAccountId(Long fromAccountId, Long toAccountId);
}

