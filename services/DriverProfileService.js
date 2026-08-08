const DriverProfileModel = require('../models/DriverProfileModel');
const DriverProfileUpdateRequestModel = require('../models/DriverProfileUpdateRequestModel');
const DocumentModel = require('../models/DocumentModel');
const {
    DRIVER_DOCUMENT_TYPES,
    OWNER_TYPES,
} = require('../utils/constants');

const VALID_LICENSE_CLASSES = ['B', 'C', 'D', 'D1', 'E'];
const NATIONAL_ID_REGEX = /^\d{11}$/;
const PHONE_REGEX = /^\+?[\d\s]{10,20}$/;

async function create({ national_id, phone, birth_date, license_class, notes }, userId) {
    if (!national_id || !phone || !birth_date || !license_class) {
        throw new Error('TC, telefon, doğum tarihi ve ehliyet sınıfı zorunludur');
    }
    if (!NATIONAL_ID_REGEX.test(national_id)) {
        throw new Error('TC kimlik numarası 11 haneli olmalı');
    }
    if (!PHONE_REGEX.test(phone)) {
        throw new Error('Geçersiz telefon formatı');
    }
    if (!VALID_LICENSE_CLASSES.includes(license_class)) {
        throw new Error('Geçersiz ehliyet sınıfı');
    }

    const birth = new Date(birth_date);
    const now = new Date();
    const age = now.getFullYear() - birth.getFullYear()
        - (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
    if (age < 18) {
        throw new Error('Şoför olabilmek için en az 18 yaşında olmalısın');
    }

    const existingByUser = await DriverProfileModel.findByUserId(userId);
    if (existingByUser) {
        throw new Error('Zaten bir şoför profilin var');
    }

    const existingByNationalId = await DriverProfileModel.findByNationalId(national_id);
    if (existingByNationalId) {
        throw new Error('Bu TC ile kayıtlı başka bir şoför profili var');
    }

    const profileId = await DriverProfileModel.create({
        user_id: userId,
        national_id,
        phone,
        birth_date,
        license_class,
        notes,
    });

    return { id: profileId };
}

async function getMyProfile(userId) {
    return DriverProfileModel.findByUserId(userId);
}

// Şoförün belge durumuna göre profil status'ünü otomatik günceller.
// Tüm gerekli belgeler verified ve geçerli ise 'active'; değilse 'pending_docs'.
// 'inactive' manuel bir karardır, buradan geri döndürmeyiz.
async function recomputeStatus(profileId) {
    const profile = await DriverProfileModel.findById(profileId);
    if (!profile || profile.status === 'inactive') return;

    let allValid = true;
    const today = new Date().toISOString().slice(0, 10);

    for (const type of DRIVER_DOCUMENT_TYPES) {
        const doc = await DocumentModel.findLatestByType(
            OWNER_TYPES.DRIVER_PROFILE,
            profileId,
            type
        );
        if (!doc) { allValid = false; break; }
        if (doc.verification_status !== 'verified') { allValid = false; break; }
        if (doc.expires_at && doc.expires_at < today) { allValid = false; break; }
    }

    const desiredStatus = allValid ? 'active' : 'pending_docs';
    if (profile.status !== desiredStatus) {
        await DriverProfileModel.updateStatus(profileId, desiredStatus);
    }
}

// Sıradan alanlar — direkt kaydeder
async function updateSafeFields(userId, { phone, notes }) {
    const profile = await DriverProfileModel.findByUserId(userId);
    if (!profile) throw new Error('Şoför profilin yok');

    const cleanPhone = (phone || '').trim();
    if (!cleanPhone) throw new Error('Telefon zorunlu');
    if (!PHONE_REGEX.test(cleanPhone)) throw new Error('Geçersiz telefon formatı');

    const cleanNotes = (notes || '').trim();

    await DriverProfileModel.updateSafeFields(profile.id, { phone: cleanPhone, notes: cleanNotes });
}

// Hassas alanlar — talep oluşturur (profil değişmez, admin onayı bekler)
async function requestSensitiveUpdate(userId, { national_id, birth_date, license_class }) {
    const profile = await DriverProfileModel.findByUserId(userId);
    if (!profile) throw new Error('Şoför profilin yok');

    // Aynı anda birden fazla pending talep olamaz
    const existing = await DriverProfileUpdateRequestModel.findPendingByProfile(profile.id);
    if (existing) {
        throw new Error('Bekleyen bir talebin var. Yeni talep oluşturmadan önce onu iptal et veya sonucunu bekle.');
    }

    // En az bir alan değişmiş olmalı ve mevcut değerden farklı olmalı
    const changes = {};
    if (national_id && national_id !== profile.national_id) {
        if (!NATIONAL_ID_REGEX.test(national_id)) throw new Error('TC kimlik 11 haneli olmalı');
        // Başka bir şoförde bu TC kayıtlı mı
        const other = await DriverProfileModel.findByNationalId(national_id);
        if (other && other.id !== profile.id) throw new Error('Bu TC ile başka bir şoför profili var');
        changes.requested_national_id = national_id;
    }
    if (birth_date && birth_date !== String(profile.birth_date)) {
        const birth = new Date(birth_date);
        const now = new Date();
        const age = now.getFullYear() - birth.getFullYear()
            - (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
        if (age < 18) throw new Error('Doğum tarihi 18 yaş üstünü göstermeli');
        changes.requested_birth_date = birth_date;
    }
    if (license_class && license_class !== profile.license_class) {
        if (!VALID_LICENSE_CLASSES.includes(license_class)) throw new Error('Geçersiz ehliyet sınıfı');
        changes.requested_license_class = license_class;
    }

    if (Object.keys(changes).length === 0) {
        throw new Error('Hiçbir hassas alan için değişiklik önerilmedi');
    }

    const id = await DriverProfileUpdateRequestModel.create({
        driver_profile_id: profile.id,
        requested_by_user_id: userId,
        ...changes,
    });
    return { id };
}

async function getMyPendingRequest(userId) {
    const profile = await DriverProfileModel.findByUserId(userId);
    if (!profile) return null;
    return DriverProfileUpdateRequestModel.findPendingByProfile(profile.id);
}

async function cancelMyPendingRequest(userId, requestId) {
    const affected = await DriverProfileUpdateRequestModel.cancelByUser(requestId, userId);
    if (!affected) throw new Error('İptal edilecek pending talep bulunamadı');
}

module.exports = {
    create, getMyProfile, recomputeStatus,
    updateSafeFields, requestSensitiveUpdate,
    getMyPendingRequest, cancelMyPendingRequest,
};
