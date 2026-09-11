-- ==========================================
-- OKUD Migration 015 — 'insurance' → 'traffic_insurance'
--
-- Neden:
--   Sistem başlangıçta tek "insurance" belge tipiyle çalışıyordu; ayrımı belirsizdi
--   (trafik mi, kasko/koltuk mu). Kurumsal senaryoda ayrım gerektiği için:
--     - insurance         → traffic_insurance (yeniden adlandırma)
--     - yeni: seat_insurance (Koltuk Sigortası)
--
--   documents.document_type VARCHAR(50) — ENUM değil, veri güncellemesi
--   dışında şema müdahalesi gerekmez.
-- ==========================================

UPDATE documents
   SET document_type = 'traffic_insurance'
 WHERE document_type = 'insurance';
