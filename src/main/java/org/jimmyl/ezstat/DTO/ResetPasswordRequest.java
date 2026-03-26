package org.jimmyl.ezstat.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "当前密码不能为空") String currentPassword,
        @NotBlank(message = "新密码不能为空") @Size(min = 8, max = 72, message = "新密码长度必须在8到72之间") String newPassword,
        @NotBlank(message = "确认密码不能为空") @Size(min = 8, max = 72, message = "确认密码长度必须在8到72之间") String confirmPassword
) {
}

