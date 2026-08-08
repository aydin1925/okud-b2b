-- ==========================================
-- OKUD Migration 005 — Vehicle Profiles
-- Araç kimliği tablosu (bir kullanıcı birden fazla araç sahibi olabilir)
-- ==========================================

CREATE TABLE vehicle_profiles (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id  INT NOT NULL,
    plate_number   VARCHAR(20) NOT NULL,
    brand          VARCHAR(50) NOT NULL,
    model          VARCHAR(50) NOT NULL,
    year           INT NOT NULL,
    vehicle_type   ENUM('minibus','midibus','otobus','van','binek') NOT NULL,
    capacity       INT NOT NULL,
    status         ENUM('pending_docs','active','inactive') NOT NULL DEFAULT 'pending_docs',
    notes          TEXT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMP NULL DEFAULT NULL,

    UNIQUE KEY uq_vehicle_profiles_plate_number (plate_number),
    INDEX idx_vehicle_profiles_owner_user_id    (owner_user_id),
    INDEX idx_vehicle_profiles_status           (status),
    INDEX idx_vehicle_profiles_deleted_at       (deleted_at),

    CONSTRAINT fk_vehicle_profiles_owner
      FOREIGN KEY (owner_user_id) REFERENCES users(id)
      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
