// API rotalarındaki throw'ları tek standart JSON formata çevirir.

function apiError(err, req, res, next) {
    const status = err.status || 500;
    console.error('[api]', err.message);
    res.status(status).json({
        error: {
            message: err.message || 'sunucu hatası',
            code: err.code || 'INTERNAL_ERROR',
            status,
        }
    });
}

module.exports = apiError;