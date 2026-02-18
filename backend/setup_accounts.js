
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://pbms_user:pbms_password@localhost:5432/pbms_db',
});

const run = async () => {
  try {
    console.log('🏗️  Setting up Accounts (Cari Hesaplar) system...');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Ensure gen_random_uuid() is available for UUID defaults.
      await client.query(`
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pgcrypto') THEN
            CREATE EXTENSION IF NOT EXISTS pgcrypto;
          END IF;
        END $$;
      `);

      // 1. Create accounts table
      console.log('Creating accounts table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(20) DEFAULT 'CORPORATE', -- INDIVIDUAL or CORPORATE
          company_name VARCHAR(255),
          contact_name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          tax_no VARCHAR(50),
          tax_office VARCHAR(100),
          address TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Add account_id to orders
      console.log('Adding account_id to orders...');
      // Check if column exists first
      const checkCol = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='orders' AND column_name='account_id'
      `);

      if (checkCol.rows.length === 0) {
        await client.query(`
          ALTER TABLE orders 
          ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
          ADD COLUMN price DECIMAL(10,2) DEFAULT 0
        `);
      }

      await client.query('COMMIT');
      console.log('✅ Accounts system setup complete.');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('❌ Migration failed:', e);
      process.exit(1);
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
