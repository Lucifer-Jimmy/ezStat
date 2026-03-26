
(function () {
    let accounts = [];

    window.Accounts = {
        async load() {
            try {
                accounts = await api.get('/api/accounts');
                this.render();
            } catch (err) {
                console.error('[Accounts] Load failed:', err);
                Toast.error(UIError.message(err, '加载账户失败'));
            }
        },

        render() {
            const grid = document.getElementById('accountsGrid');
            const empty = document.getElementById('accountsEmpty');
            if (!grid) return;

            if (!accounts.length) {
                grid.innerHTML = '';
                if (empty) empty.style.display = 'block';
                return;
            }

            if (empty) empty.style.display = 'none';

            grid.innerHTML = accounts.map(a => `
                <div class="account-card" data-id="${a.id}">
                    <div class="account-card-header">
                        <div class="account-card-icon ${(a.type || 'OTHER').toLowerCase().replace('_','_')}">
                            ${Format.accountTypeIcon(a.type)}
                        </div>
                        <span class="badge ${a.enabled ? 'badge-active' : 'badge-inactive'}">${a.enabled ? '启用' : '停用'}</span>
                    </div>
                    <div class="account-card-name">${Format.escape(a.name)}</div>
                    <div class="account-card-type">${Format.accountType(a.type)}</div>
                    <div class="account-card-balance">${Format.money(a.balance)}</div>
                    ${a.description ? `<div class="muted" style="font-size:12px;margin-top:4px;">${Format.escape(a.description)}</div>` : ''}
                    <div class="account-card-actions">
                        <button class="btn btn-secondary btn-sm" onclick="Accounts.edit(${a.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            编辑
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="Accounts.delete(${a.id}, '${Format.escape(a.name)}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            删除
                        </button>
                    </div>
                </div>
            `).join('');
        },

        openModal(data) {
            Modal.accountForm(data || null, async (payload) => {
                try {
                    if (data?.id) {
                        await api.put('/api/accounts/' + data.id, payload);
                        Toast.success('账户已更新');
                    } else {
                        await api.post('/api/accounts', payload);
                        Toast.success('账户已创建');
                    }
                    Modal.close();
                    if (window.App?.afterMutation) {
                        await window.App.afterMutation({ reload: () => Accounts.load() });
                    } else {
                        await Accounts.load();
                        if (window.App?.refreshCommon) await window.App.refreshCommon(true);
                    }
                } catch (err) {
                    console.error('[Accounts] Save failed:', err);
                    Toast.error(UIError.message(err, '账户保存失败'));
                }
            });
        },

        edit(id) {
            const account = accounts.find(a => a.id === id);
            if (account) Accounts.openModal(account);
        },

        async delete(id, name) {
            App.confirm(`确定要删除账户「${name}」吗？删除后该账户的交易记录将保留，但账户本身将被移除。`, async () => {
                try {
                    await api.delete('/api/accounts/' + id);
                    Toast.success('账户已删除');
                    if (window.App?.afterMutation) {
                        await window.App.afterMutation({ reload: () => Accounts.load() });
                    } else {
                        await Accounts.load();
                        if (window.App?.refreshCommon) await window.App.refreshCommon(true);
                    }
                } catch (err) {
                    console.error('[Accounts] Delete failed:', err);
                    Toast.error(UIError.message(err, '账户删除失败'));
                }
            });
        },

        getAll() {
            return accounts;
        }
    };

})();
