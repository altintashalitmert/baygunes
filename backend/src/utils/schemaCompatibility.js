import pool from './prisma.js';

let schemaChecked = false;

const STATEMENTS = [
  // Legacy installs may have UUID primary keys without DEFAULT values.
  // Enforce defaults so inserts remain compatible with old schemas.
  `DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'poles' AND column_name = 'id'
      ) THEN
        EXECUTE 'ALTER TABLE poles ALTER COLUMN id SET DEFAULT gen_random_uuid()';
      END IF;
    END $$`,
  `DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'id'
      ) THEN
        EXECUTE 'ALTER TABLE orders ALTER COLUMN id SET DEFAULT gen_random_uuid()';
      END IF;
    END $$`,
  `DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'id'
      ) THEN
        EXECUTE 'ALTER TABLE files ALTER COLUMN id SET DEFAULT gen_random_uuid()';
      END IF;
    END $$`,
  `DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'workflow_history' AND column_name = 'id'
      ) THEN
        EXECUTE 'ALTER TABLE workflow_history ALTER COLUMN id SET DEFAULT gen_random_uuid()';
      END IF;
    END $$`,

  // Soft-delete support used by poles/report endpoints.
  `ALTER TABLE poles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`,
  `CREATE INDEX IF NOT EXISTS idx_poles_deleted_at ON poles(deleted_at)`,

  // Notification preferences query depends on this column.
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE`,

  // Cancellation fields are used by order workflows.
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by UUID`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at ON orders(cancelled_at)`,

  // Auth flows (rate limit + reset password).
  `CREATE TABLE IF NOT EXISTS login_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      success BOOLEAN NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address)`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at)`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)`,
];

export const ensureSchemaCompatibility = async () => {
  if (schemaChecked) return;

  const client = await pool.connect();
  try {
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pgcrypto') THEN
          CREATE EXTENSION IF NOT EXISTS pgcrypto;
        END IF;
      END $$;
    `);

    for (const statement of STATEMENTS) {
      await client.query(statement);
    }

    schemaChecked = true;
    console.log('✅ Schema compatibility checks completed');
  } finally {
    client.release();
  }
};
