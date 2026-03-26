/**
 * modal.js — Modal dialog system
 * DOM elements are accessed after DOMContentLoaded to ensure they exist
 */

(function () {
    let overlay, dialog, titleEl, bodyEl, footerEl;
    let currentCallback = null;
    let scrollLockCount = 0;

    function lockScroll() {
        if (scrollLockCount === 0) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = scrollbarWidth + 'px';
            const topbar = document.querySelector('.topbar');
            if (topbar) topbar.style.paddingRight = scrollbarWidth + 'px';
        }
        scrollLockCount++;
    }

    function unlockScroll() {
        scrollLockCount = Math.max(0, scrollLockCount - 1);
        if (scrollLockCount === 0) {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            const topbar = document.querySelector('.topbar');
            if (topbar) topbar.style.paddingRight = '';
        }
    }

    window._scrollLock = { lock: lockScroll, unlock: unlockScroll };

    function init() {
        overlay = document.getElementById('modalOverlay');
        dialog = document.getElementById('modalDialog');
        titleEl = document.getElementById('modalTitle');
        bodyEl = document.getElementById('modalBody');
        footerEl = document.getElementById('modalFooter');

        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) Modal.close();
            });
        }
    }

    // Init after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.Modal = {
        open(options = {}) {
            if (!overlay || !dialog) {
                console.error('Modal not initialized: DOM elements not found');
                return;
            }

            const {
                title = '提示',
                titleIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>',
                body = '',
                buttons = [],
                large = false,
                onClose = null
            } = options;

            titleEl.innerHTML = titleIcon + ' ' + esc(title);
            bodyEl.innerHTML = body;

            if (large) {
                dialog.classList.add('modal-lg');
            } else {
                dialog.classList.remove('modal-lg');
            }

            footerEl.innerHTML = buttons.map(btn => {
                const cls = btn.danger ? 'btn btn-danger' : btn.primary ? 'btn btn-primary' : 'btn btn-secondary';
                const icon = btn.icon || '';
                const loadingCls = btn.loading ? ' loading' : '';
                return `<button class="${cls}${loadingCls}" id="modalBtn_${btn.id || ''}">${icon}${esc(btn.label)}</button>`;
            }).join('');

            buttons.forEach(btn => {
                const el = document.getElementById('modalBtn_' + (btn.id || ''));
                if (!el) return;
                el.addEventListener('click', () => {
                    if (btn.loading) {
                        el.classList.add('loading');
                        el.disabled = true;
                    }
                    if (btn.onClick) {
                        btn.onClick();
                    }
                });
            });

            currentCallback = onClose;
            overlay.classList.add('active');
            lockScroll();

            // Focus first input
            setTimeout(() => {
                const firstInput = bodyEl.querySelector('input, select, textarea');
                if (firstInput) firstInput.focus();
            }, 100);
        },

        close() {
            if (!overlay) return;
            overlay.classList.remove('active');
            unlockScroll();
            if (currentCallback) {
                currentCallback();
                currentCallback = null;
            }
        },

        setLoading(btnId, loading) {
            const btn = document.getElementById('modalBtn_' + btnId);
            if (!btn) return;
            if (loading) {
                btn.classList.add('loading');
                btn.disabled = true;
            } else {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        },

        // Common confirm dialog
        confirm(message, onConfirm, title = '确认操作') {
            Modal.open({
                title,
                titleIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
                body: `<p style="font-size:15px;color:var(--text-primary);text-align:center;line-height:1.7;">${esc(message)}</p>`,
                buttons: [
                    { id: 'cancel', label: '取消', onClick: () => Modal.close() },
                    { id: 'confirm', label: '确认', danger: true, primary: true, onClick: () => { onConfirm(); Modal.close(); } }
                ]
            });
        },

        alert(message, title = '提示', onClose) {
            Modal.open({
                title,
                titleIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
                body: `<p style="font-size:15px;color:var(--text-primary);text-align:center;line-height:1.7;">${esc(message)}</p>`,
                buttons: [
                    { id: 'ok', label: '知道了', primary: true, onClick: () => { if (onClose) onClose(); Modal.close(); } }
                ]
            });
        },

        // Account form modal
        accountForm(data, onSave) {
            const isEdit = !!data;
            const selectedType = data?.type || 'CASH';
            Modal.open({
                title: isEdit ? '编辑账户' : '新建账户',
                titleIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
                large: false,
                body: `
                    <div style="display:flex;flex-direction:column;gap:14px;">
                        <div class="form-group">
                            <label class="form-label required">账户名称</label>
                            <input class="form-control" id="mAccountName" value="${esc(data?.name || '')}" placeholder="如：我的银行卡" maxlength="50">
                        </div>
                        <div class="form-group">
                            <label class="form-label required">账户类型</label>
                            <div class="custom-select" id="mAccountTypeSelect">
                                <button type="button" class="custom-select-trigger" id="mAccountTypeTrigger" aria-haspopup="listbox" aria-expanded="false">
                                    <span class="custom-select-value" id="mAccountTypeLabel">${Format.accountType(selectedType)}</span>
                                    <span class="custom-select-arrow">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                    </span>
                                </button>
                                <div class="custom-select-menu" id="mAccountTypeMenu" role="listbox">
                                    ${renderAccountTypeOption('CASH', selectedType)}
                                    ${renderAccountTypeOption('BANK_CARD', selectedType)}
                                    ${renderAccountTypeOption('ALIPAY', selectedType)}
                                    ${renderAccountTypeOption('WECHAT', selectedType)}
                                    ${renderAccountTypeOption('OTHER', selectedType)}
                                </div>
                                <input type="hidden" id="mAccountType" value="${selectedType}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">初始余额</label>
                            <input class="form-control" id="mAccountBalance" type="number" step="0.01" min="0" value="${data?.balance != null ? data.balance : '0.00'}" ${isEdit ? 'readonly style="background:var(--bg-page);cursor:not-allowed;"' : ''}>
                            ${isEdit ? '<small class="muted">编辑时余额由交易自动计算</small>' : ''}
                        </div>
                        <div class="form-group">
                            <label class="form-label">描述</label>
                            <textarea class="form-control" id="mAccountDesc" rows="2" placeholder="可选">${esc(data?.description || '')}</textarea>
                        </div>
                        <div class="form-group">
                            <div class="toggle-wrap">
                                <label class="toggle">
                                    <input type="checkbox" id="mAccountEnabled" ${data?.enabled !== false ? 'checked' : ''}>
                                    <span class="toggle-slider"></span>
                                </label>
                                <span class="toggle-label">启用账户</span>
                            </div>
                        </div>
                    </div>
                `,
                buttons: [
                    { id: 'cancel', label: '取消', onClick: () => Modal.close() },
                    { id: 'save', label: '保存', primary: true, onClick: () => {
                        const name = document.getElementById('mAccountName').value.trim();
                        if (!name) { Toast.error('请输入账户名称'); return; }
                        if (typeof Toast === 'undefined') { alert('请输入账户名称'); return; }
                        onSave({
                            name,
                            type: document.getElementById('mAccountType').value,
                            balance: Number(document.getElementById('mAccountBalance').value || 0).toFixed(2),
                            description: document.getElementById('mAccountDesc').value.trim(),
                            enabled: document.getElementById('mAccountEnabled').checked
                        });
                    }}
                ]
            });

            setTimeout(() => initAccountTypeSelect(), 0);
        },

        // Category form modal
        categoryForm(data, roots, childrenMap, onSave) {
            const isEdit = !!data;
            const type = data?.type || 'EXPENSE';
            const relevantRoots = (roots[type] || []);

            Modal.open({
                title: isEdit ? '编辑分类' : '新建分类',
                titleIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>',
                large: true,
                body: `
                    <div style="display:flex;flex-direction:column;gap:14px;">
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label required">分类名称</label>
                                <input class="form-control" id="mCatName" value="${esc(data?.name || '')}" placeholder="如：餐饮" maxlength="30">
                            </div>
                            <div class="form-group">
                                <label class="form-label required">类型</label>
                                <select class="form-control" id="mCatType" ${isEdit ? 'disabled' : ''}>
                                    <option value="EXPENSE" ${type === 'EXPENSE' ? 'selected' : ''}>支出</option>
                                    <option value="INCOME" ${type === 'INCOME' ? 'selected' : ''}>收入</option>
                                </select>
                                ${isEdit ? '<input type="hidden" id="mCatTypeHidden" value="' + type + '">' : ''}
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">父分类（可选，二级分类）</label>
                            <select class="form-control" id="mCatParent">
                                <option value="">— 一级分类 —</option>
                                ${relevantRoots.map(r => `<option value="${r.id}" ${Number(data?.parentId) === Number(r.id) ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label">颜色</label>
                                <input class="form-control" id="mCatColor" type="color" value="${data?.color || '#6366f1'}" style="height:42px;padding:4px;">
                            </div>
                            <div class="form-group">
                                <label class="form-label">图标代码</label>
                                <input class="form-control" id="mCatIcon" value="${esc(data?.icon || '')}" placeholder="如：utensils">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">描述</label>
                            <textarea class="form-control" id="mCatDesc" rows="2" placeholder="可选">${esc(data?.description || '')}</textarea>
                        </div>
                        <div class="form-group">
                            <div class="toggle-wrap">
                                <label class="toggle">
                                    <input type="checkbox" id="mCatEnabled" ${data?.enabled !== false ? 'checked' : ''}>
                                    <span class="toggle-slider"></span>
                                </label>
                                <span class="toggle-label">启用分类</span>
                            </div>
                        </div>
                    </div>
                `,
                buttons: [
                    { id: 'cancel', label: '取消', onClick: () => Modal.close() },
                    { id: 'save', label: '保存', primary: true, onClick: () => {
                        const name = document.getElementById('mCatName').value.trim();
                        if (!name) { Toast.error('请输入分类名称'); return; }
                        const typeVal = document.getElementById('mCatTypeHidden')?.value || document.getElementById('mCatType').value;
                        const parentVal = document.getElementById('mCatParent').value;
                        onSave({
                            name,
                            type: typeVal,
                            parentId: parentVal ? Number(parentVal) : null,
                            description: document.getElementById('mCatDesc').value.trim(),
                            icon: document.getElementById('mCatIcon').value.trim(),
                            color: document.getElementById('mCatColor').value,
                            enabled: document.getElementById('mCatEnabled').checked
                        });
                    }}
                ]
            });
        },

        // Transaction form modal
        transactionForm(data, accounts, categoryRoots, categoryChildren, onSave) {
            const isEdit = !!data;
            const type = data?.type || 'EXPENSE';
            const txTimeValue = data?.transactionDate ? Format.datetimeInput(data.transactionDate) : Format.datetimeInput(new Date());

            Modal.open({
                title: isEdit ? '编辑交易' : '记一笔',
                titleIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
                large: true,
                body: `
                    <div style="display:flex;flex-direction:column;gap:14px;">
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label required">类型</label>
                                <select class="form-control" id="mTxType">
                                    <option value="EXPENSE" ${type === 'EXPENSE' ? 'selected' : ''}>💸 支出</option>
                                    <option value="INCOME" ${type === 'INCOME' ? 'selected' : ''}>💰 收入</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label required">金额</label>
                                <input class="form-control" id="mTxAmount" type="number" step="0.01" min="0.01" value="${data?.amount || ''}" placeholder="0.00">
                            </div>
                        </div>
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label required">时间</label>
                                <input class="form-control" id="mTxDate" type="text" inputmode="numeric" placeholder="YYYY-MM-DD HH:mm" value="${txTimeValue}">
                                <div class="action-row" style="margin-top:6px;gap:8px;">
                                    <button type="button" class="btn btn-ghost btn-sm" id="mTxNowBtn">现在</button>
                                    <button type="button" class="btn btn-ghost btn-sm" id="mTxMorningBtn">今天 09:00</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label required">账户</label>
                                <select class="form-control" id="mTxAccount">
                                    <option value="">— 选择账户 —</option>
                                    ${accounts.map(a => `<option value="${a.id}" ${Number(data?.accountId) === Number(a.id) ? 'selected' : ''}>${esc(a.name)} (${Format.accountType(a.type)})</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label required">主分类</label>
                                <select class="form-control" id="mTxMainCat">
                                    <option value="">— 选择分类 —</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">子分类</label>
                                <select class="form-control" id="mTxSubCat">
                                    <option value="">— 选择子分类 —</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">备注</label>
                            <textarea class="form-control" id="mTxDesc" rows="2" placeholder="可选">${esc(data?.description || '')}</textarea>
                        </div>
                    </div>
                `,
                buttons: [
                    { id: 'cancel', label: '取消', onClick: () => Modal.close() },
                    { id: 'save', label: '保存', primary: true, onClick: () => {
                        const amount = Number(document.getElementById('mTxAmount').value);
                        const accountId = Number(document.getElementById('mTxAccount').value);
                        const mainCatId = Number(document.getElementById('mTxMainCat').value);
                        const subCatId = Number(document.getElementById('mTxSubCat').value) || null;
                        const txDateTimeRaw = document.getElementById('mTxDate').value;
                        const txDateTime = Format.normalizeDateTimeInput(txDateTimeRaw);
                        if (!Number.isFinite(amount) || amount <= 0) { Toast.error('请输入有效金额'); return; }
                        if (!txDateTime) { Toast.error('请输入正确的时间，格式为 YYYY-MM-DD HH:mm'); return; }
                        const txDateObj = new Date(txDateTime);
                        if (isNaN(txDateObj.getTime())) { Toast.error('交易时间格式无效'); return; }
                        if (txDateObj.getTime() > Date.now() + 60 * 1000) { Toast.error('交易时间不能晚于当前时间'); return; }
                        if (txDateObj.getFullYear() < 2000) { Toast.error('交易时间不合理'); return; }
                        if (!accountId) { Toast.error('请选择账户'); return; }
                        if (!mainCatId) { Toast.error('请选择主分类'); return; }
                        if (!subCatId) { Toast.error('请选择子分类'); return; }
                        onSave({
                            type: document.getElementById('mTxType').value,
                            amount: amount.toFixed(2),
                            transactionDate: txDateTime,
                            accountId,
                            mainCategoryId: mainCatId,
                            subCategoryId: subCatId,
                            description: document.getElementById('mTxDesc').value.trim()
                        });
                    }}
                ]
            });

            setTimeout(() => {
                const txType = document.getElementById('mTxType');
                const mainCat = document.getElementById('mTxMainCat');
                const subCat = document.getElementById('mTxSubCat');
                const txDateInput = document.getElementById('mTxDate');
                const nowBtn = document.getElementById('mTxNowBtn');
                const morningBtn = document.getElementById('mTxMorningBtn');
                if (!txType || !mainCat) return;

                if (txDateInput) {
                    txDateInput.addEventListener('blur', () => {
                        const normalized = Format.normalizeDateTimeInput(txDateInput.value);
                        if (normalized) {
                            txDateInput.value = Format.datetimeInput(normalized);
                        }
                    });
                }

                nowBtn?.addEventListener('click', () => {
                    if (txDateInput) txDateInput.value = Format.datetimeInput(new Date());
                });

                morningBtn?.addEventListener('click', () => {
                    if (!txDateInput) return;
                    const today = Format.today();
                    txDateInput.value = `${today} 09:00`;
                });

                function updateCats() {
                    const t = txType.value;
                    const roots = categoryRoots[t] || [];
                    mainCat.innerHTML = '<option value="">— 选择分类 —</option>' +
                        roots.map(r => `<option value="${r.id}" ${Number(data?.mainCategoryId) === Number(r.id) ? 'selected' : ''}>${esc(r.name)}</option>`).join('');

                    if (window.EnhancedSelect?.refreshAll) {
                        window.EnhancedSelect.refreshAll(document.getElementById('modalBody'));
                    }

                    if (data?.mainCategoryId) {
                        updateSubCats(data.mainCategoryId);
                    }
                }

                function updateSubCats(parentId) {
                    const children = categoryChildren[parentId] || [];
                    subCat.innerHTML = '<option value="">— 选择子分类 —</option>' +
                        children.map(c => `<option value="${c.id}" ${Number(data?.subCategoryId) === Number(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('');

                    if (window.EnhancedSelect?.refreshAll) {
                        window.EnhancedSelect.refreshAll(document.getElementById('modalBody'));
                    }
                }

                txType.addEventListener('change', () => {
                    data = { ...data, mainCategoryId: null, subCategoryId: null };
                    updateCats();
                    subCat.innerHTML = '<option value="">— 选择子分类 —</option>';
                });

                mainCat.addEventListener('change', () => {
                    const parentId = Number(mainCat.value);
                    if (parentId) updateSubCats(parentId);
                    else subCat.innerHTML = '<option value="">— 选择子分类 —</option>';
                });

                updateCats();
            }, 50);
        }
    };

    function esc(str) {
        return window.Format?.escape ? Format.escape(str) : String(str || '');
    }

    function renderAccountTypeOption(type, selectedType) {
        const selectedClass = type === selectedType ? ' selected' : '';
        return `
            <button type="button" class="custom-select-option${selectedClass}" data-value="${type}" role="option" aria-selected="${type === selectedType}">
                <span class="custom-select-option-icon">${Format.accountTypeIcon(type)}</span>
                <span class="custom-select-option-label">${Format.accountType(type)}</span>
            </button>
        `;
    }

    function initAccountTypeSelect() {
        const wrap = document.getElementById('mAccountTypeSelect');
        const trigger = document.getElementById('mAccountTypeTrigger');
        const label = document.getElementById('mAccountTypeLabel');
        const menu = document.getElementById('mAccountTypeMenu');
        const input = document.getElementById('mAccountType');
        if (!wrap || !trigger || !label || !menu || !input) return;

        const close = () => {
            wrap.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        };

        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            const opening = !wrap.classList.contains('open');
            close();
            if (opening) {
                wrap.classList.add('open');
                trigger.setAttribute('aria-expanded', 'true');
            }
        });

        menu.querySelectorAll('.custom-select-option').forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                input.value = value;
                label.textContent = Format.accountType(value);
                menu.querySelectorAll('.custom-select-option').forEach(item => {
                    const selected = item === option;
                    item.classList.toggle('selected', selected);
                    item.setAttribute('aria-selected', String(selected));
                });
                close();
            });
        });

        const body = wrap.closest('.modal-body');
        if (body) {
            body.addEventListener('click', (event) => {
                if (!wrap.contains(event.target)) {
                    close();
                }
            });
        }
    }
})();
