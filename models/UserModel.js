const db = require('../config/db');

async function findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
        [email]
    );
    return rows[0] || null;
}

async function create({first_name, last_name, email, password_hash}) {
    const [results] = await db.query(
        `INSERT INTO users (first_name, last_name, email, password_hash)
        VALUES (?, ?, ?, ?)`,
        [first_name, last_name, email, password_hash]
    );
    return results.insertId;
}

async function findById(id) {
    const [rows] = await db.query(
        'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [id]
    );
    return rows[0] || null;
}

async function updateName(id, first_name, last_name) {
    const [result] = await db.query(
        `UPDATE users SET first_name = ?, last_name = ?
           WHERE id = ? AND deleted_at IS NULL`,
        [first_name, last_name, id]
    );
    return result.affectedRows;
}

// UNIQUE ihlalinde mysql2 'ER_DUP_ENTRY' kodlu hata fırlatır — service seviyesinde yakalanır.
async function updateEmail(id, email) {
    const [result] = await db.query(
        `UPDATE users SET email = ?
           WHERE id = ? AND deleted_at IS NULL`,
        [email, id]
    );
    return result.affectedRows;
}

async function updatePasswordHash(id, password_hash) {
    const [result] = await db.query(
        `UPDATE users SET password_hash = ?
           WHERE id = ? AND deleted_at IS NULL`,
        [password_hash, id]
    );
    return result.affectedRows;
}

// Kullanıcı e-posta doğrulama linkine tıkladığında set edilir.
// Zaten doluysa (ikinci tıklama) yeniden yazar — zararsız.
async function setEmailVerified(id) {
    const [result] = await db.query(
        `UPDATE users SET email_verified_at = NOW()
           WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return result.affectedRows;
}

module.exports = {
    findByEmail, create, findById,
    updateName, updateEmail, updatePasswordHash,
    setEmailVerified,
};
