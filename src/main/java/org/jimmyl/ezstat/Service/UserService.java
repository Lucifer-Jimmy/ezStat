package org.jimmyl.ezstat.Service;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.jimmyl.ezstat.Config.SecurityProperties;
import org.jimmyl.ezstat.Entity.User;
import org.jimmyl.ezstat.Repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class UserService implements UserDetailsService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[A-Za-z0-9._-]{3,32}$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityAuditLogService securityAuditLogService;
    private final SecurityProperties securityProperties;
    private final Validator validator;
    private final RegistrationPolicyService registrationPolicyService;
    private final CategoryService categoryService;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            SecurityAuditLogService securityAuditLogService,
            SecurityProperties securityProperties,
            Validator validator,
            RegistrationPolicyService registrationPolicyService,
            CategoryService categoryService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.securityAuditLogService = securityAuditLogService;
        this.securityProperties = securityProperties;
        this.validator = validator;
        this.registrationPolicyService = registrationPolicyService;
        this.categoryService = categoryService;
    }

    @Transactional
    public User registerUser(String username, String rawPassword, String email) {
        enforceRegistrationPolicy();

        String normalizedUsername = normalizeUsername(username);
        String normalizedEmail = normalizeEmail(email);

        validateUsername(normalizedUsername);
        validateEmail(normalizedEmail);
        validatePassword(rawPassword);

        if (userRepository.existsByUsernameIgnoreCase(normalizedUsername)
                || userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new IllegalArgumentException("用户名或邮箱已被使用");
        }

        User user = new User();
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setEnabled(true);
        user.setRole(User.Role.USER);
        user.setFailedLoginAttempts(0);
        user.setAccountLockedUntil(null);

        return userRepository.save(user);
    }

    @Transactional
    public void ensureAdminExistsOnStartup() {
        registrationPolicyService.initializeDefaultIfMissing();
        User admin = userRepository.findFirstByRoleOrderByIdAsc(User.Role.ADMIN).orElse(null);
        if (admin == null) {
            if (!securityProperties.getBootstrapAdmin().isEnabled()) {
                log.warn("Bootstrap admin is disabled and no admin exists; skip preset category initialization.");
                return;
            }

            String username = normalizeUsername(securityProperties.getBootstrapAdmin().getUsername());
            String email = normalizeEmail(securityProperties.getBootstrapAdmin().getEmail());
            String configuredPassword = securityProperties.getBootstrapAdmin().getPassword();
            validatePassword(configuredPassword);

            if (userRepository.existsByUsernameIgnoreCase(username) || userRepository.existsByEmailIgnoreCase(email)) {
                throw new IllegalStateException("初始化管理员失败：配置的默认管理员用户名或邮箱已被占用");
            }

            User bootstrapAdmin = new User();
            bootstrapAdmin.setUsername(username);
            bootstrapAdmin.setEmail(email);
            bootstrapAdmin.setPassword(passwordEncoder.encode(configuredPassword));
            bootstrapAdmin.setEnabled(true);
            bootstrapAdmin.setRole(User.Role.ADMIN);
            bootstrapAdmin.setFailedLoginAttempts(0);
            bootstrapAdmin.setAccountLockedUntil(null);

            admin = userRepository.save(bootstrapAdmin);
            securityAuditLogService.log("BOOTSTRAP_ADMIN", true, admin.getId(), admin.getUsername(), "系统自动创建管理员账号");

            log.warn("================ EZSTAT BOOTSTRAP ADMIN ================");
            log.warn("Admin username: {}", username);
            log.warn("Admin email   : {}", email);
            log.warn("Admin password: [CONFIGURED_VALUE]");
            log.warn("Please login and change the configured bootstrap password immediately.");
            log.warn("========================================================");
        }

        categoryService.ensurePresetCategories(admin);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String normalizedUsername = normalizeUsername(username);
        User user = userRepository.findByUsernameIgnoreCase(normalizedUsername)
                .orElseThrow(() -> new UsernameNotFoundException("用户不存在"));

        if (!Boolean.TRUE.equals(user.getEnabled())) {
            throw new DisabledException("账号已被禁用");
        }

        if (isTemporarilyLocked(user)) {
            throw new LockedException("登录失败次数过多，账号已暂时锁定");
        }

        User.Role role = user.getRole() == null ? User.Role.USER : user.getRole();
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                authorities
        );
    }

    @Transactional(readOnly = true)
    public User getActiveUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));

        if (!Boolean.TRUE.equals(user.getEnabled())) {
            throw new IllegalStateException("账号已被禁用");
        }

        return user;
    }

    public User getUserByUsername(String username) {
        String normalizedUsername = normalizeUsername(username);
        return userRepository.findByUsernameIgnoreCase(normalizedUsername)
                .orElseThrow(() -> new UsernameNotFoundException("用户不存在"));
    }

    public User getCurrentAuthenticatedUser() {
        String username = extractCurrentUsernameOrNull();
        if (username == null) {
            throw new IllegalStateException("当前未登录");
        }
        return getUserByUsername(username);
    }

    public User getCurrentAuthenticatedUserOrNull() {
        String username = extractCurrentUsernameOrNull();
        if (username == null) {
            return null;
        }
        try {
            return getUserByUsername(username);
        } catch (UsernameNotFoundException ex) {
            return null;
        }
    }

    @Transactional(readOnly = true)
    public boolean isRegistrationOpen() {
        return registrationPolicyService.isRegistrationOpen();
    }

    @Transactional
    public boolean setRegistrationOpen(boolean open) {
        ensureCurrentUserAdmin();
        return registrationPolicyService.setRegistrationOpen(open);
    }

    public void ensureCurrentUserAdmin() {
        User current = getCurrentAuthenticatedUser();
        if (!current.isAdmin()) {
            throw new AccessDeniedException("仅管理员可执行此操作");
        }
    }

    @Transactional
    public void resetPassword(Long userId, String currentPassword, String newPassword, String confirmPassword) {
        User user = getActiveUserById(userId);

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("当前密码错误");
        }

        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("两次输入的新密码不一致");
        }

        applyNewPassword(user, newPassword);
    }

    @Transactional
    public void recordLoginFailure(String username) {
        if (username == null || username.isBlank()) {
            return;
        }
        String normalizedUsername = normalizeUsername(username);
        userRepository.findByUsernameIgnoreCase(normalizedUsername).ifPresent(user -> {
            int currentAttempts = user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts();
            int nextAttempts = currentAttempts + 1;
            user.setFailedLoginAttempts(nextAttempts);

            if (nextAttempts >= securityProperties.getLogin().getMaxFailedAttempts()) {
                user.setAccountLockedUntil(LocalDateTime.now().plus(securityProperties.getLogin().getLockDuration()));
                user.setFailedLoginAttempts(0);
            }

            userRepository.save(user);
        });
    }

    @Transactional
    public void recordLoginSuccess(String username) {
        if (username == null || username.isBlank()) {
            return;
        }
        String normalizedUsername = normalizeUsername(username);
        userRepository.findByUsernameIgnoreCase(normalizedUsername).ifPresent(user -> {
            user.setFailedLoginAttempts(0);
            user.setAccountLockedUntil(null);
            userRepository.save(user);
        });
    }


    private String normalizeUsername(String username) {
        if (username == null) {
            throw new IllegalArgumentException("用户名不能为空");
        }
        return username.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            throw new IllegalArgumentException("邮箱不能为空");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private void validateUsername(String username) {
        if (!USERNAME_PATTERN.matcher(username).matches()) {
            throw new IllegalArgumentException("用户名格式不合法，长度3-32，只允许字母/数字/._-");
        }
    }

    private void validateEmail(String email) {
        Set<ConstraintViolation<User>> violations = validator.validateValue(User.class, "email", email);
        if (!violations.isEmpty()) {
            throw new IllegalArgumentException(violations.iterator().next().getMessage());
        }
    }

    private void validatePassword(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("密码不能为空");
        }
        if (rawPassword.length() < 8 || rawPassword.length() > 72) {
            throw new IllegalArgumentException("密码长度必须在8到72位之间");
        }

        boolean hasUpper = false;
        boolean hasLower = false;
        boolean hasDigit = false;
        boolean hasSpecial = false;

        for (char ch : rawPassword.toCharArray()) {
            if (Character.isUpperCase(ch)) {
                hasUpper = true;
            } else if (Character.isLowerCase(ch)) {
                hasLower = true;
            } else if (Character.isDigit(ch)) {
                hasDigit = true;
            } else {
                hasSpecial = true;
            }
        }

        if (!(hasUpper && hasLower && hasDigit && hasSpecial)) {
            throw new IllegalArgumentException("密码必须包含大写字母、小写字母、数字和特殊字符");
        }
    }

    private void applyNewPassword(User user, String newPassword) {
        validatePassword(newPassword);
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new IllegalArgumentException("新密码不能与当前密码相同");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private boolean isTemporarilyLocked(User user) {
        LocalDateTime lockedUntil = user.getAccountLockedUntil();
        return lockedUntil != null && lockedUntil.isAfter(LocalDateTime.now());
    }

    private void enforceRegistrationPolicy() {
        if (registrationPolicyService.isRegistrationOpen()) {
            return;
        }

        User current = getCurrentAuthenticatedUserOrNull();
        if (current != null && current.isAdmin()) {
            return;
        }

        throw new AccessDeniedException("注册已关闭，请联系管理员");
    }


    private String extractCurrentUsernameOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }
        if (principal instanceof String principalName && !"anonymousUser".equals(principalName)) {
            return principalName;
        }
        return null;
    }

}
