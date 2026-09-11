const db = require('../config/db');

async function findByUserId(userId) {
    const [rows] = await db.query('SELECT * FROM driver_profiles WHERE user_id = ? AND deleted_at IS NULL LIMIT 1',
    [userId]
    );
    return rows[0] || null;
}

async function findByNationalId(nationalId) {
    const [rows] = await db.query('SELECT * FROM driver_profiles WHERE national_id = ? AND deleted_at IS NULL LIMIT 1',
        [nationalId]
    );
    return rows[0] || null;
}

async function create({ user_id, national_id, phone, birth_date, license_class, notes }) {
    const [results] = await db.query(
        `INSERT INTO driver_profiles
           (user_id, national_id, phone, birth_date, license_class, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, national_id, phone, birth_date, license_class, notes]
    );
    return results.insertId;
}

async function findById(id) {
    const [rows] = await db.query(
        'SELECT * FROM driver_profiles WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [id]
    );
    return rows[0] || null;
}

async function updateStatus(id, status) {
    const [result] = await db.query(
        'UPDATE driver_profiles SET status = ? WHERE id = ?',
        [status, id]
    );
    return result.affectedRows;
}

// Sıradan alanlar — direkt UPDATE (admin onayı yok)
async function updateSafeFields(id, { phone, notes }) {
    const [result] = await db.query(
        'UPDATE driver_profiles SET phone = ?, notes = ? WHERE id = ?',
        [phone, notes || null, id]
    );
    return result.affectedRows;
}

// Hassas alanlar — admin approve edince uygulanır. Sadece NULL olmayan alanları günceller.
async function applySensitiveFields(id, { national_id, birth_date, license_class }) {
    const parts = [];
    const params = [];
    if (national_id)    { parts.push('national_id = ?');    params.push(national_id); }
    if (birth_date)     { parts.push('birth_date = ?');     params.push(birth_date); }
    if (license_class)  { parts.push('license_class = ?');  params.push(license_class); }
    if (parts.length === 0) return 0;
    params.push(id);
    const [result] = await db.query(
        `UPDATE driver_profiles SET ${parts.join(', ')} WHERE id = ?`,
        params
    );
    return result.affectedRows;
}

// Soft delete — kullanıcı kendi şoför profilini filodan çıkarır.
// deleted_at kontrolü ile idempotent (ikinci çağrı 0 affected döner).
async function softDelete(id) {
    const [result] = await db.query(
        `UPDATE driver_profiles SET deleted_at = NOW()
           WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return result.affectedRows;
}

module.exports = { findByUserId, findByNationalId, findById, create, updateStatus, updateSafeFields, applySensitiveFields, softDelete };