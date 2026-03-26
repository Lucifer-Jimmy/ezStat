package org.jimmyl.ezstat.DTO;

import jakarta.validation.constraints.NotNull;

public record RegistrationPolicyUpdateRequest(
        @NotNull(message = "注册开关不能为空") Boolean open
) {
}

