package org.jimmyl.ezstat.DTO;

import org.jimmyl.ezstat.Entity.User;

public record UserProfileResponse(Long id, String username, String email, String role, Boolean enabled) {
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().name(),
                user.getEnabled()
        );
    }
}

