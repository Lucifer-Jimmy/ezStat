(function () {
    'use strict';

    const state = {
        currentPage: 'dashboard',
        profile: null,
        accounts: [],
        categoryRoots: { EXPENSE: [], INCOME: [] },
        categoryChildren: {},
        commonLoadedAt: 0
    };

    let pendingConfirm = null;
    let commonInflight = null;
    const COMMON_CACHE_TTL_MS = 60 * 1000;

    document.addEventListener('DOMContentLoaded', async () => {
        initTheme();
        setTopbarDate();
        bindNavigation();
        bindSidebarToggle();
        bindChartPeriodSelector();
        initButtonRipple();
        initTopbarScrollShadow();
        state.currentPage = window.location.pathname.replace(/^\//, '') || 'dashboard';
        await loadProfile();
        await window.App.refreshCommon();
        await navigate(state.currentPage, false);
    });

    function bindNavigation() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                if (page) {
                    navigate(page);
                }
            });
        });
    }

    window.App = {
        async navigate(page, pushState = true) {
            const validPages = ['dashboard','accounts','categories','transactions','budgets','transfers','profile'];
            if (!validPages.includes(page)) page = 'dashboard';

            if (pushState) {
                window.history.pushState({}, '', '/' + page);
            }

            document.querySelectorAll('.nav-item').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.page === page);
            });

            const title = document.querySelector(`.nav-item[data-page="${page}"]`)?.dataset.title || page;
            document.getElementById('topbarTitle').textContent = title;

            const sections = document.querySelectorAll('.page-section');
            sections.forEach(s => {
                s.classList.remove('active');
            });

            const target = document.getElementById('page-' + page);
            if (target) {
                setTimeout(() => {
                    target.classList.add('active');
                }, 50);
            }

            state.currentPage = page;

            await loadPage(page);
        },

        async refreshCommon(forceRefresh = false) {
            const hasCache = state.accounts.length > 0
                    && Array.isArray(state.categoryRoots.EXPENSE)
                    && Array.isArray(state.categoryRoots.INCOME)
                    && state.commonLoadedAt > 0
                    && (Date.now() - state.commonLoadedAt) < COMMON_CACHE_TTL_MS;

            if (!forceRefresh && hasCache) {
                updateSharedSelects();
                return;
            }

            if (commonInflight) {
                await commonInflight;
                return;
            }

            commonInflight = (async () => {
            try {
                state.accounts = await api.get('/api/accounts');
            } catch (err) {
                console.warn('[App] Failed to load accounts:', err.message);
                state.accounts = [];
            }

            try {
                const [exp, inc] = await Promise.all([
                    api.get('/api/categories/root?type=EXPENSE'),
                    api.get('/api/categories/root?type=INCOME')
                ]);
                state.categoryRoots.EXPENSE = exp;
                state.categoryRoots.INCOME = inc;

                state.categoryChildren = {};
                const allRoots = [...exp, ...inc];
                for (const parent of allRoots) {
                    try {
                        state.categoryChildren[parent.id] = await api.get('/api/categories/children/' + parent.id);
                    } catch {
                        state.categoryChildren[parent.id] = [];
                    }
                }
            } catch (err) {
                console.warn('[App] Failed to load categories:', err.message);
                state.categoryRoots = { EXPENSE: [], INCOME: [] };
                state.categoryChildren = {};
            }

            state.commonLoadedAt = Date.now();
            updateSharedSelects();
            })();

            try {
                await commonInflight;
            } finally {
                commonInflight = null;
            }
        },

        async afterMutation(options = {}) {
            const {
                reload = null,
                refreshCommon = true,
                forceRefresh = true,
                refreshDashboard = false
            } = options;

            if (typeof reload === 'function') {
                await reload();
            }

            if (refreshCommon) {
                await this.refreshCommon(forceRefresh);
            }

            if (refreshDashboard && window.Dashboard?.load) {
                await Dashboard.load();
            }
        },

        confirm(message, onConfirm) {
            const overlay = document.getElementById('confirmOverlay');
            const msgEl = document.getElementById('confirmMessage');
            if (msgEl) msgEl.textContent = message;
            pendingConfirm = onConfirm;
            overlay.classList.add('active');
            if (window._scrollLock) window._scrollLock.lock();
        },

        closeConfirm() {
            const overlay = document.getElementById('confirmOverlay');
            overlay.classList.remove('active');
            if (window._scrollLock) window._scrollLock.unlock();
            pendingConfirm = null;
        },

        confirmAction() {
            if (pendingConfirm) {
                pendingConfirm();
            }
            App.closeConfirm();
        }
    };

    async function navigate(page, pushState = true) {
        await window.App.navigate(page, pushState);
    }

    async function loadPage(page) {
        try {
            switch (page) {
                case 'dashboard':
                    if (window.Dashboard?.load) await Dashboard.load();
                    break;
                case 'accounts':
                    if (window.Accounts?.load) await Accounts.load();
                    break;
                case 'categories':
                    if (window.Categories?.load) await Categories.load();
                    break;
                case 'transactions':
                    if (window.Transactions?.load) {
                        Transactions.setAccounts(state.accounts);
                        Transactions.setCategories(state.categoryRoots, state.categoryChildren);
                        await Transactions.load();
                    }
                    break;
                case 'budgets':
                    if (window.Budgets?.load) await Budgets.load();
                    break;
                case 'transfers':
                    if (window.Transfers?.load) {
                        Transfers.setAccounts(state.accounts);
                        await Transfers.load();
                    }
                    break;
                case 'profile':
                    if (window.Profile?.load) await Profile.load();
                    break;
            }
        } catch (err) {
            console.error('[App] Page load error for', page + ':', err);
            if (typeof Toast !== 'undefined' && Toast.error) {
                Toast.error(UIError.message(err, '加载失败'));
            }
        }
    }

    async function loadProfile() {
        try {
            state.profile = await api.get('/api/auth/me');
            const avatar = document.getElementById('sidebarAvatar');
            const username = document.getElementById('sidebarUsername');
            const role = document.getElementById('sidebarUserRole');
            if (avatar) avatar.textContent = Format.avatarLetter(state.profile?.username);
            if (username) username.textContent = state.profile?.username || '-';
            if (role) role.textContent = Format.role(state.profile?.role);
        } catch (err) {
            console.warn('[App] Not authenticated, redirecting to login');
            window.location.href = '/login';
        }
    }

    function updateSharedSelects() {
        const txFilterAccount = document.getElementById('txFilterAccount');
        if (txFilterAccount) {
            txFilterAccount.innerHTML = '<option value="">全部账户</option>' +
                state.accounts.map(a => `<option value="${a.id}">${Format.escape(a.name)}</option>`).join('');
        }

        if (state.profile) {
            const avatar = document.getElementById('sidebarAvatar');
            const username = document.getElementById('sidebarUsername');
            if (avatar) avatar.textContent = Format.avatarLetter(state.profile?.username);
            if (username) username.textContent = state.profile?.username || '-';
        }
    }

    function bindSidebarToggle() {
        const toggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (!toggle || !sidebar) return;

        function openSidebar() {
            sidebar.classList.add('open');
            if (overlay) overlay.classList.add('active');
            if (window._scrollLock) window._scrollLock.lock();
        }

        function closeSidebar() {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
            if (window._scrollLock) window._scrollLock.unlock();
        }

        toggle.addEventListener('click', () => {
            sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
        });

        if (overlay) {
            overlay.addEventListener('click', closeSidebar);
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 900) closeSidebar();
            });
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
        });
    }

    function bindChartPeriodSelector() {
        const select = document.getElementById('chartPeriodSelect');
        if (select) {
            select.addEventListener('change', () => {
                if (window.Dashboard?.loadCharts) {
                    Dashboard.loadCharts();
                }
            });
        }
    }

    // Button ripple effect — delegated click handler
    function initButtonRipple() {
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.btn-primary, .btn-secondary');
            if (!btn || btn.disabled) return;

            const existing = btn.querySelector('.btn-ripple');
            if (existing) existing.remove();

            const ripple = document.createElement('span');
            ripple.className = 'btn-ripple';
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) * 2;
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            btn.appendChild(ripple);

            ripple.addEventListener('animationend', () => ripple.remove());
        });
    }

    // Topbar scroll shadow
    function initTopbarScrollShadow() {
        const topbar = document.querySelector('.topbar');
        if (!topbar) return;

        const content = document.querySelector('.page-content');
        if (!content) return;

        let ticking = false;
        window.addEventListener('scroll', function() {
            if (!ticking) {
                requestAnimationFrame(function() {
                    topbar.classList.toggle('scrolled', window.scrollY > 8);
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    function initTheme() {
        const saved = localStorage.getItem('ezstat-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        applyTheme(theme);

        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme');
                const next = current === 'dark' ? 'light' : 'dark';
                // Add transition class for smooth theme switch
                document.body.classList.add('theme-transitioning');
                applyTheme(next);
                localStorage.setItem('ezstat-theme', next);
                // Remove transition class after animation completes
                setTimeout(() => document.body.classList.remove('theme-transitioning'), 500);
                if (window.ChartUtil?.resizeAll) {
                    setTimeout(() => ChartUtil.resizeAll(), 100);
                }
                if (state.currentPage === 'dashboard' && window.Dashboard?.loadCharts) {
                    setTimeout(() => Dashboard.loadCharts(), 150);
                }
            });
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('ezstat-theme')) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const sunIcon = document.getElementById('themeIconSun');
        const moonIcon = document.getElementById('themeIconMoon');
        if (sunIcon && moonIcon) {
            sunIcon.style.display = theme === 'dark' ? 'block' : 'none';
            moonIcon.style.display = theme === 'dark' ? 'none' : 'block';
        }
    }

    function setTopbarDate() {
        const el = document.getElementById('topbarDate');
        if (!el) return;
        const now = new Date();
        el.textContent = now.toLocaleDateString('zh-CN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            const confirmOverlay = document.getElementById('confirmOverlay');
            if (confirmOverlay?.classList.contains('active')) {
                App.closeConfirm();
            }
        }
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.ChartUtil?.resizeAll) ChartUtil.resizeAll();
        }, 200);
    });
})();
