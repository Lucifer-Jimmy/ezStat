(function () {
    const form = document.getElementById("registerForm");
    const message = document.getElementById("registerMessage");

    if (!form || !message) {
        return;
    }

    const csrfToken = document.querySelector('meta[name="_csrf"]')?.content || '';
    const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content || '';

    function setMessage(text, type) {
        message.className = "alert";
        message.textContent = text;
        message.classList.add(type === "error" ? "alert-error" : "alert-success");
        message.style.display = 'block';
    }

    function showError(text) {
        setMessage(text, 'error');
    }

    function showSuccess(text) {
        setMessage(text, 'success');
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const username = form.username.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;

        if (password !== confirmPassword) {
            showError("两次密码输入不一致");
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }

        try {
            const headers = { "Content-Type": "application/json" };
            if (csrfToken && csrfHeader) {
                headers[csrfHeader] = csrfToken;
            }

            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers,
                body: JSON.stringify({ username, email, password })
            });

            if (!response.ok) {
                let msg = '注册失败';
                try {
                    const body = await response.json();
                    msg = UIError.message(body, msg);
                } catch {}
                showError(msg);
                return;
            }

            showSuccess("注册成功，正在跳转登录页...");
            window.setTimeout(function () {
                window.location.href = "/login?registered=1";
            }, 800);
        } catch (error) {
            showError(UIError.message(error, '注册失败，请稍后重试'));
        } finally {
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        }
    });
})();
