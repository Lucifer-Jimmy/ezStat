/**
 * profile.js — Profile management module
 */

(function () {
    let profile = null;

    window.Profile = {
        async load() {
            try {
                profile = await api.get('/api/auth/me');
                this.render();

                if (profile.role === 'ADMIN') {
                    await this.loadRegistrationPolicy();
                }
            } catch (err) {
                Toast.error(UIError.message(err, '加载个人信息失败'));
            }
        },

        render() {
            const avatar = document.getElementById('profileAvatar');
            const username = document.getElementById('profileUsername');
            const username2 = document.getElementById('profileUsername2');
            const email = document.getElementById('profileEmail');
            const role = document.getElementById('profileRole');
            const role2 = document.getElementById('profileRole2');
            const enabled = document.getElementById('profileEnabled');
            const policyCard = document.getElementById('registrationPolicyCard');
            const sidebarAvatar = document.getElementById('sidebarAvatar');
            const sidebarUsername = document.getElementById('sidebarUsername');
            const sidebarRole = document.getElementById('sidebarUserRole');

            if (avatar) avatar.textContent = Format.avatarLetter(profile?.username);
            if (username) username.textContent = profile?.username || '-';
            if (username2) username2.textContent = profile?.username || '-';
            if (email) email.textContent = profile?.email || '-';
            if (role) role.textContent = Format.role(profile?.role);
            if (role2) role2.textContent = Format.role(profile?.role);
            if (enabled) enabled.textContent = profile?.enabled ? '正常' : '已禁用';
            if (policyCard) {
                policyCard.classList.toggle('hidden', profile?.role !== 'ADMIN');
            }
            if (sidebarAvatar) sidebarAvatar.textContent = Format.avatarLetter(profile?.username);
            if (sidebarUsername) sidebarUsername.textContent = profile?.username || '-';
            if (sidebarRole) sidebarRole.textContent = Format.role(profile?.role);
        },

        async loadRegistrationPolicy() {
            try {
                const policy = await api.get('/api/auth/registration');
                const status = document.getElementById('regPolicyStatus');
                if (status) {
                    status.textContent = policy.open ? '注册开放' : '注册关闭';
                    status.className = policy.open ? 'badge badge-active' : 'badge badge-inactive';
                }
            } catch {}
        },

        async toggleRegistrationPolicy() {
            try {
                const current = await api.get('/api/auth/registration');
                await api.put('/api/auth/registration', { open: !current.open });
                Toast.success('注册开关已更新');
                await Profile.loadRegistrationPolicy();
            } catch (err) {
                Toast.error(UIError.message(err, '注册策略更新失败'));
            }
        },

        async resetPassword() {
            const current = document.getElementById('currentPassword')?.value;
            const np = document.getElementById('newPassword')?.value;
            const cp = document.getElementById('confirmPassword')?.value;

            if (!current || current.length < 8) { Toast.error('请输入当前密码'); return; }
            if (!np || np.length < 8) { Toast.error('新密码至少8位'); return; }
            if (np !== cp) { Toast.error('两次输入的密码不一致'); return; }

            try {
                await api.post('/api/auth/reset-password', {
                    currentPassword: current,
                    newPassword: np,
                    confirmPassword: cp
                });
                Toast.success('密码已重置');
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            } catch (err) {
                Toast.error(UIError.message(err, '密码重置失败'));
            }
        },

        getProfile() { return profile; }
    };
})();
