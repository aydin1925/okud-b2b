-- ==========================================
-- OKUD Migration 004 — Documents
-- Şoför & araç belgelerini (ehliyet, SRC, ruhsat, sigorta vb.) tutan polymorphic tablo
-- owner_type + owner_id ile driver_profile veya vehicle_profile'a bağlanır
-- ==========================================

CREATE TABLE documents (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    owner_type          ENUM('driver_profile','vehicle_profile') NOT NULL,
    owner_id            INT NOT NULL,
    document_type       VARCHAR(50) NOT NULL,
    file_path           VARCHAR(500) NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    mime_type           VARCHAR(100) NOT NULL,
    file_size           INT NOT NULL,
    expires_at          DATE NULL,
    verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
    verified_by         INT NULL,
    verified_at         TIMESTAMP NULL,
    rejection_reason    TEXT NULL,
    uploaded_by         INT NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP NULL DEFAULT NULL,

    INDEX idx_documents_owner       (owner_type, owner_id),
    INDEX idx_documents_status      (verification_status),
    INDEX idx_documents_expires_at  (expires_at),
    INDEX idx_documents_type        (document_type),
    INDEX idx_documents_deleted_at  (deleted_at),

    CONSTRAINT fk_documents_uploaded_by
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
      ON DELETE RESTRICT,

    CONSTRAINT fk_documents_verified_by
      FOREIGN KEY (verified_by) REFERENCES users(id)
      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
