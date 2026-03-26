(function () {
    const stateMap = new WeakMap();

    function enhanceSelect(select) {
        if (!select || select.dataset.selectEnhanced === 'true') return;
        if (!select.classList.contains('form-control')) return;
        if (select.closest('.custom-select')) return;

        const wrap = document.createElement('div');
        wrap.className = 'custom-select custom-select-global';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-select-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.innerHTML = [
            '<span class="custom-select-value"></span>',
            '<span class="custom-select-arrow">',
            '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
            '</span>'
        ].join('');

        const menu = document.createElement('div');
        menu.className = 'custom-select-menu';
        menu.setAttribute('role', 'listbox');

        const parent = select.parentNode;
        parent.insertBefore(wrap, select);
        wrap.appendChild(select);
        wrap.appendChild(trigger);
        wrap.appendChild(menu);

        select.dataset.selectEnhanced = 'true';
        select.classList.add('native-select-proxy');

        const state = {
            select,
            wrap,
            trigger,
            menu,
            valueEl: trigger.querySelector('.custom-select-value')
        };
        stateMap.set(select, state);

        rebuildOptions(select);

        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            if (select.disabled) return;
            const opening = !wrap.classList.contains('open');
            closeAll();
            if (opening) openSelect(state);
        });

        select.addEventListener('change', () => syncFromSelect(select));

        const optionObserver = new MutationObserver(() => {
            rebuildOptions(select);
            syncFromSelect(select);
        });
        optionObserver.observe(select, { childList: true, subtree: true, attributes: true });

        syncFromSelect(select);
    }

    function rebuildOptions(select) {
        const state = stateMap.get(select);
        if (!state) return;

        state.menu.innerHTML = '';
        Array.from(select.options).forEach((opt) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'custom-select-option';
            btn.dataset.value = opt.value;
            btn.setAttribute('role', 'option');
            btn.setAttribute('aria-selected', 'false');
            btn.disabled = opt.disabled;
            btn.innerHTML = '<span class="custom-select-option-label">' + escapeHtml(opt.textContent || '') + '</span>';

            if (!opt.value) {
                btn.classList.add('custom-select-option-placeholder');
            }

            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                select.value = opt.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                syncFromSelect(select);
                closeSelect(state);
            });

            state.menu.appendChild(btn);
        });

        syncFromSelect(select);
    }

    function syncFromSelect(select) {
        const state = stateMap.get(select);
        if (!state) return;

        const selectedOption = select.options[select.selectedIndex] || null;
        state.valueEl.textContent = selectedOption ? selectedOption.textContent : '';

        state.trigger.disabled = !!select.disabled;
        state.wrap.classList.toggle('disabled', !!select.disabled);

        state.menu.querySelectorAll('.custom-select-option').forEach((item) => {
            const selected = item.dataset.value === select.value;
            item.classList.toggle('selected', selected);
            item.setAttribute('aria-selected', String(selected));
        });

    }

    function openSelect(state) {
        state.wrap.classList.add('open');
        state.trigger.setAttribute('aria-expanded', 'true');
    }

    function closeSelect(state) {
        state.wrap.classList.remove('open');
        state.trigger.setAttribute('aria-expanded', 'false');
    }

    function closeAll(exceptWrap) {
        document.querySelectorAll('.custom-select.open').forEach((wrap) => {
            if (exceptWrap && wrap === exceptWrap) return;
            wrap.classList.remove('open');
            const trigger = wrap.querySelector('.custom-select-trigger');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
    }

    function refreshAll(root) {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('select.form-control').forEach(enhanceSelect);
    }

    function escapeHtml(str) {
        return window.Format?.escape ? Format.escape(str) : String(str || '');
    }

    document.addEventListener('click', (event) => {
        const within = event.target.closest('.custom-select');
        if (!within) closeAll();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeAll();
    });

    function observeDynamicSelects() {
        refreshAll(document);

        const bodyObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;
                    if (node.matches?.('select.form-control')) {
                        enhanceSelect(node);
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll('select.form-control').forEach(enhanceSelect);
                    }
                });
            }
        });
        bodyObserver.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', observeDynamicSelects);
    } else {
        observeDynamicSelects();
    }

    window.EnhancedSelect = {
        refreshAll
    };
})();


