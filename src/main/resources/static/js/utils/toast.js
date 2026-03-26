/**
 * toast.js — Toast notification system
 * Container is accessed after DOM is ready
 */

(function () {
    let container = null;

    function init() {
        container = document.getElementById('toastContainer');
    }

    // Init after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.Toast = {
        show(type, title, message, duration = 4000) {
            if (!container) {
                console.warn('Toast container not found, falling back to alert');
                if (type === 'error') {
                    alert((title || '错误') + ': ' + message);
                }
                return null;
            }

            const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
            const icons = {
                success: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
                error: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
                warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
                info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
            };

            const html = `
                <div class="toast ${type}" id="${id}">
                    <div class="toast-icon">${icons[type] || icons.info}</div>
                    <div class="toast-content">
                        ${title ? `<div class="toast-title">${esc(title)}</div>` : ''}
                        ${message ? `<div class="toast-message">${esc(message)}</div>` : ''}
                    </div>
                    <button class="toast-close" onclick="Toast.remove('${id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            `;

            container.insertAdjacentHTML('beforeend', html);

            if (duration > 0) {
                setTimeout(() => Toast.remove(id), duration);
            }

            return id;
        },

        success(message, title) {
            return Toast.show('success', title || '成功', message);
        },

        error(message, title) {
            return Toast.show('error', title || '错误', message, 6000);
        },

        warning(message, title) {
            return Toast.show('warning', title || '警告', message);
        },

        info(message, title) {
            return Toast.show('info', title || '提示', message);
        },

        remove(id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.add('removing');
            setTimeout(() => el.remove(), 300);
        },

        clear() {
            if (!container) return;
            container.innerHTML = '';
        }
    };

    function esc(str) {
        return window.Format?.escape ? Format.escape(str) : String(str || '');
    }
})();
