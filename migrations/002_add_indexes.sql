-- ==========================================
-- OKUD Migration 002 — Baseline Index'leri
--
-- 001 baseline'ında sadece PRIMARY KEY ve UNIQUE constraint'ler vardı.
-- Kod tabanı geliştikçe şu sütunlarda sık sık WHERE / JOIN yapıldığı
-- görüldü; her sorgunun full table scan yapmaması için bu tekil index'ler
-- eklendi. Uygulanma tarihi: 2026-07-29 (o gün DB'ye elle CREATE INDEX
-- ile eklenmişti, bu dosya baseline kaydıdır).
--
-- MariaDB 10.1+ ve MySQL 8.0.29+ 'ADD INDEX IF NOT EXISTS' destekler.
-- Daha eski MySQL sürümlerinde 'IF NOT EXISTS' kısımlarını elle silmek
-- gerekebilir; runner tekrar çalışırsa 'Duplicate key name' fırlatır.
-- ==========================================

-- ------------------------------------------
-- users
-- ------------------------------------------
-- deleted_at: her sorguya "AND deleted_at IS NULL" eklendiği için sık kullanılıyor
-- is_superadmin: /admin rotalarında ve superadmin kontrolünde WHERE is_superadmin = TRUE
ALTER TABLE users
  ADD INDEX IF NOT EXISTS idx_users_deleted_at    (deleted_at),
  ADD INDEX IF NOT EXISTS idx_users_is_superadmin (is_superadmin);

-- ------------------------------------------
-- companies
-- ------------------------------------------
-- deleted_at: soft-delete filtresi
-- is_active: findPendingApproval (WHERE is_active = FALSE) için
-- company_type: partnership akışında provider/receiver filtresi
ALTER TABLE companies
  ADD INDEX IF NOT EXISTS idx_companies_deleted_at   (deleted_at),
  ADD INDEX IF NOT EXISTS idx_companies_is_active    (is_active),
  ADD INDEX IF NOT EXISTS idx_companies_company_type (company_type);

-- ------------------------------------------
-- company_users
-- ------------------------------------------
-- Not: PK zaten (user_id, company_id). PK'nın ilk sütunu user_id olduğu için
-- 'WHERE user_id = ?' hızlı ama 'WHERE company_id = ?' yavaş — bunun için
-- ayrı index gerekiyor (findManagersByCompanyId gibi sorgular).
-- role_id: nadir de olsa role'e göre JOIN edilebiliyor
-- deleted_at: soft-delete filtresi her yerde
ALTER TABLE company_users
  ADD INDEX IF NOT EXISTS idx_company_users_company_id (company_id),
  ADD INDEX IF NOT EXISTS idx_company_users_role_id    (role_id),
  ADD INDEX IF NOT EXISTS idx_company_users_deleted_at (deleted_at);
