
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://pbms_user:pbms_password@localhost:5432/pbms_db',
});

const run = async () => {
  try {
    console.log('🔧 Fixing order_status ENUM...');
    
    // We need to run this in a specific way bc you can't run ALTER TYPE inside a transaction block usually? 
    // Actually ADD VALUE can be run. But cannot be rolled back.
    // IF NOT EXISTS is supported in newer Postgres (v12+).
    
    try {
        await pool.query("ALTER TYPE order_status ADD VALUE 'CANCELLED'");
        console.log("✅ Added 'CANCELLED' to order_status enum.");
    } catch (e) {
        if (e.message.includes("already exists")) {
            console.log("ℹ️ 'CANCELLED' already exists in order_status enum.");
        } else {
            throw e;
        }
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing enum:', err);
    process.exit(1);
  }
};

run();
