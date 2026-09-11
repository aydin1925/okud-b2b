-- ==========================================
-- OKUD Migration 018 — Kurum Belge Gereksinim Şablonu
--
-- Kurum, filosuna dahil ettiği şoför/araç/hostesten hangi belgeleri istediğini
-- burada tanımlar. Sonraki iterasyonlarda:
--   - Redeem popup bu şablona bakıp eksikleri gösterir
--   - Cron bu şablona göre "eksik belge" bildirimi atar
--   - Filo paneli bu şablona göre sağlık hesabı yapar
--
-- Şablon soft-delete kullanmaz — bir gereksinim kaldırılırsa fiziksel silinir.
-- Basit ve tutarlı: kayıt var = gereksinim var, kayıt yok = gereksinim yok.
-- ==========================================

CREATE TABLE company_document_requirements (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    company_id    INT NOT NULL,
    target_type   ENUM('driver_profile','vehicle_profile','hostess_profile') NOT NULL,
    document_type VARCHAR(50) NOT NULL,       -- constants.js'teki slug
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_company_req (company_id, target_type, document_type),
    INDEX idx_req_company_target (company_id, target_type),

    CONSTRAINT fk_req_company
      FOREIGN KEY (company_id) REFERENCES companies(id)
      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
