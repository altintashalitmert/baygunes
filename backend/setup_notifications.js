
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://pbms_user:pbms_password@localhost:5432/pbms_db',
});

const run = async () => {
  try {
    console.log('🏗️  Setting up Notification System...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      console.log('Creating notification_settings table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS notification_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider VARCHAR(20) NOT NULL, -- SMTP, TWILIO, WHATSAPP
          is_active BOOLEAN DEFAULT FALSE,
          is_demo BOOLEAN DEFAULT TRUE,
          config JSONB,
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Seed Defaults if empty
      const check = await client.query('SELECT * FROM notification_settings');
      if (check.rows.length === 0) {
        console.log('Seeding default demo settings...');
        await client.query(`
          INSERT INTO notification_settings (provider, is_active, is_demo, config) VALUES
          ('SMTP', true, true, '{"host": "smtp.ethereal.email", "port": 587, "user": "demo", "pass": "demo", "from": "system@baygunes.com"}'),
          ('TWILIO', false, true, '{"accountSid": "", "authToken": "", "fromPhone": ""}'),
          ('WHATSAPP', false, true, '{"apiKey": "", "phoneId": ""}')
        `);
      }

      await client.query('COMMIT');
      console.log('✅ Notification system setup complete.');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('❌ Migration failed:', e);
    } finally {
      client.release();
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

run();
