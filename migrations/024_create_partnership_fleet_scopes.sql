-- ==========================================
-- OKUD Migration 024 — Partnership-scoped fleet inclusion
--
-- Provider kurumlar, tek bir iş ortaklığı için filolarındaki hangi üyelerin
-- karşı tarafa "bu ortaklık kapsamında" görünmesini seçer.
--
-- Semantik: satır VAR ise dahil, YOK ise dahil DEĞİL (inclusion listesi).
-- Bu, "yeni eklediğim şoför otomatik ortaklığa girmesin" davranışını sağlar
-- (özellikle büyük kooperatiflerde birden çok müşteriyle çalışırken önemli).
--
-- Migration ayrıca mevcut aktif ortaklıklardaki provider'ın mevcut aktif
-- fleet_connections'larını backfill eder — eski davranışın (hepsi dahil)
-- kırılmaması için.
-- ==========================================

CREATE TABLE partnership_fleet_scopes (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    partnership_id     INT NOT NULL,
    target_type        ENUM('driver_profile','vehicle_profile') NOT NULL,
    target_id          INT NOT NULL,
    added_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by_user_id   INT NULL DEFAULT NULL,

    UNIQUE KEY uq_ptn_scope (partnership_id, target_type, target_id),
    INDEX idx_ptn_scope_partnership (partnership_id),
    INDEX idx_ptn_scope_target      (target_type, target_id),

    CONSTRAINT fk_ptn_scope_partnership
        FOREIGN KEY (partnership_id) REFERENCES company_partnerships(id) ON DELETE CASCADE,
    CONSTRAINT fk_ptn_scope_added_by
        FOREIGN KEY (added_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Backfill: her aktif ortaklık için provider'ın aktif filo bağlantılarını dahil et.
-- Bu olmadan, migration sonrası tüm mevcut ortaklıklar boş filo görünürdü.
INSERT INTO partnership_fleet_scopes (partnership_id, target_type, target_id)
SELECT p.id, fc.target_type, fc.target_id
  FROM company_partnerships p
  INNER JOIN fleet_connections fc
      ON fc.company_id = p.provider_company_id
     AND fc.disconnected_at IS NULL
 WHERE p.terminated_at IS NULL;
