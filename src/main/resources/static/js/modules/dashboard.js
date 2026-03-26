(function () {
    let trendChart = null;
    let expenseChart = null;
    let incomeChart = null;

    window.Dashboard = {
        async load() {
            try {
                this.showSkeleton();

                const [summary, accounts, latestTx] = await Promise.all([
                    api.get('/api/transactions/summary'),
                    api.get('/api/accounts'),
                    api.get('/api/transactions?page=0&size=5')
                ]);

                this.renderStats(summary, accounts);
                this.renderRecentTransactions(latestTx.content || []);
                await this.loadCharts();

            } catch (err) {
                console.error('[Dashboard] Load failed:', err);
                Toast.error(UIError.message(err, '加载仪表盘失败'));
            }
        },

        renderStats(summary, accounts) {
            const income = Number(summary.income || 0);
            const expense = Number(summary.expense || 0);
            const balance = income - expense;
            const asset = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
            this._setSkeleton('statCardIncome', false);
            this._setSkeleton('statCardExpense', false);
            this._setSkeleton('statCardBalance', false);
            this._setSkeleton('statCardAsset', false);

            this.animateNumber('statIncome', income);
            this.animateNumber('statExpense', expense);
            this.animateNumber('statBalance', balance);
            this.animateNumber('statAsset', asset);

            this.loadTrendBadges();
        },

        async loadTrendBadges() {
            try {
                const data = await api.get('/api/transactions/trend?months=2');
                if (data.length >= 2) {
                    const prev = data[0];
                    const curr = data[1];
                    this._updateTrendBadge('incomeTrend', Number(prev.income), Number(curr.income));
                    this._updateTrendBadge('expenseTrend', Number(prev.expense), Number(curr.expense));
                }
            } catch { /* ignore */ }
        },

        _updateTrendBadge(elId, prev, curr) {
            const el = document.getElementById(elId);
            if (!el) return;
            if (prev === 0 && curr === 0) {
                el.textContent = '持平';
                el.className = 'stat-card-trend';
                return;
            }
            const change = prev === 0 ? 100 : ((curr - prev) / prev * 100);
            const isUp = change >= 0;
            const arrow = isUp
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>';
            el.innerHTML = `${arrow} ${Math.abs(change).toFixed(1)}%`;
            el.className = `stat-card-trend ${isUp ? 'up' : 'down'}`;
        },

        _setSkeleton(cardId, show) {
            const card = document.getElementById(cardId);
            if (!card) return;
            const existing = card.querySelector('.skeleton');
            if (show) {
                if (!existing) {
                    const label = card.querySelector('.stat-card-label');
                    const value = card.querySelector('.stat-card-value');
                    if (label) {
                        const skLabel = document.createElement('div');
                        skLabel.className = 'skeleton skeleton-text';
                        skLabel.style.marginBottom = '8px';
                        label.style.visibility = 'hidden';
                        label.after(skLabel);
                    }
                    if (value) {
                        const skValue = document.createElement('div');
                        skValue.className = 'skeleton skeleton-value';
                        value.style.visibility = 'hidden';
                        value.after(skValue);
                    }
                }
            } else {
                if (existing) {
                    card.querySelectorAll('.skeleton').forEach(s => s.remove());
                    const label = card.querySelector('.stat-card-label');
                    const value = card.querySelector('.stat-card-value');
                    if (label) label.style.visibility = '';
                    if (value) value.style.visibility = '';
                }
            }
        },

        showSkeleton() {
            this._setSkeleton('statCardIncome', true);
            this._setSkeleton('statCardExpense', true);
            this._setSkeleton('statCardBalance', true);
            this._setSkeleton('statCardAsset', true);
        },

        animateNumber(elId, targetValue) {
            const el = document.getElementById(elId);
            if (!el) return;
            const start = 0;
            const end = targetValue;
            const duration = 1000;
            const startTime = performance.now();

            function step(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = start + (end - start) * eased;
                el.textContent = Format.money(current);
                if (progress < 1) {
                    requestAnimationFrame(step);
                }
            }
            requestAnimationFrame(step);
        },

        renderRecentTransactions(rows) {
            const tbody = document.getElementById('recentTransactions');
            if (!tbody) return;

            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="4" class="muted" style="text-align:center;padding:32px 16px;color:var(--text-muted);font-size:13px;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="margin:0 auto 8px;display:block;color:var(--text-muted);"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>暂无交易记录</td></tr>';
                return;
            }

            tbody.innerHTML = rows.map(tx => `
                <tr>
                    <td style="white-space:nowrap;">${Format.datetime(tx.transactionDate)}</td>
                    <td><span class="badge ${Format.txTypeClass(tx.type)}">${Format.txType(tx.type)}</span></td>
                    <td>${Format.escape(tx.accountName || '-')}</td>
                    <td class="${tx.type === 'INCOME' ? 'amount-positive' : 'amount-negative'}" style="text-align:right;font-weight:700;">
                        ${tx.type === 'INCOME' ? '+' : '-'}${Format.moneyRaw(tx.amount)}
                    </td>
                </tr>
            `).join('');
        },

        async loadCharts() {
            try {
                const period = parseInt(document.getElementById('chartPeriodSelect')?.value || '6', 10);
                const trendData = await this.getTrendData(period);
                const trendDom = document.getElementById('trendChart');
                if (trendDom) {
                    if (trendChart) trendChart.dispose();
                    trendChart = ChartUtil.trendLine('trendChart', trendData.months, trendData.income, trendData.expense);
                }

                const catData = await this.getCategoryBreakdown();
                const expenseDom = document.getElementById('expenseChart');
                if (expenseDom) {
                    if (expenseChart) expenseChart.dispose();
                    expenseChart = ChartUtil.donut('expenseChart', catData.expense, [
                        '#f43f5e','#f97316','#fbbf24','#22c55e','#14b8a6',
                        '#06b6d4','#3b82f6','#8b5cf6','#ec4899','#64748b'
                    ]);
                }

                const incomeDom = document.getElementById('incomeChart');
                if (incomeDom) {
                    if (incomeChart) incomeChart.dispose();
                    incomeChart = ChartUtil.donut('incomeChart', catData.income, [
                        '#4ade80','#06b6d4','#3b82f6','#8b5cf6','#ec4899',
                        '#fbbf24','#84cc16','#14b8a6','#a855f7','#f97316'
                    ]);
                }

            } catch (err) {
                console.error('[Dashboard] Charts load failed:', err);
            }
        },

        async getTrendData(months) {
            const result = { months: [], income: [], expense: [] };
            try {
                const data = await api.get(`/api/transactions/trend?months=${months}`);
                data.forEach(entry => {
                    const [y, m] = entry.month.split('-');
                    result.months.push(`${y}/${m}`);
                    result.income.push(Number(entry.income || 0));
                    result.expense.push(Number(entry.expense || 0));
                });
            } catch {
                // fallback: empty data
            }
            return result;
        },

        async getCategoryBreakdown() {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const monthEnd = String(new Date(y, today.getMonth() + 1, 0).getDate()).padStart(2, '0');
            const startDate = `${y}-${m}-01`;
            const endDate = `${y}-${m}-${monthEnd}`;

            try {
                const data = await api.get(`/api/transactions/category-breakdown?startDate=${startDate}&endDate=${endDate}`);
                const expense = (data.expense || []).map(d => ({ name: d.name, value: Number(d.value || 0) }));
                const income = (data.income || []).map(d => ({ name: d.name, value: Number(d.value || 0) }));
                return { expense, income };
            } catch {
                return { expense: [], income: [] };
            }
        },

        destroy() {
            if (trendChart) { trendChart.dispose(); trendChart = null; }
            if (expenseChart) { expenseChart.dispose(); expenseChart = null; }
            if (incomeChart) { incomeChart.dispose(); incomeChart = null; }
        }
    };

})();
