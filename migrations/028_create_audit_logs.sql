-- 028_create_audit_logs.sql
-- Denetim izi (audit trail). Sistemde hukuki/kritik önemi olan her eylem buraya
-- BİR satır olarak düşer. Bu tablo APPEND-ONLY'dir:
--   - Hiçbir yerde UPDATE yok  → geçmiş çarpıtılamaz
--   - Hiçbir yerde DELETE yok  → kanıt yok edilemez
-- Hukuki dayanağı budur: "sistem bu tabloya sadece ekleme yapar."
--
-- actor_user_id / company_id FK'leri ON DELETE SET NULL:
--   Kullanıcı ya da kurum ileride silinse bile log satırı SİLİNMEZ, sadece
--   bağlantı NULL'lanır. "Kim yaptı" bilgisi kritikse metadata'ya snapshot yazılır.

CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,

  actor_user_id INT NULL,              -- eylemi yapan kullanıcı (NULL = sistem/cron)
  company_id    INT NULL,              -- hangi kurum bağlamında (varsa)

  action        VARCHAR(50)  NOT NULL, -- 'document.reject', 'fleet.remove' ...
  entity_type   VARCHAR(40)  NULL,     -- 'document', 'fleet_connection' ...
  entity_id     BIGINT       NULL,     -- ilgili kaydın id'si

  metadata      JSON NULL,             -- olaya özel serbest bağlam (gerekçe, isim, plaka...)
  ip_address    VARCHAR(45) NULL,      -- IPv4/IPv6 (45 kr. IPv6 tam sığar)

  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_created        (created_at),
  KEY idx_actor          (actor_user_id, created_at),
  KEY idx_action         (action, created_at),
  KEY idx_entity         (entity_type, entity_id),
  KEY idx_company        (company_id, created_at),

  CONSTRAINT fk_audit_actor
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
