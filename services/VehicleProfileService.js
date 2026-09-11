const VehicleProfileModel = require('../models/VehicleProfileModel');
const VehicleProfileUpdateRequestModel = require('../models/VehicleProfileUpdateRequestModel');
const DocumentModel = require('../models/DocumentModel');
const {
    VEHICLE_DOCUMENT_TYPES,
    OWNER_TYPES,
} = require('../utils/constants');

const VALID_TYPES = ['minibus', 'midibus', 'otobus', 'van', 'binek'];
const PLATE_REGEX = /^[0-9]{2}\s?[A-ZÇĞİÖŞÜ]{1,3}\s?[0-9]{2,4}$/i;
const MIN_YEAR = 1980;

function normalizePlate(plate) {
    return String(plate || '').trim().toUpperCase().replace(/\s+/g, '');
}

async function create({ plate_number, brand, model, year, vehicle_type, capacity, notes }, ownerUserId) {
    if (!plate_number || !brand || !model || !year || !vehicle_type || !capacity) {
        throw new Error('Plaka, marka, model, yıl, tip ve kapasite zorunludur');
    }

    const plate = String(plate_number).trim().toUpperCase().replace(/\s+/g, '');
    if (!PLATE_REGEX.test(plate_number)) {
        throw new Error('Geçersiz plaka formatı (örn: 34 ABC 123)');
    }

    if (!VALID_TYPES.includes(vehicle_type)) {
        throw new Error('Geçersiz araç tipi');
    }

    const yr = parseInt(year, 10);
    const nextYear = new Date().getFullYear() + 1;
    if (isNaN(yr) || yr < MIN_YEAR || yr > nextYear) {
        throw new Error(`Yıl ${MIN_YEAR} ile ${nextYear} arasında olmalı`);
    }

    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap < 1 || cap > 100) {
        throw new Error('Kapasite 1-100 arasında olmalı');
    }

    const existing = await VehicleProfileModel.findByPlateNumber(plate);
    if (existing) {
        throw new Error('Bu plaka ile kayıtlı bir araç zaten var');
    }

    const vehicleId = await VehicleProfileModel.create({
        owner_user_id: ownerUserId,
        plate_number: plate,
        brand,
        model,
        year: yr,
        vehicle_type,
        capacity: cap,
        notes,
    });

    return { id: vehicleId };
}

async function listForUser(userId) {
    return VehicleProfileModel.findByOwnerUserId(userId);
}

// Sadece sahibi olduğun aracı getir. Değilse hata.
async function getForUser(userId, vehicleId) {
    const vehicle = await VehicleProfileModel.findById(vehicleId);
    if (!vehicle) throw new Error('Araç bulunamadı');
    if (vehicle.owner_user_id !== userId) {
        throw new Error('Bu araca erişim yetkin yok');
    }
    return vehicle;
}

async function recomputeStatus(vehicleId) {
    const vehicle = await VehicleProfileModel.findById(vehicleId);
    if (!vehicle || vehicle.status === 'inactive') return;

    let allValid = true;
    const today = new Date().toISOString().slice(0, 10);

    for (const type of VEHICLE_DOCUMENT_TYPES) {
        const doc = await DocumentModel.findLatestByType(
            OWNER_TYPES.VEHICLE_PROFILE,
            vehicleId,
            type
        );
        if (!doc) { allValid = false; break; }
        if (doc.verification_status !== 'verified') { allValid = false; break; }
        if (doc.expires_at && doc.expires_at < today) { allValid = false; break; }
    }

    const desired = allValid ? 'active' : 'pending_docs';
    if (vehicle.status !== desired) {
        await VehicleProfileModel.updateStatus(vehicleId, desired);
    }
}

// Sıradan alanlar — direkt kaydeder (sahiplik kontrolü)
async function updateSafeFields(userId, vehicleId, { notes }) {
    const vehicle = await VehicleProfileModel.findById(vehicleId);
    if (!vehicle) throw new Error('Araç bulunamadı');
    if (vehicle.owner_user_id !== userId) throw new Error('Bu araca erişim yetkin yok');
    await VehicleProfileModel.updateSafeFields(vehicleId, { notes: (notes || '').trim() });
}

