-- ==========================================
-- OKUD Migration 007 — Notifications
-- Uygulama içi bildirim + e-posta gönderim izi + tekrar koruması
-- ==========================================

CREATE TABLE notifications (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    type            ENUM('doc_expiring','doc_expired') NOT NULL,
    document_id     INT NULL,
    threshold_days  INT NULL,
    title           VARCHAR(200) NOT NULL,
    message         TEXT NOT NULL,
    read_at         TIMESTAMP NULL,
    email_sent_at   TIMESTAMP NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL DEFAULT NULL,

    INDEX idx_notifications_user_id           (user_id),
    INDEX idx_notifications_user_unread       (user_id, read_at),
    INDEX idx_notifications_dedupe            (document_id, type, threshold_days),
    INDEX idx_notifications_deleted_at        (deleted_at),

    CONSTRAINT fk_notifications_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE,
    CONSTRAINT fk_notifications_document
      FOREIGN KEY (document_id) REFERENCES documents(id)
      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
