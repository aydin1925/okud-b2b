-- ==========================================
-- OKUD Migration 008 — Contract Templates
-- Kurumların şoför/araç sahibi ile imzaladığı sözleşme metinleri
-- Her (company_id, contract_type) çifti için en fazla 1 şablon.
-- ==========================================

CREATE TABLE contract_templates (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    company_id    INT NOT NULL,
    contract_type ENUM('driver','vehicle_owner') NOT NULL,
    title         VARCHAR(200) NOT NULL,
    content       TEXT NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP NULL DEFAULT NULL,

    UNIQUE KEY uq_contract_templates_company_type (company_id, contract_type),
    INDEX idx_contract_templates_deleted_at      (deleted_at),

    CONSTRAINT fk_contract_templates_company
      FOREIGN KEY (company_id) REFERENCES companies(id)
      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
