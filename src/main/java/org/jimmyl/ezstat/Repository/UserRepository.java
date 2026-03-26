package org.jimmyl.ezstat.Repository;

import org.jimmyl.ezstat.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsernameIgnoreCase(String username);


    boolean existsByUsernameIgnoreCase(String username);


    boolean existsByEmailIgnoreCase(String email);

    boolean existsByRole(User.Role role);

    Optional<User> findFirstByRoleOrderByIdAsc(User.Role role);

}
