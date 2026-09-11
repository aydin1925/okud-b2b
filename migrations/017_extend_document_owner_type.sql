-- ==========================================
-- OKUD Migration 017 — documents.owner_type genişletme
--
-- Polymorphic ownership pattern hostes profillerini de kapsasın diye
-- owner_type ENUM'una 'hostess_profile' ekliyoruz.
-- ENUM alanları için MODIFY COLUMN gerekiyor — ADD kabul etmez.
-- ==========================================

ALTER TABLE documents
    MODIFY COLUMN owner_type
    ENUM('driver_profile','vehicle_profile','hostess_profile') NOT NULL;
