-- ==========================================
-- OKUD Migration 025 — Davet-zamanı filo scope seçimi
--
-- Provider kurum, iş ortaklığı daveti üretirken kendi filosundan hangi
-- üyelerin bu davet kapsamında yer alacağını seçer. Davet kabul edildiğinde
-- bu scope, oluşan partnership'in scope'una kopyalanır (partnership_fleet_scopes).
--
-- Semantik: satır VAR = dahil, YOK = dahil DEĞİL (inclusion listesi).
-- Böylece kooperatif her müşteri için farklı bir alt-filo hazırlayabilir.
-- ==========================================

CREATE TABLE partnership_invitation_fleet_scopes (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    invitation_id      INT NOT NULL,
    target_type        ENUM('driver_profile','vehicle_profile') NOT NULL,
    target_id          INT NOT NULL,
    added_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by_user_id   INT NULL DEFAULT NULL,

    UNIQUE KEY uq_inv_scope (invitation_id, target_type, target_id),
    INDEX idx_inv_scope_invitation (invitation_id),

    CONSTRAINT fk_inv_scope_invitation
        FOREIGN KEY (invitation_id) REFERENCES partnership_invitations(id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_scope_added_by
        FOREIGN KEY (added_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
