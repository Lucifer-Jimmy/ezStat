(function () {
    const DEFAULT_BY_CODE = {
        VALIDATION_ERROR: '提交信息有误，请检查后重试',
        INVALID_FORMAT: '输入格式不正确，请检查后重试',
        ACCESS_DENIED: '当前账号没有此操作权限',
        AUTH_ERROR: '登录状态异常，请重新登录',
        INTERNAL_ERROR: '系统异常，请稍后重试'
    };

    function firstDetail(details) {
        if (!details || typeof details !== 'object') {
            return null;
        }
        const values = Object.values(details).flatMap(v => Array.isArray(v) ? v : [v]);
        const first = values.find(v => v && String(v).trim());
        return first ? String(first) : null;
    }

    function message(err, fallback) {
        if (!err) {
            return fallback || '操作失败，请稍后重试';
        }

        if (typeof err === 'string') {
            return err;
        }

        const detail = firstDetail(err.details);
        if (detail) {
            return detail;
        }

        if (err.message && String(err.message).trim()) {
            return err.message;
        }

        if (err.code && DEFAULT_BY_CODE[err.code]) {
            return DEFAULT_BY_CODE[err.code];
        }

        if (fallback && String(fallback).trim()) {
            return fallback;
        }

        return '操作失败，请稍后重试';
    }

    window.UIError = {
        message
    };
})();

