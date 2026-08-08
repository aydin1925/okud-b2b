-- ==========================================
-- OKUD Migration 013 — Vehicle Profile Update Requests
-- Hassas alan değişiklikleri (plaka, marka, model, yıl, tip, kapasite) admin onayı ister.
-- NULL alan = "bu alan için değişiklik yok" demektir.
-- ==========================================

CREATE TABLE vehicle_profile_update_requests (
    id                       INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_profile_id       INT NOT NULL,
    requested_by_user_id     INT NOT NULL,
    requested_plate_number   VARCHAR(20)  NULL,
    requested_brand          VARCHAR(50)  NULL,
    requested_model          VARCHAR(50)  NULL,
    requested_year           INT          NULL,
    requested_vehicle_type   ENUM('minibus','midibus','otobus','van','binek') NULL,
    requested_capacity       INT          NULL,
    status                   ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
    reviewed_by_user_id      INT NULL,
    reviewed_at              TIMESTAMP NULL,
    review_note              TEXT NULL,
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at               TIMESTAMP NULL DEFAULT NULL,

    INDEX idx_vpur_profile_status  (vehicle_profile_id, status),
    INDEX idx_vpur_status          (status),
    INDEX idx_vpur_deleted_at      (deleted_at),

    CONSTRAINT fk_vpur_vehicle_profile
      FOREIGN KEY (vehicle_profile_id) REFERENCES vehicle_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_vpur_requested_by
      FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vpur_reviewed_by
      FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
