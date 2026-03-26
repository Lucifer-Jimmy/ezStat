/**
 * api.js — Unified API wrapper with CSRF support
 * CSRF token is re-read before each mutating request to handle token rotation
 */

(function () {
    window.API = {
        async get(url) {
            return request(url, { method: 'GET' });
        },

        async post(url, data) {
            return request(url, { method: 'POST', body: data });
        },

        async put(url, data) {
            return request(url, { method: 'PUT', body: data });
        },

        async delete(url) {
            return request(url, { method: 'DELETE' });
        }
    };

    function getCsrfHeaders(method) {
        const headers = {};
        if (method === 'GET') return headers;

        // Re-read CSRF token from meta tags before each request
        // to handle token rotation (e.g., after login)
        const csrfToken = document.querySelector('meta[name="_csrf"]')?.content || '';
        const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content || '';

        if (csrfToken && csrfHeader) {
            headers[csrfHeader] = csrfToken;
        }
        return headers;
    }

    async function request(url, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        const headers = {
            ...getCsrfHeaders(method)
        };

        if (options.body !== undefined && method !== 'GET') {
            headers['Content-Type'] = 'application/json';
        }

        const init = {
            method,
            credentials: 'same-origin',
            headers
        };

        if (options.body !== undefined && method !== 'GET') {
            init.body = JSON.stringify(options.body);
        }

        let response;
        try {
            response = await fetch(url, init);
        } catch (networkError) {
            throw new APIError(0, '网络连接失败，请检查网络', networkError);
        }

        // Handle redirect to login page (session expired)
        if (response.redirected && response.url.includes('/login')) {
            window.location.href = '/login';
            throw new APIError(401, '登录状态已失效，请重新登录');
        }

        const contentType = response.headers.get('content-type') || '';

        if (!response.ok) {
            let message = '请求失败 (HTTP ' + response.status + ')';
            let code = null;
            let details = null;

            try {
                if (contentType.includes('application/json')) {
                    const payload = await response.json();
                    message = payload.message || payload.error || message;
                    code = payload.code || payload.error || null;
                    details = payload.details || null;
                } else {
                    const text = await response.text();
                    // Check if redirected to login (session expired)
                    if (text.includes('/login') || response.status === 403) {
                        window.location.href = '/login';
                        throw new APIError(403, '会话已过期，请重新登录');
                    }
                    if (text.trim() && text.length < 200) {
                        message = text;
                    }
                }
            } catch (e) {
                if (e instanceof APIError) throw e;
            }

            throw new APIError(response.status, message, null, code, details);
        }

        if (method === 'DELETE' || response.status === 204) {
            return null;
        }

        try {
            if (contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        } catch (e) {
            // Empty response body
            return null;
        }
    }

    function APIError(status, message, cause, code, details) {
        this.status = status;
        this.message = message;
        this.name = 'APIError';
        this.cause = cause;
        this.code = code || null;
        this.details = details || null;
    }
    window.APIError = APIError;

    // Short alias
    window.api = window.API;
})();