// Hassas alanlar — talep oluşturur
async function requestSensitiveUpdate(userId, vehicleId, { plate_number, brand, model, year, vehicle_type, capacity }) {
    const vehicle = await VehicleProfileModel.findById(vehicleId);
    if (!vehicle) throw new Error('Araç bulunamadı');
    if (vehicle.owner_user_id !== userId) throw new Error('Bu araca erişim yetkin yok');

    const existing = await VehicleProfileUpdateRequestModel.findPendingByProfile(vehicle.id);
    if (existing) {
        throw new Error('Bekleyen bir talebin var. Yeni talep oluşturmadan önce onu iptal et veya sonucunu bekle.');
    }

    const changes = {};

    if (plate_number) {
        const plate = normalizePlate(plate_number);
        if (!PLATE_REGEX.test(plate_number)) throw new Error('Geçersiz plaka formatı (örn: 34 ABC 123)');
        if (plate !== vehicle.plate_number) {
            const other = await VehicleProfileModel.findByPlateNumber(plate);
            if (other && other.id !== vehicle.id) throw new Error('Bu plaka ile başka bir araç kayıtlı');
            changes.requested_plate_number = plate;
        }
    }
    if (brand && brand.trim() !== vehicle.brand) changes.requested_brand = brand.trim();
    if (model && model.trim() !== vehicle.model) changes.requested_model = model.trim();

    if (year) {
        const yr = parseInt(year, 10);
        const nextYear = new Date().getFullYear() + 1;
        if (isNaN(yr) || yr < MIN_YEAR || yr > nextYear) throw new Error(`Yıl ${MIN_YEAR} ile ${nextYear} arasında olmalı`);
        if (yr !== vehicle.year) changes.requested_year = yr;
    }
    if (vehicle_type && vehicle_type !== vehicle.vehicle_type) {
        if (!VALID_TYPES.includes(vehicle_type)) throw new Error('Geçersiz araç tipi');
        changes.requested_vehicle_type = vehicle_type;
    }
    if (capacity) {
        const cap = parseInt(capacity, 10);
        if (isNaN(cap) || cap < 1 || cap > 100) throw new Error('Kapasite 1-100 arasında olmalı');
        if (cap !== vehicle.capacity) changes.requested_capacity = cap;
    }

    if (Object.keys(changes).length === 0) {
        throw new Error('Hiçbir hassas alan için değişiklik önerilmedi');
    }

    const id = await VehicleProfileUpdateRequestModel.create({
        vehicle_profile_id: vehicle.id,
        requested_by_user_id: userId,
        ...changes,
    });
    return { id };
}

async function getMyPendingRequest(userId, vehicleId) {
    const vehicle = await VehicleProfileModel.findById(vehicleId);
    if (!vehicle) return null;
    if (vehicle.owner_user_id !== userId) return null;
    return VehicleProfileUpdateRequestModel.findPendingByProfile(vehicle.id);
}

async function cancelMyPendingRequest(userId, requestId) {
    const affected = await VehicleProfileUpdateRequestModel.cancelByUser(requestId, userId);
    if (!affected) throw new Error('İptal edilecek pending talep bulunamadı');
}

/**
 * Manuel pasife alma / aktifleştirme. active=false → 'inactive'; true → recompute.
 */
async function setActive(userId, vehicleId, active) {
    const vehicle = await VehicleProfileModel.findById(vehicleId);
    if (!vehicle) throw new Error('Araç bulunamadı');
    if (vehicle.owner_user_id !== userId) throw new Error('Bu araca erişim yetkin yok');

    if (active === false || active === 'false') {
        if (vehicle.status === 'inactive') return;
        await VehicleProfileModel.updateStatus(vehicleId, 'inactive');
    } else {
        await VehicleProfileModel.updateStatus(vehicleId, 'pending_docs');
        await recomputeStatus(vehicleId);
    }
}

/**
 * Aracı filodan çıkarma — sahiplik + atomik transaction.
 * Araç soft delete + araca bağlı aktif hostesin vehicle_id NULL yapılır (boşta).
 * Hostes kaydı silinmez; sonra başka araca atanabilir.
 */
async function softDelete(userId, vehicleId) {
    const vehicle = await VehicleProfileModel.findById(vehicleId);
    if (!vehicle) throw new Error('Silinecek araç bulunamadı');
    if (vehicle.owner_user_id !== userId) throw new Error('Bu araca erişim yetkin yok');

    const affected = await VehicleProfileModel.softDeleteWithHostessUnlink(vehicleId);
    if (!affected) throw new Error('Araç zaten silinmiş');
}

module.exports = {
    create, listForUser, getForUser, recomputeStatus,
    updateSafeFields, requestSensitiveUpdate,
    getMyPendingRequest, cancelMyPendingRequest,
    softDelete, setActive,
};
