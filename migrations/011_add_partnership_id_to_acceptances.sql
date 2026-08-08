-- ==========================================
-- OKUD Migration 011 — contract_acceptances.partnership_id
-- Partnership kabul kayıtlarını iş ortaklığı satırıyla doğrudan ilişkilendirme
-- ==========================================

ALTER TABLE contract_acceptances
  ADD COLUMN partnership_id INT NULL AFTER fleet_connection_id;

ALTER TABLE contract_acceptances
  ADD INDEX idx_acceptance_partnership (partnership_id),
  ADD CONSTRAINT fk_acceptance_partnership
    FOREIGN KEY (partnership_id) REFERENCES company_partnerships(id) ON DELETE SET NULL;
