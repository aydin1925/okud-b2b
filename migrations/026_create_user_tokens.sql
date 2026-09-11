-- 026_create_user_tokens.sql
-- Şifre sıfırlama + e-posta doğrulama için tek kullanımlık, süresi olan token'lar.
-- Ham token asla saklanmaz — sadece sha256 hash'i tutulur.
-- Aynı motoru ileride 2FA, davet linki, magic link için de kullanabiliriz (type ekleyerek).

CREATE TABLE IF NOT EXISTS user_tokens (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id      INT NOT NULL,
  type         ENUM('password_reset','email_verification') NOT NULL,
  token_hash   CHAR(64) NOT NULL,
  expires_at   DATETIME NOT NULL,
  used_at      DATETIME NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_token_hash (token_hash),
  KEY idx_user_type_used (user_id, type, used_at),
  KEY idx_expires (expires_at),

  CONSTRAINT fk_user_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Kullanıcının e-posta doğrulama durumu — NULL = doğrulanmamış, DATETIME = doğrulandığı an.
-- Yumuşak yol: doğrulanmamış kullanıcı sisteme girebilir ama üstte uyarı bandı görür.
ALTER TABLE users
  ADD COLUMN email_verified_at TIMESTAMP NULL AFTER password_hash;
