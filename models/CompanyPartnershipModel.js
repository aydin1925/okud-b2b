const db = require('../config/db');

async function existsActive(providerCompanyId, receiverCompanyId) {
  const [rows] = await db.query(
    `SELECT id FROM company_partnerships
      WHERE provider_company_id = ? AND receiver_company_id = ? AND terminated_at IS NULL
      LIMIT 1`,
    [providerCompanyId, receiverCompanyId]
  );
  return rows.length > 0;
}

// Kabul akışı — dörtlü atomik işlem:
// 1) partnership_invitations.status='consumed'
// 2) company_partnerships insert
// 3) contract_acceptances insert (partnership snapshot)
// 4) commit
async function createFromInvitationWithAcceptance({
  invitation, providerCompanyId, receiverCompanyId,
  acceptingUserId, acceptance, ipAddress,
}) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Daveti consumed yap (yarış korumalı WHERE)
    const [upd] = await conn.query(
      `UPDATE partnership_invitations
          SET status = 'consumed', consumed_by = ?, consumed_at = NOW()
        WHERE id = ? AND status = 'pending' AND expires_at > NOW() AND deleted_at IS NULL`,
      [acceptingUserId, invitation.id]
    );
    if (upd.affectedRows === 0) {
      throw new Error('Davet artık geçerli değil (kullanılmış veya süresi dolmuş olabilir)');
    }

    // 2) company_partnerships insert
    const [ins] = await conn.query(
      `INSERT INTO company_partnerships
         (provider_company_id, receiver_company_id, invitation_id)
       VALUES (?, ?, ?)`,
      [providerCompanyId, receiverCompanyId, invitation.id]
    );
    const partnershipId = ins.insertId;

    // 3a) Partnership fleet scope — invitation'ın scope'u varsa onu kopyala;
    // yoksa (eski davetler için defensive fallback) provider'ın mevcut aktif
    // filosunu auto-include et. Yeni davetlerde scope her zaman set olur (Blok 9),
    // fallback sadece geçmiş uyumluluğu içindir.
    const [scopeCountRows] = await conn.query(
      `SELECT COUNT(*) AS cnt
         FROM partnership_invitation_fleet_scopes
        WHERE invitation_id = ?`,
      [invitation.id]
    );
    const invitationHasScope = (scopeCountRows[0] && scopeCountRows[0].cnt > 0);

    if (invitationHasScope) {
      // Davetteki seçimi partnership'e kopyala
      await conn.query(
        `INSERT INTO partnership_fleet_scopes
           (partnership_id, target_type, target_id, added_by_user_id)
         SELECT ?, target_type, target_id, ?
           FROM partnership_invitation_fleet_scopes
          WHERE invitation_id = ?`,
        [partnershipId, acceptingUserId, invitation.id]
      );
    } else {
      // Fallback: provider'ın mevcut aktif filosunu auto-include
      await conn.query(
        `INSERT INTO partnership_fleet_scopes
           (partnership_id, target_type, target_id, added_by_user_id)
         SELECT ?, fc.target_type, fc.target_id, ?
           FROM fleet_connections fc
          WHERE fc.company_id = ? AND fc.disconnected_at IS NULL`,
        [partnershipId, acceptingUserId, providerCompanyId]
      );
    }

    // 3) contract_acceptances insert — sadece partnership sözleşmesi (KVKK yok)
    // fleet_connection_id NULL, partnership_id = yeni oluşan partnership
    await conn.query(
      `INSERT INTO contract_acceptances
         (user_id, company_id, fleet_connection_id, partnership_id, contract_type,
          template_id, title_snapshot, content_snapshot, ip_address)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
      [
        acceptingUserId,
        invitation.initiator_company_id,
        partnershipId,
        acceptance.contract_type,
        acceptance.template_id || null,
        acceptance.title_snapshot,
        acceptance.content_snapshot,
        ipAddress || null,
      ]
    );

    await conn.commit();
    return partnershipId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Kurumun aktif iş birlikleri — çift yönlü SELECT + karşı taraf company adları JOIN.
async function findActiveByCompany(companyId) {
  const [rows] = await db.query(
    `SELECT
        p.id, p.provider_company_id, p.receiver_company_id,
        p.started_at, p.invitation_id,
        pc.name AS provider_name, pc.company_type AS provider_type,
        rc.name AS receiver_name, rc.company_type AS receiver_type
       FROM company_partnerships p
       INNER JOIN companies pc ON pc.id = p.provider_company_id
       INNER JOIN companies rc ON rc.id = p.receiver_company_id
      WHERE (p.provider_company_id = ? OR p.receiver_company_id = ?)
        AND p.terminated_at IS NULL
      ORDER BY p.started_at DESC`,
    [companyId, companyId]
  );
  return rows;
}

// Sistemdeki TÜM aktif partnership'ler — cron taraması için.
// Sadece taban alanları döner (company_id çiftleri + started_at).
async function findAllActive() {
  const [rows] = await db.query(
    `SELECT id, provider_company_id, receiver_company_id, started_at
       FROM company_partnerships
      WHERE terminated_at IS NULL
      ORDER BY started_at DESC`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT
        p.*,
        pc.name AS provider_name, pc.company_type AS provider_type,
        rc.name AS receiver_name, rc.company_type AS receiver_type
       FROM company_partnerships p
       INNER JOIN companies pc ON pc.id = p.provider_company_id
       INNER JOIN companies rc ON rc.id = p.receiver_company_id
      WHERE p.id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function terminate(id, userId) {
  const [result] = await db.query(
    `UPDATE company_partnerships
        SET terminated_at = NOW(), terminated_by_user_id = ?
      WHERE id = ? AND terminated_at IS NULL`,
    [userId, id]
  );
  return result.affectedRows;
}

module.exports = {
  existsActive,
  createFromInvitationWithAcceptance,
  findActiveByCompany,
  findAllActive,
  findById,
  terminate,
};
