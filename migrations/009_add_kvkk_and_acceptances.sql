-- ==========================================
-- OKUD Migration 009 — KVKK types + Acceptances + Reject status
-- ==========================================

-- 1) contract_templates ENUM'a KVKK türleri
ALTER TABLE contract_templates
  MODIFY contract_type ENUM('driver','vehicle_owner','driver_kvkk','vehicle_owner_kvkk') NOT NULL;

-- 2) İmzalı nüsha kayıtları
CREATE TABLE contract_acceptances (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL,
    company_id          INT NOT NULL,
    fleet_connection_id INT NULL,
    contract_type       ENUM('driver','vehicle_owner','driver_kvkk','vehicle_owner_kvkk') NOT NULL,
    template_id         INT NULL,
    title_snapshot      VARCHAR(200) NOT NULL,
    content_snapshot    TEXT NOT NULL,
    accepted_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address          VARCHAR(45) NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP NULL DEFAULT NULL,

    INDEX idx_acceptance_user             (user_id),
    INDEX idx_acceptance_fleet_connection (fleet_connection_id),
    INDEX idx_acceptance_company_type     (company_id, contract_type),
    INDEX idx_acceptance_deleted_at       (deleted_at),

    CONSTRAINT fk_acceptance_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_acceptance_company
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_acceptance_fleet_connection
      FOREIGN KEY (fleet_connection_id) REFERENCES fleet_connections(id) ON DELETE SET NULL,
    CONSTRAINT fk_acceptance_template
      FOREIGN KEY (template_id) REFERENCES contract_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3) connection_requests ENUM'a rejected
ALTER TABLE connection_requests
  MODIFY status ENUM('pending','consumed','expired','cancelled','rejected') NOT NULL DEFAULT 'pending';
