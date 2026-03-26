(function () {
    let categoryRoots = { EXPENSE: [], INCOME: [] };
    let categoryChildren = {};
    let catStatChart = null;

    window.Categories = {
        async load() {
            try {
                const [expenseRoots, incomeRoots] = await Promise.all([
                    api.get('/api/categories/root?type=EXPENSE'),
                    api.get('/api/categories/root?type=INCOME')
                ]);

                categoryRoots.EXPENSE = expenseRoots;
                categoryRoots.INCOME = incomeRoots;
                categoryChildren = {};
                const allRoots = [...expenseRoots, ...incomeRoots];
                for (const parent of allRoots) {
                    try {
                        const children = await api.get('/api/categories/children/' + parent.id);
                        categoryChildren[parent.id] = children;
                    } catch {
                        categoryChildren[parent.id] = [];
                    }
                }

                this.render();
                await this.loadStats();
            } catch (err) {
                console.error('[Categories] Load failed:', err);
                Toast.error(UIError.message(err, '加载分类失败'));
            }
        },

        render() {
            const type = document.getElementById('categoryTypeFilter')?.value || 'EXPENSE';
            const roots = categoryRoots[type] || [];
            const treeEl = document.getElementById('categoriesTree');
            const emptyEl = document.getElementById('categoriesEmpty');
            if (!treeEl) return;

            if (!roots.length) {
                treeEl.innerHTML = '';
                if (emptyEl) emptyEl.style.display = 'block';
                return;
            }

            if (emptyEl) emptyEl.style.display = 'none';

            let html = '';
            roots.forEach(root => {
                const children = categoryChildren[root.id] || [];
                const color = root.color || '#6366f1';

                html += `
                    <div class="category-item" style="margin-bottom:2px;">
                        <div class="category-item-color" style="background:${color};width:14px;height:14px;border-radius:4px;flex-shrink:0;"></div>
                        <span class="category-item-name">${Format.escape(root.name)}</span>
                        <span class="badge ${root.enabled ? 'badge-active' : 'badge-inactive'}" style="margin-left:auto;font-size:11px;">${root.enabled ? '启用' : '停用'}</span>
                        <button class="btn btn-ghost btn-sm" style="padding:4px 6px;" onclick="Categories.edit(${root.id})" title="编辑">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn btn-ghost btn-sm" style="padding:4px 6px;" onclick="Categories.delete(${root.id}, '${Format.escape(root.name)}')" title="删除">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                    </div>
                `;

                children.forEach(child => {
                    const childColor = child.color || color;
                    html += `
                        <div class="category-item category-item-child" style="margin-bottom:2px;">
                            <div class="category-item-color" style="background:${childColor};width:10px;height:10px;border-radius:3px;flex-shrink:0;"></div>
                            <span class="category-item-name">${Format.escape(child.name)}</span>
                            <span class="badge ${child.enabled ? 'badge-active' : 'badge-inactive'}" style="margin-left:auto;font-size:11px;">${child.enabled ? '启用' : '停用'}</span>
                            <button class="btn btn-ghost btn-sm" style="padding:4px 6px;" onclick="Categories.edit(${child.id})" title="编辑">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="btn btn-ghost btn-sm" style="padding:4px 6px;" onclick="Categories.delete(${child.id}, '${Format.escape(child.name)}')" title="删除">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                        </div>
                    `;
                });

                html += '<div style="height:6px;"></div>';
            });

            treeEl.innerHTML = html;
        },

        async loadStats() {
            try {
                const type = document.getElementById('categoryTypeFilter')?.value || 'EXPENSE';
                const today = new Date();
                const y = today.getFullYear();
                const m = String(today.getMonth() + 1).padStart(2, '0');
                const monthEnd = String(new Date(y, today.getMonth() + 1, 0).getDate()).padStart(2, '0');

                const tx = await api.get(`/api/transactions?type=${type}&startDate=${y}-${m}-01&endDate=${y}-${m}-${monthEnd}&size=200`);
                const rows = tx.content || [];

                const map = {};
                rows.forEach(t => {
                    const name = t.mainCategoryName || '未分类';
                    map[name] = (map[name] || 0) + Number(t.amount || 0);
                });

                const data = Object.entries(map)
                    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10);

                const dom = document.getElementById('categoryStatsChart');
                if (dom) {
                    if (catStatChart) catStatChart.dispose();
                    catStatChart = ChartUtil.barHorizontal('categoryStatsChart', data,
                        type === 'EXPENSE' ? '#ef4444' : '#10b981');
                }
            } catch {}
        },

        openModal(data) {
            Modal.categoryForm(data, categoryRoots, categoryChildren, async (payload) => {
                try {
                    if (data?.id) {
                        await api.put('/api/categories/' + data.id, payload);
                        Toast.success('分类已更新');
                    } else {
                        await api.post('/api/categories', payload);
                        Toast.success('分类已创建');
                    }
                    Modal.close();
                    if (window.App?.afterMutation) {
                        await window.App.afterMutation({ reload: () => Categories.load() });
                    } else {
                        await Categories.load();
                        if (window.App?.refreshCommon) await window.App.refreshCommon(true);
                    }
                } catch (err) {
                    console.error('[Categories] Save failed:', err);
                    Toast.error(UIError.message(err, '分类保存失败'));
                }
            });
        },

        edit(id) {
            const type = document.getElementById('categoryTypeFilter')?.value || 'EXPENSE';
            const roots = categoryRoots[type] || [];
            let found = roots.find(r => r.id === id);
            if (!found) {
                Object.values(categoryChildren).forEach(children => {
                    const c = children.find(c => c.id === id);
                    if (c) found = c;
                });
            }
            if (found) Categories.openModal(found);
        },

        async delete(id, name) {
            App.confirm(`确定要删除分类「${name}」吗？`, async () => {
                try {
                    await api.delete('/api/categories/' + id);
                    Toast.success('分类已删除');
                    if (window.App?.afterMutation) {
                        await window.App.afterMutation({ reload: () => Categories.load() });
                    } else {
                        await Categories.load();
                        if (window.App?.refreshCommon) await window.App.refreshCommon(true);
                    }
                } catch (err) {
                    console.error('[Categories] Save failed:', err);
                    Toast.error(UIError.message(err, '分类删除失败'));
                }
            });
        },

        getRoots() { return categoryRoots; },
        getChildren() { return categoryChildren; }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const filter = document.getElementById('categoryTypeFilter');
        if (filter) {
            filter.addEventListener('change', () => Categories.render());
        }
    });

})();
