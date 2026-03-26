package org.jimmyl.ezstat.Repository;

import org.jimmyl.ezstat.Entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findByIdAndEnabledTrue(Long id);

    List<Category> findByParentIsNullAndEnabledTrueAndType(Category.CategoryType type);

    List<Category> findByParentIdAndEnabledTrue(Long parentId);

    Optional<Category> findByTypeAndParentIsNullAndName(Category.CategoryType type, String name);

    Optional<Category> findByTypeAndParentIdAndName(Category.CategoryType type, Long parentId, String name);
    
}
