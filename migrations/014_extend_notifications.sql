-- ==========================================
-- OKUD Migration 014 — Kurum bağlamlı bildirim + kullanıcı bazlı dedup
--
-- Neden:
--   Şu an bildirim yalnızca belge sahibi user'a gidiyor.
--   Kurum admin/moderator'larına da uyarı gitmesi için notifications
--   satırının hangi kurum bağlamında oluşturulduğunu bilmemiz gerek.
--   Ayrıca dedup indeksini (document + type + threshold) üzerinden
--   (document + type + threshold + user) hâline getiriyoruz ki
--   aynı belge farklı kullanıcılar için ayrı satır oluşturabilsin.
-- ==========================================

ALTER TABLE notifications
  ADD COLUMN company_id INT NULL AFTER user_id;

ALTER TABLE notifications
  ADD INDEX idx_notifications_company_id (company_id),
  ADD INDEX idx_notifications_dedupe_v2  (document_id, type, threshold_days, user_id);

ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
    ON DELETE SET NULL;
