-- 027_add_driver_and_vehicle_target.sql
-- Feature B: Esnaf şoför (kendi aracının sahibi) tek davetle hem şoför hem araç
-- olarak filoya katılabilsin. connection_requests.target_type'a yeni bir değer:
--   'driver_and_vehicle'
-- fleet_connections DEĞİŞMEZ — kombine redeem arka planda iki ayrı satır oluşturur
-- (biri driver_profile, biri vehicle_profile), böylece mevcut esneklik korunur.

ALTER TABLE connection_requests
  MODIFY COLUMN target_type
    ENUM('driver_profile','vehicle_profile','driver_and_vehicle') NOT NULL;
