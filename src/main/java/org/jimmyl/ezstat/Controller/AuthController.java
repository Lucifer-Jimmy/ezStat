package org.jimmyl.ezstat.Controller;

import jakarta.validation.Valid;
import org.jimmyl.ezstat.DTO.ResetPasswordRequest;
import org.jimmyl.ezstat.DTO.RegistrationPolicyResponse;
import org.jimmyl.ezstat.DTO.RegistrationPolicyUpdateRequest;
import org.jimmyl.ezstat.DTO.RegisterRequest;
import org.jimmyl.ezstat.DTO.UserProfileResponse;
import org.jimmyl.ezstat.Entity.User;
import org.jimmyl.ezstat.Service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserProfileResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.registerUser(request.username(), request.password(), request.email());
        return ResponseEntity.status(HttpStatus.CREATED).body(UserProfileResponse.from(user));
    }

    @GetMapping("/me")
    public UserProfileResponse me() {
        return UserProfileResponse.from(userService.getCurrentAuthenticatedUser());
    }


    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        User current = userService.getCurrentAuthenticatedUser();
        userService.resetPassword(
                current.getId(),
                request.currentPassword(),
                request.newPassword(),
                request.confirmPassword()
        );
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/registration")
    public RegistrationPolicyResponse registrationPolicy() {
        userService.ensureCurrentUserAdmin();
        return new RegistrationPolicyResponse(userService.isRegistrationOpen());
    }

    @PutMapping("/registration")
    public RegistrationPolicyResponse updateRegistrationPolicy(@Valid @RequestBody RegistrationPolicyUpdateRequest request) {
        boolean open = userService.setRegistrationOpen(request.open());
        return new RegistrationPolicyResponse(open);
    }
}
