
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://pbms_user:pbms_password@localhost:5432/pbms_db',
});

const run = async () => {
  try {
    console.log('🏗️  Adding SCHEDULED status...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'SCHEDULED';`);
      await client.query('COMMIT');
      console.log('✅ Status updated.');
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
