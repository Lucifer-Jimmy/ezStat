package org.jimmyl.ezstat.Controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class IndexController {

    @GetMapping("/")
    public String home() {
        return "redirect:/dashboard";
    }

    @GetMapping("/login")
    public String login(Authentication authentication) {
        if (isLoggedIn(authentication)) {
            return "redirect:/dashboard";
        }
        return "login";
    }

    @GetMapping("/register")
    public String register(Authentication authentication) {
        if (isLoggedIn(authentication)) {
            return "redirect:/dashboard";
        }
        return "register";
    }

    @GetMapping({"/dashboard", "/accounts", "/categories", "/transactions", "/budgets", "/transfers", "/profile"})
    public String appPages(HttpServletRequest request, Model model) {
        String page = request.getRequestURI().replaceFirst("^/", "");
        model.addAttribute("activePage", page.isBlank() ? "dashboard" : page);
        return "app";
    }

    private boolean isLoggedIn(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
    }
}
