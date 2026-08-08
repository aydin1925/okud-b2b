const db = require('../config/db');

async function findByOwnerUserId(ownerUserId) {
    const [rows] = await db.query(
        `SELECT * FROM vehicle_profiles
          WHERE owner_user_id = ? AND deleted_at IS NULL
          ORDER BY created_at DESC`,
        [ownerUserId]
    );
    return rows;
}

async function findById(id) {
    const [rows] = await db.query(
        'SELECT * FROM vehicle_profiles WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [id]
    );
    return rows[0] || null;
}

async function findByPlateNumber(plateNumber) {
    const [rows] = await db.query(
        'SELECT * FROM vehicle_profiles WHERE plate_number = ? AND deleted_at IS NULL LIMIT 1',
        [plateNumber]
    );
    return rows[0] || null;
}

async function create({ owner_user_id, plate_number, brand, model, year, vehicle_type, capacity, notes }) {
    const [result] = await db.query(
        `INSERT INTO vehicle_profiles
           (owner_user_id, plate_number, brand, model, year, vehicle_type, capacity, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [owner_user_id, plate_number, brand, model, year, vehicle_type, capacity, notes || null]
    );
    return result.insertId;
}

async function updateStatus(id, status) {
    const [result] = await db.query(
        'UPDATE vehicle_profiles SET status = ? WHERE id = ?',
        [status, id]
    );
    return result.affectedRows;
}

// Sıradan alanlar — direkt UPDATE (admin onayı yok)
async function updateSafeFields(id, { notes }) {
    const [result] = await db.query(
        'UPDATE vehicle_profiles SET notes = ? WHERE id = ?',
        [notes || null, id]
    );
    return result.affectedRows;
}

// Hassas alanlar — admin approve edince uygulanır. Sadece NULL olmayan alanları günceller.
async function applySensitiveFields(id, { plate_number, brand, model, year, vehicle_type, capacity }) {
    const parts = [];
    const params = [];
    if (plate_number)  { parts.push('plate_number = ?');  params.push(plate_number); }
    if (brand)         { parts.push('brand = ?');         params.push(brand); }
    if (model)         { parts.push('model = ?');         params.push(model); }
    if (year)          { parts.push('year = ?');          params.push(year); }
    if (vehicle_type)  { parts.push('vehicle_type = ?');  params.push(vehicle_type); }
    if (capacity)      { parts.push('capacity = ?');      params.push(capacity); }
    if (parts.length === 0) return 0;
    params.push(id);
    const [result] = await db.query(
        `UPDATE vehicle_profiles SET ${parts.join(', ')} WHERE id = ?`,
        params
    );
    return result.affectedRows;
}

module.exports = {
    findByOwnerUserId, findById, findByPlateNumber, create, updateStatus,
    updateSafeFields, applySensitiveFields,
};
