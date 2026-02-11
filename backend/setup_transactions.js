
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://pbms_user:pbms_password@localhost:5432/pbms_db',
});

const run = async () => {
  try {
    console.log('🏗️  Setting up Transactions system...');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Create Enums if not exists
      console.log('Creating enums...');
      try {
        await client.query("CREATE TYPE payment_type AS ENUM ('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHECK')");
      } catch (e) {
         console.log('Enum payment_type might already exist, skipping.');
      }

      // 2. Create Transactions Table
      console.log('Creating transactions table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            order_id UUID REFERENCES orders(id) ON DELETE SET NULL, 
            amount DECIMAL(10, 2) NOT NULL,
            type payment_type NOT NULL,
            description TEXT,
            transaction_date TIMESTAMP DEFAULT NOW(),
            created_by UUID NOT NULL REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Index
      await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)');


      // 3. Add paid_amount context to orders
      console.log('Updating orders table structure...');
      const checkCol = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='orders' AND column_name='paid_amount'
      `);

      if (checkCol.rows.length === 0) {
        await client.query(`
          ALTER TABLE orders ADD COLUMN paid_amount DECIMAL(10, 2) DEFAULT 0
        `);
      }

      await client.query('COMMIT');
      console.log('✅ Transactions system setup complete.');
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
