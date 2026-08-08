-- ==========================================
-- OKUD Migration 006 — Connections (OTP Handshake)
-- connection_requests: kurumun ürettiği tek kullanımlık OTP kodları
-- fleet_connections:    kabul edilmiş kurum ↔ şoför/araç bağlantıları
-- ==========================================

CREATE TABLE connection_requests (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    company_id    INT NOT NULL,
    target_type   ENUM('driver_profile','vehicle_profile') NOT NULL,
    code          VARCHAR(10) NOT NULL,
    label         VARCHAR(100) NULL,
    expires_at    TIMESTAMP NOT NULL,
    status        ENUM('pending','consumed','expired','cancelled') NOT NULL DEFAULT 'pending',
    consumed_by   INT NULL,
    consumed_at   TIMESTAMP NULL,
    created_by    INT NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP NULL DEFAULT NULL,

    INDEX idx_conn_req_code            (code),
    INDEX idx_conn_req_company_status  (company_id, status),
    INDEX idx_conn_req_deleted_at      (deleted_at),

    CONSTRAINT fk_conn_req_company
      FOREIGN KEY (company_id) REFERENCES companies(id)
      ON DELETE CASCADE,
    CONSTRAINT fk_conn_req_created_by
      FOREIGN KEY (created_by) REFERENCES users(id)
      ON DELETE RESTRICT,
    CONSTRAINT fk_conn_req_consumed_by
      FOREIGN KEY (consumed_by) REFERENCES users(id)
      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE fleet_connections (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    company_id            INT NOT NULL,
    target_type           ENUM('driver_profile','vehicle_profile') NOT NULL,
    target_id             INT NOT NULL,
    connection_request_id INT NULL,
    connected_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    disconnected_at       TIMESTAMP NULL DEFAULT NULL,

    INDEX idx_fleet_conn_company     (company_id),
    INDEX idx_fleet_conn_target      (target_type, target_id),
    INDEX idx_fleet_conn_active      (company_id, target_type, target_id, disconnected_at),

    CONSTRAINT fk_fleet_conn_company
      FOREIGN KEY (company_id) REFERENCES companies(id)
      ON DELETE CASCADE,
    CONSTRAINT fk_fleet_conn_request
      FOREIGN KEY (connection_request_id) REFERENCES connection_requests(id)
      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
