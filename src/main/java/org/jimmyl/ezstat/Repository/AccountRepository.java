package org.jimmyl.ezstat.Repository;

import org.jimmyl.ezstat.Entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {

    List<Account> findByUserIdAndEnabledTrue(Long userId);

    List<Account> findByUserIdAndEnabled(Long userId, Boolean enabled);

    List<Account> findByUserId(Long userId);

    Optional<Account> findByIdAndUserId(Long id, Long userId);

}
