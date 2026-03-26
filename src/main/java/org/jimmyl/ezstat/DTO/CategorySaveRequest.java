package org.jimmyl.ezstat.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.jimmyl.ezstat.Entity.Category;

public record CategorySaveRequest(
        @NotBlank(message = "分类名称不能为空") @Size(max = 30, message = "分类名称长度不能超过30") String name,
        @NotNull(message = "分类类型不能为空") Category.CategoryType type,
        Long parentId,
        @Size(max = 500, message = "描述长度不能超过500") String description,
        @Size(max = 50, message = "图标标识长度不能超过50") String icon,
        @Pattern(regexp = "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$", message = "颜色格式不合法") String color,
        Boolean enabled
) {
}

