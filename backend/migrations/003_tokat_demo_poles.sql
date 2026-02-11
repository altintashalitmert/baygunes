-- Seed data: Tokat demo poles
-- Date: 2026-02-03

-- Insert 10 demo poles in Tokat
INSERT INTO poles (pole_code, latitude, longitude, city, district, neighborhood, street, sequence_no, status) VALUES
('TOCENGA01', 40.3167, 36.5500, 'Tokat', 'Center', 'Gaziosmanpaşa', 'Atatürk Caddesi', 1, 'AVAILABLE'),
('TOCENGA02', 40.3180, 36.5520, 'Tokat', 'Center', 'Gaziosmanpaşa', 'Atatürk Caddesi', 2, 'AVAILABLE'),
('TOCENGA03', 40.3150, 36.5480, 'Tokat', 'Center', 'Gaziosmanpaşa', 'Cumhuriyet Bulvarı', 3, 'OCCUPIED'),
('TOCENGA04', 40.3200, 36.5550, 'Tokat', 'Center', 'Gaziosmanpaşa', 'İstasyon Caddesi', 4, 'AVAILABLE'),
('TOCENGA05', 40.3140, 36.5460, 'Tokat', 'Center', 'Gaziosmanpaşa', 'Vali Zekai Gümüşdiş', 5, 'MAINTENANCE'),
('TOCENGA06', 40.3220, 36.5580, 'Tokat', 'Center', 'Sulusokak', 'Niksar Caddesi', 6, 'AVAILABLE'),
('TOCENGA07', 40.3130, 36.5440, 'Tokat', 'Center', 'Sulusokak', 'Sivas Caddesi', 7, 'AVAILABLE'),
('TOCENGA08', 40.3250, 36.5600, 'Tokat', 'Center', 'Alipaşa', 'Şehit Pilot Ali', 8, 'INACTIVE'),
('TOCENGA09', 40.3120, 36.5420, 'Tokat', 'Center', 'Alipaşa', 'Gazi Caddesi', 9, 'AVAILABLE'),
('TOCENGA10', 40.3270, 36.5620, 'Tokat', 'Center', 'Alipaşa', 'Mevlana Caddesi', 10, 'AVAILABLE');
