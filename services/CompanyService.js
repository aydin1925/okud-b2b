const CompanyModel = require('../models/CompanyModel');
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

async function listForUser(userId) {
  return CompanyModel.findByUserId(userId);
}

async function getMembership(userId, companyId) {
  const membership = await CompanyModel.findMembership(userId, companyId);
  if (!membership) {
    throw new Error('Bu kuruma erişim yetkin yok');
  }
  return membership;
}

module.exports = { create, listForUser, getMembership };
