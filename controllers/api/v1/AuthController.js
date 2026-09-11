const AuthService = require('../../../services/AuthService');
const {sign} = require('../../../utils/jwt');

async function login(req, res, next) {
    try {
        const user = await AuthService.login(req.body);

        const token = sign({
            sub: user.id,
            email: user.email,
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                is_superadmin: !!user.is_superadmin
            },
            token,
        });
    } catch(err) {
        err.status = 401;
        err.code = 'AUTH_LOGIN_FAILED';
        next(err);
    }
}

module.exports = { login };