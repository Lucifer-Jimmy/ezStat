package org.jimmyl.ezstat.Service;

import org.jimmyl.ezstat.DTO.CategoryResponse;
import org.jimmyl.ezstat.DTO.CategorySaveRequest;
import org.jimmyl.ezstat.Entity.Category;
import org.jimmyl.ezstat.Entity.User;
import org.jimmyl.ezstat.Repository.CategoryRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    private static final List<PresetGroup> PRESET_GROUPS = List.of(
            new PresetGroup(Category.CategoryType.EXPENSE, "交通", "taxi", "#2563eb", List.of("打车", "地铁", "高铁", "公交", "加油", "停车")),
            new PresetGroup(Category.CategoryType.EXPENSE, "餐饮", "restaurant", "#f97316", List.of("早餐", "午餐", "晚餐", "咖啡茶饮", "零食")),
            new PresetGroup(Category.CategoryType.EXPENSE, "住房", "home", "#14b8a6", List.of("房租", "水费", "电费", "物业", "家居用品")),
            new PresetGroup(Category.CategoryType.EXPENSE, "购物", "shopping", "#a855f7", List.of("日用品", "服饰鞋包", "数码电器")),
            new PresetGroup(Category.CategoryType.EXPENSE, "健康", "medical", "#ef4444", List.of("门诊", "药品", "体检")),
            new PresetGroup(Category.CategoryType.EXPENSE, "娱乐", "fun", "#f59e0b", List.of("电影演出", "游戏", "旅行")),
            new PresetGroup(Category.CategoryType.EXPENSE, "教育", "education", "#06b6d4", List.of("培训课程", "书籍资料", "考试认证")),
            new PresetGroup(Category.CategoryType.EXPENSE, "人情往来", "gift", "#ec4899", List.of("礼金", "聚会")),
            new PresetGroup(Category.CategoryType.INCOME, "工资", "salary", "#16a34a", List.of("基本工资", "绩效奖金", "加班补贴")),
            new PresetGroup(Category.CategoryType.INCOME, "偶然所得", "business", "#22c55e", List.of("比赛奖金")),
            new PresetGroup(Category.CategoryType.INCOME, "投资收入", "investment", "#84cc16", List.of("利息", "分红", "理财收益"))
    );

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public Category getEnabledEntity(Long categoryId) {
        return categoryRepository.findByIdAndEnabledTrue(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("分类不存在"));
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> listRoot(Category.CategoryType type) {
        return categoryRepository.findByParentIsNullAndEnabledTrueAndType(type)
                .stream().map(CategoryResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> listChildren(Long parentId) {
        return categoryRepository.findByParentIdAndEnabledTrue(parentId)
                .stream().map(CategoryResponse::from).toList();
    }

    @Transactional
    public CategoryResponse create(User user, CategorySaveRequest request) {
        ensureAdmin(user);
        Category category = new Category();
        category.setUser(user);
        fillAndValidate(category, request);
        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse update(User user, Long categoryId, CategorySaveRequest request) {
        ensureAdmin(user);
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("分类不存在"));
        fillAndValidate(category, request);
        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Transactional
    public void delete(User user, Long categoryId) {
        ensureAdmin(user);
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("分类不存在"));
        categoryRepository.delete(category);
    }

    @Transactional
    public void ensurePresetCategories(User operator) {
        ensureAdmin(operator);
        for (PresetGroup group : PRESET_GROUPS) {
            Category root = findOrCreateRoot(operator, group);
            for (String childName : group.children()) {
                findOrCreateChild(operator, group.type(), root, childName);
            }
        }
    }

    private void fillAndValidate(Category target, CategorySaveRequest request) {
        String normalizedName = request.name().trim();
        if (normalizedName.isEmpty()) {
            throw new IllegalArgumentException("分类名称不能为空");
        }

        target.setName(normalizedName);
        target.setType(request.type());
        target.setDescription(request.description());
        target.setIcon(request.icon());
        target.setColor(request.color());
        target.setEnabled(request.enabled() == null || request.enabled());

        Category parent = null;
        if (request.parentId() == null) {
            target.setParent(null);
        } else {
            parent = categoryRepository.findById(request.parentId())
                    .orElseThrow(() -> new IllegalArgumentException("父分类不存在"));
            if (target.getId() != null && target.getId().equals(parent.getId())) {
                throw new IllegalArgumentException("分类不能将自己设为父分类");
            }
            if (parent.getParent() != null) {
                throw new IllegalArgumentException("只允许两级分类结构");
            }
            if (parent.getType() != request.type()) {
                throw new IllegalArgumentException("子分类类型必须与父分类一致");
            }
            target.setParent(parent);
        }

        validateNameConflict(target, normalizedName, request.type(), parent);
    }

    private void validateNameConflict(Category target, String normalizedName, Category.CategoryType type, Category parent) {
        Optional<Category> existing = parent == null
                ? categoryRepository.findByTypeAndParentIsNullAndName(type, normalizedName)
                : categoryRepository.findByTypeAndParentIdAndName(type, parent.getId(), normalizedName);

        if (existing.isPresent() && (target.getId() == null || !existing.get().getId().equals(target.getId()))) {
            throw new IllegalArgumentException("同级分类名称已存在");
        }
    }

    private Category findOrCreateRoot(User operator, PresetGroup group) {
        return categoryRepository.findByTypeAndParentIsNullAndName(group.type(), group.rootName())
                .orElseGet(() -> {
                    Category root = new Category();
                    root.setUser(operator);
                    root.setName(group.rootName());
                    root.setType(group.type());
                    root.setDescription(group.type() == Category.CategoryType.INCOME ? "收入主分类" : "支出主分类");
                    root.setIcon(group.icon());
                    root.setColor(group.color());
                    root.setEnabled(true);
                    return categoryRepository.save(root);
                });
    }

    private void findOrCreateChild(User operator, Category.CategoryType type, Category root, String childName) {
        categoryRepository.findByTypeAndParentIdAndName(type, root.getId(), childName)
                .orElseGet(() -> {
                    Category child = new Category();
                    child.setUser(operator);
                    child.setName(childName);
                    child.setType(type);
                    child.setParent(root);
                    child.setDescription("预置子分类");
                    child.setEnabled(true);
                    return categoryRepository.save(child);
                });
    }

    private void ensureAdmin(User user) {
        if (user == null || !user.isAdmin()) {
            throw new AccessDeniedException("仅管理员可执行此操作");
        }
    }

    private record PresetGroup(
            Category.CategoryType type,
            String rootName,
            String icon,
            String color,
            List<String> children
    ) {
        private PresetGroup {
            children = List.copyOf(children);
        }
    }
}

