-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Anamakine: 127.0.0.1
-- Üretim Zamanı: 08 Ağu 2026, 17:49:29
-- Sunucu sürümü: 10.4.32-MariaDB
-- PHP Sürümü: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Veritabanı: `okud_db`
--

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `companies`
--

CREATE TABLE `companies` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `tax_number` varchar(50) NOT NULL,
  `company_type` enum('provider','receiver') NOT NULL,
  `is_active` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `company_partnerships`
--

CREATE TABLE `company_partnerships` (
  `id` int(11) NOT NULL,
  `provider_company_id` int(11) NOT NULL,
  `receiver_company_id` int(11) NOT NULL,
  `invitation_id` int(11) DEFAULT NULL,
  `started_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `terminated_at` timestamp NULL DEFAULT NULL,
  `terminated_by_user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `company_users`
--

CREATE TABLE `company_users` (
  `user_id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `connection_requests`
--

CREATE TABLE `connection_requests` (
  `id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `target_type` enum('driver_profile','vehicle_profile') NOT NULL,
  `code` varchar(10) NOT NULL,
  `label` varchar(100) DEFAULT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('pending','consumed','expired','cancelled','rejected') NOT NULL DEFAULT 'pending',
  `consumed_by` int(11) DEFAULT NULL,
  `consumed_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `contract_acceptances`
--

CREATE TABLE `contract_acceptances` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `fleet_connection_id` int(11) DEFAULT NULL,
  `partnership_id` int(11) DEFAULT NULL,
  `contract_type` enum('driver','vehicle_owner','driver_kvkk','vehicle_owner_kvkk','partnership') NOT NULL,
  `template_id` int(11) DEFAULT NULL,
  `title_snapshot` varchar(200) NOT NULL,
  `content_snapshot` text NOT NULL,
  `accepted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `contract_templates`
--

CREATE TABLE `contract_templates` (
  `id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `contract_type` enum('driver','vehicle_owner','driver_kvkk','vehicle_owner_kvkk','partnership') NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `owner_type` enum('driver_profile','vehicle_profile') NOT NULL,
  `owner_id` int(11) NOT NULL,
  `document_type` varchar(50) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_size` int(11) NOT NULL,
  `expires_at` date DEFAULT NULL,
  `verification_status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `uploaded_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `driver_profiles`
--

CREATE TABLE `driver_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `national_id` varchar(11) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `birth_date` date NOT NULL,
  `license_class` varchar(10) NOT NULL,
  `status` enum('pending_docs','active','inactive') NOT NULL DEFAULT 'pending_docs',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `driver_profile_update_requests`
--

CREATE TABLE `driver_profile_update_requests` (
  `id` int(11) NOT NULL,
  `driver_profile_id` int(11) NOT NULL,
  `requested_by_user_id` int(11) NOT NULL,
  `requested_national_id` varchar(11) DEFAULT NULL,
  `requested_birth_date` date DEFAULT NULL,
  `requested_license_class` varchar(10) DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `reviewed_by_user_id` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `fleet_connections`
--

CREATE TABLE `fleet_connections` (
  `id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `target_type` enum('driver_profile','vehicle_profile') NOT NULL,
  `target_id` int(11) NOT NULL,
  `connection_request_id` int(11) DEFAULT NULL,
  `connected_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `disconnected_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `company_id` int(11) DEFAULT NULL,
  `type` enum('doc_expiring','doc_expired') NOT NULL,
  `document_id` int(11) DEFAULT NULL,
  `threshold_days` int(11) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `email_sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `partnership_invitations`
--

CREATE TABLE `partnership_invitations` (
  `id` int(11) NOT NULL,
  `initiator_company_id` int(11) NOT NULL,
  `target_company_type` enum('provider','receiver') NOT NULL,
  `code` varchar(10) NOT NULL,
  `label` varchar(200) DEFAULT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('pending','consumed','expired','cancelled','rejected') NOT NULL DEFAULT 'pending',
  `consumed_by` int(11) DEFAULT NULL,
  `consumed_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `permissions`
--

CREATE TABLE `permissions` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `module` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Tablo döküm verisi `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `module`, `created_at`, `updated_at`) VALUES
(1, 'verify_document', 'documents', '2026-08-08 15:48:07', '2026-08-08 15:48:07'),
(2, 'reject_document', 'documents', '2026-08-08 15:48:07', '2026-08-08 15:48:07'),
(3, 'upload_document', 'documents', '2026-08-08 15:48:07', '2026-08-08 15:48:07'),
(4, 'view_company_dashboard', 'dashboard', '2026-08-08 15:48:07', '2026-08-08 15:48:07');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Tablo döküm verisi `roles`
--

INSERT INTO `roles` (`id`, `name`, `display_name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'company_admin', 'Kurum Yöneticisi', NULL, '2026-08-08 15:48:07', '2026-08-08 15:48:07'),
(2, 'company_moderator', 'Kurum Moderatörü', NULL, '2026-08-08 15:48:07', '2026-08-08 15:48:07'),
(3, 'driver', 'Şoför', NULL, '2026-08-08 15:48:07', '2026-08-08 15:48:07'),
(4, 'vehicle_owner', 'Araç Sahibi', NULL, '2026-08-08 15:48:07', '2026-08-08 15:48:07');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_superadmin` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Tablo döküm verisi `users`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `password_hash`, `is_superadmin`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Sistem', 'Yöneticisi', 'admin@okud.com', '$2b$10$tQUccxdzTISDz5WSVetacuyw998x.uZPYYzWte4RYfeaB20qEDBZy', 1, '2026-08-08 15:48:29', '2026-08-08 15:48:29', NULL);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `vehicle_profiles`
--

CREATE TABLE `vehicle_profiles` (
  `id` int(11) NOT NULL,
  `owner_user_id` int(11) NOT NULL,
  `plate_number` varchar(20) NOT NULL,
  `brand` varchar(50) NOT NULL,
  `model` varchar(50) NOT NULL,
  `year` int(11) NOT NULL,
  `vehicle_type` enum('minibus','midibus','otobus','van','binek') NOT NULL,
  `capacity` int(11) NOT NULL,
  `status` enum('pending_docs','active','inactive') NOT NULL DEFAULT 'pending_docs',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `vehicle_profile_update_requests`
--

CREATE TABLE `vehicle_profile_update_requests` (
  `id` int(11) NOT NULL,
  `vehicle_profile_id` int(11) NOT NULL,
  `requested_by_user_id` int(11) NOT NULL,
  `requested_plate_number` varchar(20) DEFAULT NULL,
  `requested_brand` varchar(50) DEFAULT NULL,
  `requested_model` varchar(50) DEFAULT NULL,
  `requested_year` int(11) DEFAULT NULL,
  `requested_vehicle_type` enum('minibus','midibus','otobus','van','binek') DEFAULT NULL,
  `requested_capacity` int(11) DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `reviewed_by_user_id` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `_migrations`
--

CREATE TABLE `_migrations` (
  `id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Tablo döküm verisi `_migrations`
--

INSERT INTO `_migrations` (`id`, `filename`, `applied_at`) VALUES
(1, '001_initial_schema.sql', '2026-08-08 15:48:07'),
(2, '002_add_indexes.sql', '2026-08-08 15:48:07'),
(3, '003_create_driver_profiles.sql', '2026-08-08 15:48:07'),
(4, '004_create_documents.sql', '2026-08-08 15:48:07'),
(5, '005_create_vehicle_profiles.sql', '2026-08-08 15:48:07'),
(6, '006_create_connections.sql', '2026-08-08 15:48:07'),
(7, '007_create_notifications.sql', '2026-08-08 15:48:07'),
(8, '008_create_contract_templates.sql', '2026-08-08 15:48:07'),
(9, '009_add_kvkk_and_acceptances.sql', '2026-08-08 15:48:07'),
(10, '010_partnerships.sql', '2026-08-08 15:48:07'),
(11, '011_add_partnership_id_to_acceptances.sql', '2026-08-08 15:48:07'),
(12, '012_driver_profile_updates.sql', '2026-08-08 15:48:07'),
(13, '013_vehicle_profile_updates.sql', '2026-08-08 15:48:07'),
(14, '014_extend_notifications.sql', '2026-08-08 15:48:08');

--
-- Dökümü yapılmış tablolar için indeksler
--

--
-- Tablo için indeksler `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tax_number` (`tax_number`),
  ADD KEY `idx_companies_deleted_at` (`deleted_at`),
  ADD KEY `idx_companies_is_active` (`is_active`),
  ADD KEY `idx_companies_company_type` (`company_type`);

--
-- Tablo için indeksler `company_partnerships`
--
ALTER TABLE `company_partnerships`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_partnership_provider` (`provider_company_id`),
  ADD KEY `idx_partnership_receiver` (`receiver_company_id`),
  ADD KEY `idx_partnership_active_pair` (`provider_company_id`,`receiver_company_id`,`terminated_at`),
  ADD KEY `fk_partnership_invitation` (`invitation_id`),
  ADD KEY `fk_partnership_terminated_by` (`terminated_by_user_id`);

--
-- Tablo için indeksler `company_users`
--
ALTER TABLE `company_users`
  ADD PRIMARY KEY (`user_id`,`company_id`),
  ADD KEY `idx_company_users_company_id` (`company_id`),
  ADD KEY `idx_company_users_role_id` (`role_id`),
  ADD KEY `idx_company_users_deleted_at` (`deleted_at`);

--
-- Tablo için indeksler `connection_requests`
--
ALTER TABLE `connection_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conn_req_code` (`code`),
  ADD KEY `idx_conn_req_company_status` (`company_id`,`status`),
  ADD KEY `idx_conn_req_deleted_at` (`deleted_at`),
  ADD KEY `fk_conn_req_created_by` (`created_by`),
  ADD KEY `fk_conn_req_consumed_by` (`consumed_by`);

--
-- Tablo için indeksler `contract_acceptances`
--
ALTER TABLE `contract_acceptances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_acceptance_user` (`user_id`),
  ADD KEY `idx_acceptance_fleet_connection` (`fleet_connection_id`),
  ADD KEY `idx_acceptance_company_type` (`company_id`,`contract_type`),
  ADD KEY `idx_acceptance_deleted_at` (`deleted_at`),
  ADD KEY `fk_acceptance_template` (`template_id`),
  ADD KEY `idx_acceptance_partnership` (`partnership_id`);

--
-- Tablo için indeksler `contract_templates`
--
ALTER TABLE `contract_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_contract_templates_company_type` (`company_id`,`contract_type`),
  ADD KEY `idx_contract_templates_deleted_at` (`deleted_at`);

--
-- Tablo için indeksler `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_documents_owner` (`owner_type`,`owner_id`),
  ADD KEY `idx_documents_status` (`verification_status`),
  ADD KEY `idx_documents_expires_at` (`expires_at`),
  ADD KEY `idx_documents_type` (`document_type`),
  ADD KEY `idx_documents_deleted_at` (`deleted_at`),
  ADD KEY `fk_documents_uploaded_by` (`uploaded_by`),
  ADD KEY `fk_documents_verified_by` (`verified_by`);

--
-- Tablo için indeksler `driver_profiles`
--
ALTER TABLE `driver_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_driver_profiles_user_id` (`user_id`),
  ADD UNIQUE KEY `uq_driver_profiles_national_id` (`national_id`),
  ADD KEY `idx_driver_profiles_status` (`status`),
  ADD KEY `idx_driver_profiles_deleted_at` (`deleted_at`);

--
-- Tablo için indeksler `driver_profile_update_requests`
--
ALTER TABLE `driver_profile_update_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_dpur_profile_status` (`driver_profile_id`,`status`),
  ADD KEY `idx_dpur_status` (`status`),
  ADD KEY `idx_dpur_deleted_at` (`deleted_at`),
  ADD KEY `fk_dpur_requested_by` (`requested_by_user_id`),
  ADD KEY `fk_dpur_reviewed_by` (`reviewed_by_user_id`);

--
-- Tablo için indeksler `fleet_connections`
--
ALTER TABLE `fleet_connections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_fleet_conn_company` (`company_id`),
  ADD KEY `idx_fleet_conn_target` (`target_type`,`target_id`),
  ADD KEY `idx_fleet_conn_active` (`company_id`,`target_type`,`target_id`,`disconnected_at`),
  ADD KEY `fk_fleet_conn_request` (`connection_request_id`);

--
-- Tablo için indeksler `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user_id` (`user_id`),
  ADD KEY `idx_notifications_user_unread` (`user_id`,`read_at`),
  ADD KEY `idx_notifications_dedupe` (`document_id`,`type`,`threshold_days`),
  ADD KEY `idx_notifications_deleted_at` (`deleted_at`),
  ADD KEY `idx_notifications_company_id` (`company_id`),
  ADD KEY `idx_notifications_dedupe_v2` (`document_id`,`type`,`threshold_days`,`user_id`);

--
-- Tablo için indeksler `partnership_invitations`
--
ALTER TABLE `partnership_invitations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_partnership_inv_code` (`code`),
  ADD KEY `idx_partnership_inv_company_status` (`initiator_company_id`,`status`),
  ADD KEY `idx_partnership_inv_deleted_at` (`deleted_at`),
  ADD KEY `fk_partnership_inv_created_by` (`created_by`),
  ADD KEY `fk_partnership_inv_consumed_by` (`consumed_by`);

--
-- Tablo için indeksler `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Tablo için indeksler `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Tablo için indeksler `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `permission_id` (`permission_id`);

--
-- Tablo için indeksler `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_deleted_at` (`deleted_at`),
  ADD KEY `idx_users_is_superadmin` (`is_superadmin`);

--
-- Tablo için indeksler `vehicle_profiles`
--
ALTER TABLE `vehicle_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_vehicle_profiles_plate_number` (`plate_number`),
  ADD KEY `idx_vehicle_profiles_owner_user_id` (`owner_user_id`),
  ADD KEY `idx_vehicle_profiles_status` (`status`),
  ADD KEY `idx_vehicle_profiles_deleted_at` (`deleted_at`);

--
-- Tablo için indeksler `vehicle_profile_update_requests`
--
ALTER TABLE `vehicle_profile_update_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vpur_profile_status` (`vehicle_profile_id`,`status`),
  ADD KEY `idx_vpur_status` (`status`),
  ADD KEY `idx_vpur_deleted_at` (`deleted_at`),
  ADD KEY `fk_vpur_requested_by` (`requested_by_user_id`),
  ADD KEY `fk_vpur_reviewed_by` (`reviewed_by_user_id`);

--
-- Tablo için indeksler `_migrations`
--
ALTER TABLE `_migrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `filename` (`filename`);

--
-- Dökümü yapılmış tablolar için AUTO_INCREMENT değeri
--

--
-- Tablo için AUTO_INCREMENT değeri `companies`
--
ALTER TABLE `companies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `company_partnerships`
--
ALTER TABLE `company_partnerships`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `connection_requests`
--
ALTER TABLE `connection_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `contract_acceptances`
--
ALTER TABLE `contract_acceptances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `contract_templates`
--
ALTER TABLE `contract_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `driver_profiles`
--
ALTER TABLE `driver_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `driver_profile_update_requests`
--
ALTER TABLE `driver_profile_update_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `fleet_connections`
--
ALTER TABLE `fleet_connections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `partnership_invitations`
--
ALTER TABLE `partnership_invitations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Tablo için AUTO_INCREMENT değeri `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Tablo için AUTO_INCREMENT değeri `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `vehicle_profiles`
--
ALTER TABLE `vehicle_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `vehicle_profile_update_requests`
--
ALTER TABLE `vehicle_profile_update_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `_migrations`
--
ALTER TABLE `_migrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Dökümü yapılmış tablolar için kısıtlamalar
--

--
-- Tablo kısıtlamaları `company_partnerships`
--
ALTER TABLE `company_partnerships`
  ADD CONSTRAINT `fk_partnership_invitation` FOREIGN KEY (`invitation_id`) REFERENCES `partnership_invitations` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_partnership_provider` FOREIGN KEY (`provider_company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_partnership_receiver` FOREIGN KEY (`receiver_company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_partnership_terminated_by` FOREIGN KEY (`terminated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Tablo kısıtlamaları `company_users`
--
ALTER TABLE `company_users`
  ADD CONSTRAINT `company_users_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `company_users_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `company_users_ibfk_3` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);

--
-- Tablo kısıtlamaları `connection_requests`
--
ALTER TABLE `connection_requests`
  ADD CONSTRAINT `fk_conn_req_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_conn_req_consumed_by` FOREIGN KEY (`consumed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_conn_req_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Tablo kısıtlamaları `contract_acceptances`
--
ALTER TABLE `contract_acceptances`
  ADD CONSTRAINT `fk_acceptance_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_acceptance_fleet_connection` FOREIGN KEY (`fleet_connection_id`) REFERENCES `fleet_connections` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_acceptance_partnership` FOREIGN KEY (`partnership_id`) REFERENCES `company_partnerships` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_acceptance_template` FOREIGN KEY (`template_id`) REFERENCES `contract_templates` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_acceptance_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `contract_templates`
--
ALTER TABLE `contract_templates`
  ADD CONSTRAINT `fk_contract_templates_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `fk_documents_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_documents_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Tablo kısıtlamaları `driver_profiles`
--
ALTER TABLE `driver_profiles`
  ADD CONSTRAINT `fk_driver_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `driver_profile_update_requests`
--
ALTER TABLE `driver_profile_update_requests`
  ADD CONSTRAINT `fk_dpur_driver_profile` FOREIGN KEY (`driver_profile_id`) REFERENCES `driver_profiles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_dpur_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_dpur_reviewed_by` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Tablo kısıtlamaları `fleet_connections`
--
ALTER TABLE `fleet_connections`
  ADD CONSTRAINT `fk_fleet_conn_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_fleet_conn_request` FOREIGN KEY (`connection_request_id`) REFERENCES `connection_requests` (`id`) ON DELETE SET NULL;

--
-- Tablo kısıtlamaları `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_notifications_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `partnership_invitations`
--
ALTER TABLE `partnership_invitations`
  ADD CONSTRAINT `fk_partnership_inv_consumed_by` FOREIGN KEY (`consumed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_partnership_inv_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_partnership_inv_initiator` FOREIGN KEY (`initiator_company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `vehicle_profiles`
--
ALTER TABLE `vehicle_profiles`
  ADD CONSTRAINT `fk_vehicle_profiles_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `vehicle_profile_update_requests`
--
ALTER TABLE `vehicle_profile_update_requests`
  ADD CONSTRAINT `fk_vpur_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_vpur_reviewed_by` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_vpur_vehicle_profile` FOREIGN KEY (`vehicle_profile_id`) REFERENCES `vehicle_profiles` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
