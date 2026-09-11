-- ==========================================
-- OKUD Migration 020 — Partnership readiness bildirim tipi
--
-- Cron'un günlük taramasında, aktif iş ortaklıklarındaki karşı tarafın
-- filosunda receiver'ın belge şablonuna uymayan üye çıkarsa, receiver
-- manager'larına özet bildirim gönderilir. Bunun için yeni ENUM değeri.
-- ==========================================

ALTER TABLE notifications
    MODIFY COLUMN type
    ENUM('doc_expiring','doc_expired','partnership_rejected','partnership_readiness_alert') NOT NULL;
