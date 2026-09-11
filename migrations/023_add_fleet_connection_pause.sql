-- ==========================================
-- OKUD Migration 023 — Kurum tarafı fleet_connection duraklatma
--
-- Bir kurum yöneticisi, kendi filosundaki bir şoför veya aracı GEÇİCİ olarak
-- "pasife" alabilir. Pasif üye:
--   - kurumun filo listesinde "Pasif" rozetiyle görünür (silinmez, disconnect değil)
--   - iş birliği fleet_readiness hesabında sayılmaz (karşı taraf uyumluluk hesabı)
--   - sadece o kurum için pasif — aynı şoför başka kurumda aktif kalabilir
--
-- paused_at NULL → aktif. NOT NULL → pasif, o zaman set edildi.
-- paused_by_user_id — hangi yönetici pasife aldı (audit).
-- ==========================================

ALTER TABLE fleet_connections
    ADD COLUMN paused_at TIMESTAMP NULL DEFAULT NULL AFTER disconnected_at,
    ADD COLUMN paused_by_user_id INT NULL DEFAULT NULL AFTER paused_at,
    ADD CONSTRAINT fk_fleet_conn_paused_by
      FOREIGN KEY (paused_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    ADD INDEX idx_fleet_conn_paused (company_id, paused_at);
