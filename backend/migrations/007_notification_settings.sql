
-- Notification Settings Table
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(20) NOT NULL, -- SMTP, TWILIO, WHATSAPP_VIRTUAL
    is_active BOOLEAN DEFAULT FALSE,
    is_demo BOOLEAN DEFAULT TRUE,
    config JSONB,   -- Stores credentials securely in JSON
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed default settings (Demo Mode)
INSERT INTO notification_settings (provider, is_active, is_demo, config) VALUES
('SMTP', true, true, '{"host": "smtp.ethereal.email", "port": 587, "user": "demo", "pass": "demo", "from": "system@baygunes.com"}'),
('TWILIO', false, true, '{"accountSid": "", "authToken": "", "fromPhone": ""}'),
('WHATSAPP', false, true, '{"apiKey": "", "phoneId": ""}');
