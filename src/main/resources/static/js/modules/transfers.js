(function () {
    let accounts = [];

    window.Transfers = {
        async load() {
            try {
                const data = await api.get('/api/transfers');
                this.render(data || []);
                this.renderAccountOptions();
            } catch (err) {
                console.error('[Transfers] Load failed:', err);
                Toast.error(UIError.message(err, '加载转账记录失败'));
            }
        },

        render(data) {
            const tbody = document.getElementById('transfersRows');
            const wrapper = document.getElementById('transfersTableWrapper');
            const empty = document.getElementById('transfersEmpty');
            if (!tbody) return;

            if (!data.length) {
                tbody.innerHTML = '';
                if (wrapper) wrapper.style.display = 'none';
                if (empty) empty.style.display = 'block';
                return;
            }

            if (wrapper) wrapper.style.display = 'block';
            if (empty) empty.style.display = 'none';

            tbody.innerHTML = data.map(t => `
                <tr>
                    <td style="white-space:nowrap;">${Format.datetime(t.occurredAt)}</td>
                    <td>
                        <span class="muted">${Format.escape(t.fromAccountName || '-')}</span>
                        <span style="color:var(--text-muted);margin:0 6px;">→</span>
                        <span>${Format.escape(t.toAccountName || '-')}</span>
                    </td>
                    <td style="text-align:right;font-weight:700;">${Format.money(t.amount)}</td>
                </tr>
            `).join('');
        },

        renderAccountOptions() {
            const from = document.getElementById('transferFrom');
            const to = document.getElementById('transferTo');
            if (!from || !to) return;

            const options = accounts.map(a =>
                `<option value="${a.id}">${Format.escape(a.name)} (${Format.accountType(a.type)})</option>`
            ).join('');

            from.innerHTML = '<option value="">— 选择转出账户 —</option>' + options;
            to.innerHTML = '<option value="">— 选择转入账户 —</option>' + options;
        },

        async submit() {
            const fromId = document.getElementById('transferFrom')?.value;
            const toId = document.getElementById('transferTo')?.value;
            const amount = document.getElementById('transferAmount')?.value;
            const desc = document.getElementById('transferDesc')?.value;

            if (!fromId) { Toast.error('请选择转出账户'); return; }
            if (!toId) { Toast.error('请选择转入账户'); return; }
            if (fromId === toId) { Toast.error('转出和转入账户不能相同'); return; }
            if (!amount || Number(amount) <= 0) { Toast.error('请输入有效金额'); return; }

            try {
                await api.post('/api/transfers', {
                    fromAccountId: Number(fromId),
                    toAccountId: Number(toId),
                    amount: Number(amount).toFixed(2),
                    description: desc || null
                });
                Toast.success('转账成功');
                document.getElementById('transferFrom').value = '';
                document.getElementById('transferTo').value = '';
                document.getElementById('transferAmount').value = '';
                document.getElementById('transferDesc').value = '';

                if (window.App?.afterMutation) {
                    await window.App.afterMutation({ reload: () => Transfers.load(), refreshDashboard: true });
                } else {
                    await Transfers.load();
                    if (window.App?.refreshCommon) await window.App.refreshCommon(true);
                    if (window.Dashboard?.load) await Dashboard.load();
                }
            } catch (err) {
                console.error('[Transfers] Submit failed:', err);
                Toast.error(UIError.message(err, '转账失败'));
            }
        },

        setAccounts(acc) { accounts = acc; this.renderAccountOptions(); }
    };

})();
