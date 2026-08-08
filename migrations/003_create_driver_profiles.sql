-- ==========================================
-- OKUD Migration 003 — Driver Profiles
-- Şoför kimliği tablosu (workspace rolü değil, kişisel profil)
-- ==========================================

CREATE TABLE driver_profiles (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    national_id    VARCHAR(11) NOT NULL,
    phone          VARCHAR(20) NOT NULL,
    birth_date     DATE NOT NULL,
    license_class  VARCHAR(10) NOT NULL,
    status         ENUM('pending_docs','active','inactive') NOT NULL DEFAULT 'pending_docs',
    notes          TEXT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMP NULL DEFAULT NULL,

    UNIQUE KEY uq_driver_profiles_user_id     (user_id),
    UNIQUE KEY uq_driver_profiles_national_id (national_id),
    INDEX idx_driver_profiles_status          (status),
    INDEX idx_driver_profiles_deleted_at      (deleted_at),

    CONSTRAINT fk_driver_profiles_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
