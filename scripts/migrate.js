// scripts/migrate.js
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function main() {
  // Pool DEĞİL — tek bağlantı. Ayrıca multipleStatements=true açık
  // çünkü bir .sql dosyasında birden fazla CREATE/INSERT olabiliyor.
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  // 1) Takip tablosunu (yoksa) kur
  await conn.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      filename   VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `);

  // 2) Zaten uygulanmış dosyaları öğren
  const [appliedRows] = await conn.query('SELECT filename FROM _migrations');
  const applied = new Set(appliedRows.map(r => r.filename));

  // 3) Klasördeki .sql dosyalarını sırayla al
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('migrations/ klasöründe .sql dosyası yok.');
    await conn.end();
    return;
  }

  let ranCount = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ·  ${file}  (zaten uygulanmış)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`→  ${file}  uygulanıyor...`);

    try {
      await conn.query(sql);
      await conn.query('INSERT INTO _migrations (filename) VALUES (?)', [file]);
      console.log(`✓  ${file}  başarılı`);
      ranCount++;
    } catch (err) {
      console.error(`✗  ${file}  HATA:`, err.message);
      await conn.end();
      process.exit(1);
    }
  }

  console.log(ranCount === 0
    ? '\nYeni migration yok, DB güncel.'
    : `\n${ranCount} yeni migration uygulandı.`);

  await conn.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});