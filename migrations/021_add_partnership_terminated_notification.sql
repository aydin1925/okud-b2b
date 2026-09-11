-- ==========================================
-- OKUD Migration 021 — Partnership terminated bildirim tipi
--
-- Bir kurum iş ortaklığını feshettiğinde karşı taraf manager'larına
-- "X kurumu ortaklığı feshetti" bildirimi düşer. Fesih eden opsiyonel
-- olarak gerekçe girebilir; gerekçe varsa bildirimin metnine eklenir.
-- ==========================================

ALTER TABLE notifications
    MODIFY COLUMN type
    ENUM('doc_expiring','doc_expired','partnership_rejected','partnership_readiness_alert','partnership_terminated') NOT NULL;
