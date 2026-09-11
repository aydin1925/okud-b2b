-- ==========================================
-- OKUD Migration 019 — notifications.type ENUM genişletme
--
-- İş ortaklığı davetinin reddedilmesi durumunda, ret sebebinin (filo
-- belge eksiklerinin) otomatik mesajlanabilmesi için yeni bir bildirim
-- tipi. Provider kurumun manager'larına düşer.
-- ==========================================

ALTER TABLE notifications
    MODIFY COLUMN type
    ENUM('doc_expiring','doc_expired','partnership_rejected') NOT NULL;
