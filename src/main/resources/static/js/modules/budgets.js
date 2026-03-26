/**
 * budgets.js — Budget management module
 */

(function () {
    let budgets = [];
    const budgetCharts = {};
    let editingBudgetId = null;

    window.Budgets = {
        async load() {
            try {
                budgets = await api.get('/api/budgets');
                if (editingBudgetId && !budgets.some(b => Number(b.id) === Number(editingBudgetId))) {
                    this.cancelEdit();
                }
                this.render();
            } catch (err) {
                console.error('[Budgets] Load failed:', err);
                Toast.error(UIError.message(err, '加载预算失败'));
            }
        },

        render() {
            const grid = document.getElementById('budgetsGrid');
            const empty = document.getElementById('budgetsEmpty');
            if (!grid) return;

            // Dispose old charts
            Object.values(budgetCharts).forEach(c => c?.dispose());

            if (!budgets.length) {
                grid.innerHTML = '';
                if (empty) empty.style.display = 'block';
                return;
            }

            if (empty) empty.style.display = 'none';

            grid.innerHTML = budgets.map((b, i) => `
                <div class="budget-card" id="budgetCard${i}">
                    <div class="action-row" style="justify-content:space-between;align-items:flex-start;">
                        <div class="budget-card-month" style="margin-bottom:0;">${Format.month(b.month)}</div>
                        <div class="action-row" style="gap:6px;">
                            <button class="btn btn-ghost btn-sm" onclick="Budgets.edit(${b.id})" title="编辑预算">编辑</button>
                            <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="Budgets.delete(${b.id})" title="删除预算">删除</button>
                        </div>
                    </div>
                    <div class="budget-card-chart" id="budgetChart${i}"></div>
                    <div class="budget-card-stats">
                        <div>
                            <div class="budget-stat-label">预算</div>
                            <div class="budget-stat-value" style="color:var(--primary);">${Format.money(b.amount)}</div>
                        </div>
                        <div>
                            <div class="budget-stat-label">已用</div>
                            <div class="budget-stat-value" style="color:${b.usagePercentage >= 100 ? 'var(--danger)' : 'var(--text-primary)'};">${Format.money(b.spent)}</div>
                        </div>
                        <div>
                            <div class="budget-stat-label">剩余</div>
                            <div class="budget-stat-value" style="color:${b.remaining < 0 ? 'var(--danger)' : 'var(--success)'};">${Format.money(b.remaining)}</div>
                        </div>
                        <div>
                            <div class="budget-stat-label">使用率</div>
                            <div class="budget-stat-value ${b.usagePercentage >= 100 ? 'text-danger' : ''}" style="color:${b.usagePercentage >= 80 ? 'var(--warning)' : 'var(--text-primary)'};">${Format.percent(b.usagePercentage)}</div>
                        </div>
                    </div>
                </div>
            `).join('');

            // Render charts after DOM update
            setTimeout(() => {
                budgets.forEach((b, i) => {
                    const percent = Number(b.usagePercentage || 0);
                    const c = percent >= 100 ? '#ef4444' : (percent >= 80 ? '#f59e0b' : '#6366f1');
                    budgetCharts[i] = ChartUtil.gauge('budgetChart' + i, percent, c);
                });
            }, 100);
        },

        async save() {
            const month = document.getElementById('budgetMonthInput')?.value;
            const amount = document.getElementById('budgetAmountInput')?.value;
            const normalizedMonth = normalizeMonth(month);

            if (!month) { Toast.error('请选择月份'); return; }
            if (!normalizedMonth) { Toast.error('月份格式不正确'); return; }
            if (normalizedMonth < '2000-01') { Toast.error('预算月份不合理'); return; }
            if (normalizedMonth > Format.currentMonth()) { Toast.error('预算月份不能晚于当前月份'); return; }
            if (!amount || Number(amount) <= 0) { Toast.error('请输入有效的预算金额'); return; }

            try {
                const payload = {
                    month: normalizedMonth,
                    amount: Number(amount).toFixed(2)
                };

                if (editingBudgetId) {
                    await api.put('/api/budgets/' + editingBudgetId, payload);
                    Toast.success('预算已更新');
                } else {
                    await api.post('/api/budgets', payload);
                    Toast.success('预算已保存');
                }

                this.cancelEdit();
                if (window.App?.afterMutation) {
                    await window.App.afterMutation({ reload: () => Budgets.load(), refreshCommon: false, refreshDashboard: true });
                } else {
                    await Budgets.load();
                    if (window.Dashboard?.load) await Dashboard.load();
                }
            } catch (err) {
                console.error('[Budgets] Save failed:', err);
                Toast.error(UIError.message(err, '预算保存失败'));
            }
        },

        edit(id) {
            const budget = budgets.find(b => Number(b.id) === Number(id));
            if (!budget) {
                Toast.error('预算不存在或已删除');
                return;
            }

            editingBudgetId = budget.id;
            const monthInput = document.getElementById('budgetMonthInput');
            const amountInput = document.getElementById('budgetAmountInput');
            if (monthInput) monthInput.value = budget.month || '';
            if (amountInput) amountInput.value = Format.moneyRaw(budget.amount);
            syncEditState();
        },

        cancelEdit() {
            editingBudgetId = null;
            const monthInput = document.getElementById('budgetMonthInput');
            const amountInput = document.getElementById('budgetAmountInput');
            if (monthInput) monthInput.value = Format.currentMonth();
            if (amountInput) amountInput.value = '';
            syncEditState();
        },

        async delete(id) {
            const budget = budgets.find(b => Number(b.id) === Number(id));
            const monthLabel = budget?.month ? Format.month(budget.month) : '该预算';
            App.confirm(`确定要删除${monthLabel}吗？`, async () => {
                try {
                    await api.delete('/api/budgets/' + id);
                    if (Number(editingBudgetId) === Number(id)) {
                        Budgets.cancelEdit();
                    }
                    Toast.success('预算已删除');
                    if (window.App?.afterMutation) {
                        await window.App.afterMutation({ reload: () => Budgets.load(), refreshCommon: false, refreshDashboard: true });
                    } else {
                        await Budgets.load();
                        if (window.Dashboard?.load) await Dashboard.load();
                    }
                } catch (err) {
                    console.error('[Budgets] Delete failed:', err);
                    Toast.error(UIError.message(err, '预算删除失败'));
                }
            });
        },

        destroy() {
            Object.values(budgetCharts).forEach(c => c?.dispose());
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const monthInput = document.getElementById('budgetMonthInput');
        if (monthInput) {
            monthInput.value = Format.currentMonth();
            monthInput.max = Format.currentMonth();
        }
        syncEditState();
    });

    function syncEditState() {
        const saveBtn = document.getElementById('budgetSaveBtn');
        const cancelBtn = document.getElementById('budgetCancelEditBtn');

        if (saveBtn) {
            const svg = saveBtn.querySelector('svg')?.outerHTML || '';
            saveBtn.innerHTML = editingBudgetId
                ? `${svg}更新预算`
                : `${svg}保存预算`;
        }
        if (cancelBtn) {
            cancelBtn.classList.toggle('hidden', !editingBudgetId);
        }
    }

    function normalizeMonth(raw) {
        const text = String(raw || '').trim();
        const match = text.match(/^(\d{4})-(\d{2})$/);
        if (!match) return null;

        const year = Number(match[1]);
        const month = Number(match[2]);
        if (year < 1 || month < 1 || month > 12) {
            return null;
        }
        return `${match[1]}-${match[2]}`;
    }
})();
