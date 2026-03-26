package org.jimmyl.ezstat.Controller;

import jakarta.validation.Valid;
import org.jimmyl.ezstat.DTO.CategoryResponse;
import org.jimmyl.ezstat.DTO.CategorySaveRequest;
import org.jimmyl.ezstat.Entity.Category;
import org.jimmyl.ezstat.Entity.User;
import org.jimmyl.ezstat.Service.CategoryService;
import org.jimmyl.ezstat.Service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;
    private final UserService userService;

    public CategoryController(CategoryService categoryService, UserService userService) {
        this.categoryService = categoryService;
        this.userService = userService;
    }

    @GetMapping("/root")
    public List<CategoryResponse> listRoot(@RequestParam Category.CategoryType type) {
        return categoryService.listRoot(type);
    }

    @GetMapping("/children/{parentId}")
    public List<CategoryResponse> listChildren(@PathVariable Long parentId) {
        return categoryService.listChildren(parentId);
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategorySaveRequest request) {
        User current = userService.getCurrentAuthenticatedUser();
        userService.ensureCurrentUserAdmin();
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.create(current, request));
    }

    @PutMapping("/{id}")
    public CategoryResponse update(@PathVariable Long id, @Valid @RequestBody CategorySaveRequest request) {
        User current = userService.getCurrentAuthenticatedUser();
        userService.ensureCurrentUserAdmin();
        return categoryService.update(current, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        User current = userService.getCurrentAuthenticatedUser();
        userService.ensureCurrentUserAdmin();
        categoryService.delete(current, id);
        return ResponseEntity.noContent().build();
    }
}

