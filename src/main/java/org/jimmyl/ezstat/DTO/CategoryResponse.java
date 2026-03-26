package org.jimmyl.ezstat.DTO;

import org.jimmyl.ezstat.Entity.Category;

public record CategoryResponse(
        Long id,
        String name,
        Category.CategoryType type,
        Long parentId,
        String description,
        String icon,
        String color,
        Boolean enabled
) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getType(),
                category.getParent() == null ? null : category.getParent().getId(),
                category.getDescription(),
                category.getIcon(),
                category.getColor(),
                category.getEnabled()
        );
    }
}

