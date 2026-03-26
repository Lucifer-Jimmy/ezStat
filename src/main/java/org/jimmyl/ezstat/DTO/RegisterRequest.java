package org.jimmyl.ezstat.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "用户名不能为空")
        @Size(min = 3, max = 32, message = "用户名长度必须在3到32之间")
        String username,

        @NotBlank(message = "密码不能为空")
        @Size(min = 8, max = 72, message = "密码长度必须在8到72之间")
        String password,

        @NotBlank(message = "邮箱不能为空")
        @Email(message = "邮箱格式不合法")
        String email
) {
}

