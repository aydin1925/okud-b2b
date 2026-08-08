-- ==========================================
-- OKUD Migration 010 — Partnerships (Kurum-Kurum İş Birlikleri)
-- ==========================================

-- 1) contract_templates ENUM'a partnership
ALTER TABLE contract_templates
  MODIFY contract_type ENUM('driver','vehicle_owner','driver_kvkk','vehicle_owner_kvkk','partnership') NOT NULL;

-- 2) contract_acceptances ENUM'a partnership (kabul kayıtları için)
ALTER TABLE contract_acceptances
  MODIFY contract_type ENUM('driver','vehicle_owner','driver_kvkk','vehicle_owner_kvkk','partnership') NOT NULL;

-- 3) partnership_invitations — kurum-kurum davet OTP muadili
CREATE TABLE partnership_invitations (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    initiator_company_id  INT NOT NULL,
    target_company_type   ENUM('provider','receiver') NOT NULL,
    code                  VARCHAR(10) NOT NULL,
    label                 VARCHAR(200) NULL,
    expires_at            TIMESTAMP NOT NULL,
    status                ENUM('pending','consumed','expired','cancelled','rejected') NOT NULL DEFAULT 'pending',
    consumed_by           INT NULL,
    consumed_at           TIMESTAMP NULL,
    created_by            INT NOT NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP NULL DEFAULT NULL,

    INDEX idx_partnership_inv_code           (code),
    INDEX idx_partnership_inv_company_status (initiator_company_id, status),
    INDEX idx_partnership_inv_deleted_at     (deleted_at),

    CONSTRAINT fk_partnership_inv_initiator
      FOREIGN KEY (initiator_company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_partnership_inv_created_by
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_partnership_inv_consumed_by
      FOREIGN KEY (consumed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4) company_partnerships — kabul edilmiş iş birliği kayıtları
CREATE TABLE company_partnerships (
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    provider_company_id    INT NOT NULL,
    receiver_company_id    INT NOT NULL,
    invitation_id          INT NULL,
    started_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    terminated_at          TIMESTAMP NULL DEFAULT NULL,
    terminated_by_user_id  INT NULL,

    INDEX idx_partnership_provider        (provider_company_id),
    INDEX idx_partnership_receiver        (receiver_company_id),
    INDEX idx_partnership_active_pair     (provider_company_id, receiver_company_id, terminated_at),

    CONSTRAINT fk_partnership_provider
      FOREIGN KEY (provider_company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_partnership_receiver
      FOREIGN KEY (receiver_company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_partnership_invitation
      FOREIGN KEY (invitation_id) REFERENCES partnership_invitations(id) ON DELETE SET NULL,
    CONSTRAINT fk_partnership_terminated_by
      FOREIGN KEY (terminated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
