-- ==========================================
-- OKUD Migration 012 — Driver Profile Update Requests
-- Hassas alan değişiklikleri (national_id, birth_date, license_class) admin onayı ister.
-- NULL bir alan = "bu alan için değişiklik yok" demektir.
-- ==========================================

CREATE TABLE driver_profile_update_requests (
    id                       INT AUTO_INCREMENT PRIMARY KEY,
    driver_profile_id        INT NOT NULL,
    requested_by_user_id     INT NOT NULL,
    requested_national_id    VARCHAR(11)  NULL,
    requested_birth_date     DATE         NULL,
    requested_license_class  VARCHAR(10)  NULL,
    status                   ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
    reviewed_by_user_id      INT NULL,
    reviewed_at              TIMESTAMP NULL,
    review_note              TEXT NULL,
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at               TIMESTAMP NULL DEFAULT NULL,

    INDEX idx_dpur_profile_status  (driver_profile_id, status),
    INDEX idx_dpur_status          (status),
    INDEX idx_dpur_deleted_at      (deleted_at),

    CONSTRAINT fk_dpur_driver_profile
      FOREIGN KEY (driver_profile_id) REFERENCES driver_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_dpur_requested_by
      FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_dpur_reviewed_by
      FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
