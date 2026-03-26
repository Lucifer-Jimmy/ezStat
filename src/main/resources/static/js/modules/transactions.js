(function () {
    let accounts = [];
    let categoryRoots = { EXPENSE: [], INCOME: [] };
    let categoryChildren = {};
    let currentPage = 0;
    let totalPages = 0;
    let currentData = [];

    window.Transactions = {
        async load() {
            currentPage = 0;
            await this.fetch();
        },

        async fetch() {
            const params = collectFilterParams();
            const startDate = params.get('startDate');
            const endDate = params.get('endDate');
            if (startDate && endDate && startDate > endDate) {
                Toast.error('开始日期不能晚于结束日期');
                return;
            }
            params.set('page', currentPage);
            params.set('size', '15');

            try {
                const result = await api.get('/api/transactions?' + params.toString());
                currentData = result.content || [];
                totalPages = result.totalPages || 0;
                this.render();
                this.renderPagination();
            } catch (err) {
                console.error('[Transactions] Fetch failed:', err);
                Toast.error(UIError.message(err, '加载交易失败'));
            }
        },

        render() {
            const tbody = document.getElementById('transactionsRows');
            const wrapper = document.getElementById('transactionsTableWrapper');
            const empty = document.getElementById('transactionsEmpty');
            if (!tbody) return;

            if (!currentData.length) {
                tbody.innerHTML = '';
                if (wrapper) wrapper.style.display = 'none';
                if (empty) empty.style.display = 'block';
                this._removeMobileCards();
                return;
            }

            if (wrapper) wrapper.style.display = '';
            if (empty) empty.style.display = 'none';

            // Desktop table
            tbody.innerHTML = currentData.map(tx => `
                <tr>
                    <td style="white-space:nowrap;">${Format.datetime(tx.transactionDate)}</td>
                    <td><span class="badge ${Format.txTypeClass(tx.type)}">${Format.txType(tx.type)}</span></td>
                    <td>${Format.escape(tx.accountName || '-')}</td>
                    <td class="muted">${Format.escape(tx.mainCategoryName || '')} ${tx.subCategoryName ? '/ ' + Format.escape(tx.subCategoryName) : ''}</td>
                    <td style="text-align:right;font-weight:700;" class="${tx.type === 'INCOME' ? 'amount-positive' : 'amount-negative'}">
                        ${tx.type === 'INCOME' ? '+' : '-'}${Format.moneyRaw(tx.amount)}
                    </td>
                    <td>
                        <div class="action-row">
                            <button class="btn btn-ghost btn-sm" onclick="Transactions.edit(${tx.id})" title="编辑">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="btn btn-ghost btn-sm" onclick="Transactions.delete(${tx.id})" title="删除" style="color:var(--danger);">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            // Mobile cards
            this._renderMobileCards();
        },

        _renderMobileCards() {
            this._removeMobileCards();
            if (window.innerWidth > 640) return;

            const wrapper = document.getElementById('transactionsTableWrapper');
            if (!wrapper) return;

            const container = document.createElement('div');
            container.className = 'tx-mobile-cards';
            container.id = 'txMobileCards';

            container.innerHTML = currentData.map(tx => {
                const isIncome = tx.type === 'INCOME';
                const icon = isIncome
                    ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>'
                    : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
                const catText = Format.escape(tx.mainCategoryName || '') + (tx.subCategoryName ? ' / ' + Format.escape(tx.subCategoryName) : '');
                return `
                    <div class="tx-mobile-card" onclick="Transactions.edit(${tx.id})">
                        <div class="tx-mobile-card-icon ${isIncome ? 'income' : 'expense'}">${icon}</div>
                        <div class="tx-mobile-card-body">
                            <div class="tx-mobile-card-title">${catText || Format.escape(tx.accountName || '-')}</div>
                            <div class="tx-mobile-card-meta">${Format.datetime(tx.transactionDate)} · ${Format.escape(tx.accountName || '')}</div>
                        </div>
                        <div class="tx-mobile-card-amount ${isIncome ? 'amount-positive' : 'amount-negative'}">
                            ${isIncome ? '+' : '-'}${Format.moneyRaw(tx.amount)}
                        </div>
                    </div>
                `;
            }).join('');

            wrapper.insertAdjacentElement('afterend', container);
        },

        _removeMobileCards() {
            const existing = document.getElementById('txMobileCards');
            if (existing) existing.remove();
        },

        renderPagination() {
            const el = document.getElementById('transactionsPagination');
            if (!el) return;

            if (totalPages <= 1) {
                el.innerHTML = '';
                return;
            }

            let html = `
                <button class="pagination-btn" onclick="Transactions.go(${currentPage - 1})" ${currentPage === 0 ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
            `;

            const start = Math.max(0, currentPage - 2);
            const end = Math.min(totalPages - 1, currentPage + 2);

            if (start > 0) {
                html += `<button class="pagination-btn" onclick="Transactions.go(0)">1</button>`;
                if (start > 1) html += '<span style="padding:0 4px;color:var(--text-muted);">...</span>';
            }

            for (let i = start; i <= end; i++) {
                html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="Transactions.go(${i})">${i + 1}</button>`;
            }

            if (end < totalPages - 1) {
                if (end < totalPages - 2) html += '<span style="padding:0 4px;color:var(--text-muted);">...</span>';
                html += `<button class="pagination-btn" onclick="Transactions.go(${totalPages - 1})">${totalPages}</button>`;
            }

            html += `
                <button class="pagination-btn" onclick="Transactions.go(${currentPage + 1})" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            `;

            el.innerHTML = html;
        },

        go(page) {
            if (page < 0 || page >= totalPages) return;
            currentPage = page;
            this.fetch();
        },

        resetFilters() {
            const type = document.getElementById('txFilterType');
            const account = document.getElementById('txFilterAccount');
            const start = document.getElementById('txFilterStart');
            const end = document.getElementById('txFilterEnd');
            if (type) type.value = '';
            if (account) account.value = '';
            applyDefaultDateRange(start, end);
            type?.dispatchEvent(new Event('change', { bubbles: true }));
            account?.dispatchEvent(new Event('change', { bubbles: true }));
            this.load();
        },

        async exportCsv() {
            const params = collectFilterParams();
            const startDate = params.get('startDate');
            const endDate = params.get('endDate');
            if (startDate && endDate && startDate > endDate) {
                Toast.error('开始日期不能晚于结束日期');
                return;
            }
            const url = '/api/transactions/export?' + params.toString();

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    credentials: 'same-origin'
                });

                if (!response.ok) {
                    let message = '导出失败';
                    try {
                        const payload = await response.json();
                        message = payload.message || payload.error || message;
                    } catch {}
                    Toast.error(message);
                    return;
                }

                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = downloadUrl;
                anchor.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                window.URL.revokeObjectURL(downloadUrl);

                Toast.success('账单导出成功');
            } catch (err) {
                console.error('[Transactions] Export failed:', err);
                Toast.error(UIError.message(err, '导出失败'));
            }
        },

        async openModal(data) {
            try {
                await this.ensureCategoryCache();
            } catch (err) {
                console.error('[Transactions] Category cache load failed:', err);
                Toast.error(UIError.message(err, '分类加载失败，请稍后重试'));
                return;
            }

            Modal.transactionForm(data, accounts, categoryRoots, categoryChildren, async (payload) => {
                try {
                    if (data?.id) {
                        await api.put('/api/transactions/' + data.id, payload);
                        Toast.success('交易已更新');
                    } else {
                        await api.post('/api/transactions', payload);
                        Toast.success('交易已记录');
                    }
                    Modal.close();
                    if (window.App?.afterMutation) {
                        await window.App.afterMutation({
                            reload: () => Transactions.fetch(),
                            refreshDashboard: true
                        });
                    } else {
                        await Transactions.fetch();
                        if (window.App?.refreshCommon) await window.App.refreshCommon(true);
                        if (window.Dashboard?.load) await Dashboard.load();
                    }
                } catch (err) {
                    console.error('[Transactions] API error:', err);
                    Toast.error(UIError.message(err, '交易保存失败'));
                }
            });
        },

        async ensureCategoryCache() {
            const hasExpense = Array.isArray(categoryRoots.EXPENSE) && categoryRoots.EXPENSE.length > 0;
            const hasIncome = Array.isArray(categoryRoots.INCOME) && categoryRoots.INCOME.length > 0;
            if (hasExpense && hasIncome) {
                return;
            }

            const [expenseRoots, incomeRoots] = await Promise.all([
                api.get('/api/categories/root?type=EXPENSE'),
                api.get('/api/categories/root?type=INCOME')
            ]);

            categoryRoots = {
                EXPENSE: expenseRoots || [],
                INCOME: incomeRoots || []
            };

            categoryChildren = {};
            const allRoots = [...categoryRoots.EXPENSE, ...categoryRoots.INCOME];
            await Promise.all(allRoots.map(async (parent) => {
                try {
                    categoryChildren[parent.id] = await api.get('/api/categories/children/' + parent.id);
                } catch {
                    categoryChildren[parent.id] = [];
                }
            }));
        },

        edit(id) {
            const tx = currentData.find(t => t.id === id);
            if (tx) Transactions.openModal(tx);
        },

        async delete(id) {
            App.confirm('确定要删除这条交易记录吗？', async () => {
                try {
                    await api.delete('/api/transactions/' + id);
                    Toast.success('交易已删除');
                    if (window.App?.afterMutation) {
                        await window.App.afterMutation({
                            reload: () => Transactions.fetch(),
                            refreshDashboard: true
                        });
                    } else {
                        await Transactions.fetch();
                        if (window.App?.refreshCommon) await window.App.refreshCommon(true);
                        if (window.Dashboard?.load) await Dashboard.load();
                    }
                } catch (err) {
                    console.error('[Transactions] API error:', err);
                    Toast.error(UIError.message(err, '交易删除失败'));
                }
            });
        },

        setAccounts(acc) { accounts = acc; },
        setCategories(roots, children) {
            categoryRoots = roots;
            categoryChildren = children;
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const start = document.getElementById('txFilterStart');
        const end = document.getElementById('txFilterEnd');

        applyDefaultDateRange(start, end);
        start?.addEventListener('change', () => {
            if (!start.value) return;
            if (!end.value || end.value < start.value) {
                end.value = start.value;
            }
        });
        end?.addEventListener('change', () => {
            if (!end.value) return;
            if (!start.value || start.value > end.value) {
                start.value = end.value;
            }
        });
    });

    function collectFilterParams() {
        const type = readFilterValue('txFilterType');
        const accountId = readFilterValue('txFilterAccount');
        const startDate = readFilterValue('txFilterStart');
        const endDate = readFilterValue('txFilterEnd');

        const params = new URLSearchParams();
        if (type) params.set('type', type);
        if (accountId) params.set('accountId', accountId);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        return params;
    }

    function readFilterValue(id) {
        return document.getElementById(id)?.value || '';
    }

    function applyDefaultDateRange(startEl, endEl) {
        if (!startEl || !endEl) return;
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const today = Format.today();
        if (!startEl.value) startEl.value = monthStart;
        if (!endEl.value) endEl.value = today;
    }

})();
