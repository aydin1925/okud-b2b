const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel');

async function login({email, password}) {
    if(!email || !password) {
        throw new Error('Email ve şifre zorunludur');
    }

    const user = await UserModel.findByEmail(email);

    if(!user) {
        throw new Error("Email veya şifre yanlış");
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if(!match) {
        throw new Error('Email veya şifre yanlış');
    }

    const {password_hash, ...safeUser} = user;
    return safeUser;
}

module.exports = {login};