const CompanyModel = require('../models/CompanyModel');
const FleetConnectionModel = require('../models/FleetConnectionModel');
const DocumentService = require('./DocumentService');
const { DOCUMENT_TYPE_LABELS } = require('../utils/constants');
const db = require('../config/db');

const VALID_TYPES = ['provider', 'receiver'];

async function create({ name, tax_number, company_type }, creatorUserId) {
  if (!name || !tax_number || !company_type) {
    throw new Error('Tüm alanlar zorunludur');
  }
  if (!VALID_TYPES.includes(company_type)) {
    throw new Error('Geçersiz kurum tipi');
  }

  const existing = await CompanyModel.findByTaxNumber(tax_number);
  if (existing) {
    throw new Error('Bu vergi numarası ile kayıtlı kurum zaten var');
  }

  const [roleRows] = await db.query(
    "SELECT id FROM roles WHERE name = 'company_admin' LIMIT 1"
  );
  if (roleRows.length === 0) {
    throw new Error('Sistem hatası: company_admin rolü tanımlı değil');
  }
  const adminRoleId = roleRows[0].id;

  const companyId = await CompanyModel.createWithAdmin({
    name,
    tax_number,
    company_type,
    adminUserId: creatorUserId,
    adminRoleId,
  });

  return { id: companyId, name, company_type };
}

/**
 * Kullanıcının bağlı olduğu tüm kurumlar.
 * İki kaynak birleşir:
 *   1. company_users — yönetici / moderator üyelikleri (rol adıyla döner)
 *   2. fleet_connections — şoför / araç sahibi / hostes yöneticisi olarak filo üyelikleri
 * Aynı kurumda hem yönetici hem filo üyesiysen: yönetici rolü öncelenir (daha yüksek yetki).
 */
async function listForUser(userId) {
  const [managerRows, fleetRows] = await Promise.all([
    CompanyModel.findByUserId(userId),
    CompanyModel.findByFleetMembership(userId),
  ]);
  const seen = new Set(managerRows.map(r => r.id));
  const merged = [...managerRows];
  for (const r of fleetRows) {
    if (!seen.has(r.id)) {
      merged.push(r);
      seen.add(r.id);
    }
  }
  merged.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
  return merged;
}

async function getMembership(userId, companyId) {
  const membership = await CompanyModel.findMembership(userId, companyId);
  if (!membership) {
    throw new Error('Bu kuruma erişim yetkin yok');
  }
  return membership;
}

/**
 * Filo üyeliği olan kullanıcı için "kurum ilişki" özet paketini kurar.
 * Kurumla aktif fleet bağlantısı yoksa hata fırlatır — controller /dashboard'a redirect eder.
 * Yönetici olan biri de girebilir (context değişmez, sadece görsel özet).
 */
async function getRelationshipForUser(userId, companyId) {
  const company = await CompanyModel.findById(companyId);
  if (!company) throw new Error('Kurum bulunamadı');

  const connections = await FleetConnectionModel.findUserConnectionsToCompany(userId, companyId);
  if (connections.length === 0) {
    throw new Error('Bu kurumla aktif bir bağlantın bulunmuyor');
  }

  // Türe göre grupla
  const drivers   = connections.filter(c => c.target_type === 'driver_profile');
  const vehicles  = connections.filter(c => c.target_type === 'vehicle_profile');
  const hostesses = connections.filter(c => c.target_type === 'hostess_profile');

  // En eski bağlantı — süre + davet kodu ondan
  const earliest = connections.reduce(
    (min, c) => (new Date(min.connected_at) <= new Date(c.connected_at) ? min : c),
    connections[0]
  );

  const roles = [];
  if (drivers.length)   roles.push({ key: 'driver',  label: 'Şoför',              icon: 'ti-steering-wheel' });
  if (vehicles.length)  roles.push({ key: 'vehicle', label: 'Araç Sahibi',        icon: 'ti-car' });
  if (hostesses.length) roles.push({ key: 'hostess', label: 'Hostes Yöneticisi',  icon: 'ti-user-heart' });

  // Kurumun görebildiği tüm belgeler: şoför profili + her araç + her hostes
  const [driverDocs, vehicleDocsArr, hostessDocsArr] = await Promise.all([
    drivers.length ? DocumentService.listForDriverByUser(userId) : Promise.resolve([]),
    Promise.all(vehicles.map(v => DocumentService.listForVehicle(v.vehicle_id))),
    Promise.all(hostesses.map(h => DocumentService.listForHostess(h.hostess_id))),
  ]);

  const documents = [
    ...driverDocs.map(d => enrichDoc(d, 'driver', 'Şoför belgesi')),
    ...vehicleDocsArr.flatMap((docs, i) =>
      docs.map(d => enrichDoc(d, 'vehicle', `${vehicles[i].plate_number}`))
    ),
    ...hostessDocsArr.flatMap((docs, i) =>
      docs.map(d => enrichDoc(d, 'hostess', `${hostesses[i].hostess_first_name} ${hostesses[i].hostess_last_name}`))
    ),
  ];

  const documentStats = {
    approved: documents.filter(d => d.verification_status === 'verified').length,
    pending:  documents.filter(d => d.verification_status === 'pending').length,
    rejected: documents.filter(d => d.verification_status === 'rejected').length,
    total:    documents.length,
  };

  const primaryContact = await CompanyModel.findPrimaryContactByCompanyId(companyId);

  // Son etkinlik: doğrulanmış/reddedilmiş belgeleri en yeniye göre — en fazla 5
  const recentActivity = documents
    .filter(d => d.verified_at)
    .sort((a, b) => new Date(b.verified_at) - new Date(a.verified_at))
    .slice(0, 5)
    .map(d => ({
      kind: d.verification_status,
      title: d.type_label,
      owner: d.owner_label,
      at: d.verified_at,
      reason: d.rejection_reason || null,
    }));

  return {
    company,
    earliestConnectedAt: earliest.connected_at,
    inviteCode: earliest.invite_code || null,
    roles,
    drivers, vehicles, hostesses,
    documents,
    documentStats,
    primaryContact,
    recentActivity,
  };
}

function enrichDoc(d, kind, label) {
  return {
    ...d,
    owner_kind: kind,
    owner_label: label,
    type_label: DOCUMENT_TYPE_LABELS[d.document_type] || d.document_type,
  };
}

module.exports = { create, listForUser, getMembership, getRelationshipForUser };
