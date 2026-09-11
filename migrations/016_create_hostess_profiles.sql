-- ==========================================
-- OKUD Migration 016 — Hostess Profiles
--
-- Hostes = servis aracında görev alan operasyonel personel ("servis ablası").
-- Kendi user hesabı YOK; araç sahibi tarafından yönetilir.
-- Bir hostes zorunlu olarak bir araca bağlıdır (vehicle_id).
-- Aynı hostes farklı araçlara farklı zamanlarda atanabilir (vehicle_id update).
-- Belgeleri polymorphic documents tablosunda owner_type='hostess_profile' ile tutulur.
-- ==========================================

CREATE TABLE hostess_profiles (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    managed_by_user_id  INT NOT NULL,               -- araç sahibi (users.id)
    vehicle_id          INT NOT NULL,               -- bağlı olduğu araç (vehicle_profiles.id)
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    national_id         VARCHAR(11)  NOT NULL,      -- TC kimlik — kayıt esnasında alınır
    phone               VARCHAR(20)  NULL,
    birth_date          DATE         NOT NULL,
    notes               TEXT         NULL,
    status              ENUM('pending_docs','active','inactive') NOT NULL DEFAULT 'pending_docs',
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP NULL DEFAULT NULL,

    UNIQUE KEY uq_hostess_national_id  (national_id),
    INDEX idx_hostess_managed_by       (managed_by_user_id),
    INDEX idx_hostess_vehicle          (vehicle_id),
    INDEX idx_hostess_status           (status),
    INDEX idx_hostess_deleted_at       (deleted_at),

    CONSTRAINT fk_hostess_managed_by
      FOREIGN KEY (managed_by_user_id) REFERENCES users(id)
      ON DELETE RESTRICT,

    CONSTRAINT fk_hostess_vehicle
      FOREIGN KEY (vehicle_id) REFERENCES vehicle_profiles(id)
      ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
