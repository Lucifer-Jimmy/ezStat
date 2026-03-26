package org.jimmyl.ezstat.Config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Validated
@ConfigurationProperties(prefix = "ezstat.security")
public class SecurityProperties {

    @Valid
    private final Login login = new Login();

    @Valid
    private final Registration registration = new Registration();

    @Valid
    private final BootstrapAdmin bootstrapAdmin = new BootstrapAdmin();

    public Login getLogin() {
        return login;
    }

    public Registration getRegistration() {
        return registration;
    }

    public BootstrapAdmin getBootstrapAdmin() {
        return bootstrapAdmin;
    }

    public static class Login {

        @Min(1)
        private int maxFailedAttempts = 5;

        @NotNull
        private Duration lockDuration = Duration.ofMinutes(15);

        public int getMaxFailedAttempts() {
            return maxFailedAttempts;
        }

        public void setMaxFailedAttempts(int maxFailedAttempts) {
            this.maxFailedAttempts = maxFailedAttempts;
        }

        public Duration getLockDuration() {
            return lockDuration;
        }

        public void setLockDuration(Duration lockDuration) {
            this.lockDuration = lockDuration;
        }
    }

    public static class Registration {

        private boolean open = true;

        public boolean isOpen() {
            return open;
        }

        public void setOpen(boolean open) {
            this.open = open;
        }
    }

    public static class BootstrapAdmin {

        private boolean enabled = true;

        @NotNull
        private String username = "admin";

        @NotNull
        private String email = "admin@localhost";

        @NotBlank
        private String password = "ChangeMe123!";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }
}

