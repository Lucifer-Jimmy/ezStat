package org.jimmyl.ezstat.Repository;

import org.jimmyl.ezstat.Entity.Transaction;
import org.jimmyl.ezstat.Entity.Transaction.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    @Query(
            value = """
                    select t
                    from Transaction t
                    where t.user.id = :userId
                    order by t.transactionDate desc, t.id desc
                    """,
            countQuery = """
                    select count(t)
                    from Transaction t
                    where t.user.id = :userId
                    """
    )
    Page<Transaction> findPageByUser(@Param("userId") Long userId, Pageable pageable);

    @Query(
            value = """
                    select t
                    from Transaction t
                    where t.user.id = :userId
                      and t.transactionDate between :startDate and :endDate
                    order by t.transactionDate desc, t.id desc
                    """,
            countQuery = """
                    select count(t)
                    from Transaction t
                    where t.user.id = :userId
                      and t.transactionDate between :startDate and :endDate
                    """
    )
    Page<Transaction> findPageByUserAndDateRange(
            @Param("userId") Long userId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );

    @Query(
            value = """
                    select t
                    from Transaction t
                    where t.user.id = :userId
                      and t.type = :type
                      and t.transactionDate between :startDate and :endDate
                    order by t.transactionDate desc, t.id desc
                    """,
            countQuery = """
                    select count(t)
                    from Transaction t
                    where t.user.id = :userId
                      and t.type = :type
                      and t.transactionDate between :startDate and :endDate
                    """
    )
    Page<Transaction> findPageByUserAndTypeAndDateRange(
            @Param("userId") Long userId,
            @Param("type") TransactionType type,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );

    @Query(
            value = """
                    select t
                    from Transaction t
                    where t.user.id = :userId
                      and t.account.id = :accountId
                      and t.transactionDate between :startDate and :endDate
                    order by t.transactionDate desc, t.id desc
                    """,
            countQuery = """
                    select count(t)
                    from Transaction t
                    where t.user.id = :userId
                      and t.account.id = :accountId
                      and t.transactionDate between :startDate and :endDate
                    """
    )
    Page<Transaction> findPageByUserAndAccountAndDateRange(
            @Param("userId") Long userId,
            @Param("accountId") Long accountId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );

    @Query(
            value = """
                    select t
                    from Transaction t
                    where t.user.id = :userId
                      and t.mainCategory.id = :mainCategoryId
                      and t.transactionDate between :startDate and :endDate
                    order by t.transactionDate desc, t.id desc
                    """,
            countQuery = """
                    select count(t)
                    from Transaction t
                    where t.user.id = :userId
                      and t.mainCategory.id = :mainCategoryId
                      and t.transactionDate between :startDate and :endDate
                    """
    )
    Page<Transaction> findPageByUserAndMainCatAndDateRange(
            @Param("userId") Long userId,
            @Param("mainCategoryId") Long mainCategoryId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );

    @Query(
            value = """
                    select t
                    from Transaction t
                    where t.user.id = :userId
                      and t.subCategory.id = :subCategoryId
                      and t.transactionDate between :startDate and :endDate
                    order by t.transactionDate desc, t.id desc
                    """,
            countQuery = """
                    select count(t)
                    from Transaction t
                    where t.user.id = :userId
                      and t.subCategory.id = :subCategoryId
                      and t.transactionDate between :startDate and :endDate
                    """
    )
    Page<Transaction> findPageByUserAndSubCatAndDateRange(
            @Param("userId") Long userId,
            @Param("subCategoryId") Long subCategoryId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );

    @Query("""
            select coalesce(sum(t.amount), 0)
            from Transaction t
            where t.user.id = :userId
              and t.type = :type
              and t.transactionDate between :startDate and :endDate
            """)
    BigDecimal sumAmountByUserAndTypeAndDateRange(
            @Param("userId") Long userId,
            @Param("type") TransactionType type,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("""
            select t
            from Transaction t
            where t.user.id = :userId
              and (:type is null or t.type = :type)
              and (:accountId is null or t.account.id = :accountId)
              and (:mainCategoryId is null or t.mainCategory.id = :mainCategoryId)
              and (:subCategoryId is null or t.subCategory.id = :subCategoryId)
              and t.transactionDate between :startDate and :endDate
            order by t.transactionDate desc, t.id desc
            """)
    List<Transaction> findForExport(
            @Param("userId") Long userId,
            @Param("type") TransactionType type,
            @Param("accountId") Long accountId,
            @Param("mainCategoryId") Long mainCategoryId,
            @Param("subCategoryId") Long subCategoryId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    Optional<Transaction> findByIdAndUserId(Long id, Long userId);

    boolean existsByAccountId(Long accountId);

    @Query("""
            select t.type, coalesce(sum(t.amount), 0)
            from Transaction t
            where t.user.id = :userId
              and t.transactionDate between :startDate and :endDate
            group by t.type
            """)
    List<Object[]> sumByUserAndDateRangeGroupByType(
            @Param("userId") Long userId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("""
            select t.mainCategory.name, t.type, coalesce(sum(t.amount), 0)
            from Transaction t
            where t.user.id = :userId
              and t.transactionDate between :startDate and :endDate
            group by t.mainCategory.name, t.type
            order by sum(t.amount) desc
            """)
    List<Object[]> sumByUserAndDateRangeGroupByCategory(
            @Param("userId") Long userId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query(
            value = """
                    select t
                    from Transaction t
                    where t.user.id = :userId
                      and (:type is null or t.type = :type)
                      and (:accountId is null or t.account.id = :accountId)
                      and (:mainCategoryId is null or t.mainCategory.id = :mainCategoryId)
                      and (:subCategoryId is null or t.subCategory.id = :subCategoryId)
                      and t.transactionDate between :startDate and :endDate
                    order by t.transactionDate desc, t.id desc
                    """,
            countQuery = """
                    select count(t)
                    from Transaction t
                    where t.user.id = :userId
                      and (:type is null or t.type = :type)
                      and (:accountId is null or t.account.id = :accountId)
                      and (:mainCategoryId is null or t.mainCategory.id = :mainCategoryId)
                      and (:subCategoryId is null or t.subCategory.id = :subCategoryId)
                      and t.transactionDate between :startDate and :endDate
                    """
    )
    Page<Transaction> findPageDynamic(
            @Param("userId") Long userId,
            @Param("type") TransactionType type,
            @Param("accountId") Long accountId,
            @Param("mainCategoryId") Long mainCategoryId,
            @Param("subCategoryId") Long subCategoryId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );
}
