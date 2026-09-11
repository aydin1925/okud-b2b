-- ==========================================
-- OKUD Migration 022 — Boşta hostes desteği
--
-- Bir araç filodan çıkarıldığında (soft delete), o araca bağlı aktif
-- hostesin kaydı silinmez; sadece vehicle_id NULL yapılır ("boşta").
-- Kullanıcı boştaki hostesi başka bir araca atayabilir.
-- Bunu mümkün kılmak için vehicle_id kolonunu NULL'lanabilir yap.
-- FK zaten ON DELETE RESTRICT — vehicle_profiles hard delete edilmiyor,
-- sadece soft delete olduğu için FK constraint bozulmaz.
-- ==========================================

ALTER TABLE hostess_profiles
    MODIFY COLUMN vehicle_id INT NULL;
