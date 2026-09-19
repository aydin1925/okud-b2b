const AuditLogModel = require('../models/AuditLogModel');

/**
 * Bir denetim izi satırı yaz. FIRE-AND-FORGET:
 *   - Çağıran await ETMEZ; log yazımı asıl işi bekletmez/bloklamaz.
 *   - Hata olursa yutulur (console.error) — log yüzünden gerçek işlem çökmesin.
 *
 * Kullanım (Service içinde, asıl iş bittikten HEMEN sonra):
 *   AuditService.log({
 *     actorUserId, companyId, action: AUDIT_ACTIONS.DOCUMENT_REJECT,
 *     entityType: 'document', entityId: docId,
 *     metadata: { reason }, ipAddress,
 *   });
 */
function log({ actorUserId, companyId, action, entityType, entityId, metadata, ipAddress }) {
  // await yok — çağırana Promise dönmüyoruz ki yanlışlıkla akış buna bağlanmasın.
  Promise.resolve()
    .then(() =>
      AuditLogModel.create({
        actor_user_id: actorUserId,
        company_id:    companyId,
        action,
        entity_type:   entityType,
        entity_id:     entityId,
        metadata,
        ip_address:    ipAddress,
      })
    )
    .catch((err) => {
      // Log başarısız oldu ama asıl iş etkilenmesin — sadece not düş.
      console.error('[AuditService.log] kayıt başarısız:', action, err.message);
    });
}

/**
 * Görünüm için filtreli + sayfalı liste + toplam sayı.
 * filters: { action, actorUserId, from, to, page, perPage }
 */
async function list({ action, actorUserId, from, to, page = 1, perPage = 50 } = {}) {
  const limit = Math.min(Math.max(Number(perPage) || 50, 1), 200);
  const currentPage = Math.max(Number(page) || 1, 1);
  const offset = (currentPage - 1) * limit;

  const filters = { action, actorUserId, from, to };
  const [rows, total] = await Promise.all([
    AuditLogModel.search({ ...filters, limit, offset }),
    AuditLogModel.count(filters),
  ]);

  return {
    rows,
    total,
    page: currentPage,
    perPage: limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
}

module.exports = { log, list };
