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
  `ALTER TABLE poles ADD COLUMN IF NOT EXISTS pole_type VARCHAR(32) NOT NULL DEFAULT 'NORMAL'`,
  `ALTER TABLE poles ADD COLUMN IF NOT EXISTS direction_type VARCHAR(16) NOT NULL DEFAULT 'TEK_YONLU'`,
  `ALTER TABLE poles ADD COLUMN IF NOT EXISTS arm_type VARCHAR(2) NOT NULL DEFAULT 'T'`,
  `DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_poles_direction_type'
      ) THEN
        ALTER TABLE poles
        ADD CONSTRAINT chk_poles_direction_type
        CHECK (direction_type IN ('TEK_YONLU', 'CIFT_YONLU'));
      END IF;
    END $$`,
  `DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_poles_arm_type'
      ) THEN
        ALTER TABLE poles
        ADD CONSTRAINT chk_poles_arm_type
        CHECK (arm_type IN ('L', 'T'));
      END IF;
    END $$`,
  `CREATE INDEX IF NOT EXISTS idx_poles_neighborhood ON poles(neighborhood)`,
  `CREATE INDEX IF NOT EXISTS idx_poles_type ON poles(pole_type)`,
  `CREATE INDEX IF NOT EXISTS idx_poles_direction_type ON poles(direction_type)`,
  `CREATE INDEX IF NOT EXISTS idx_poles_arm_type ON poles(arm_type)`,
  `CREATE INDEX IF NOT EXISTS idx_poles_deleted_at ON poles(deleted_at)`,

  // Temporary mobile capture area for field teams.
  // Use TEXT ids for compatibility with legacy databases that may use TEXT PKs.
  `CREATE TABLE IF NOT EXISTS pole_capture_staging (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      city VARCHAR(80) NOT NULL DEFAULT 'Tokat',
      district VARCHAR(120) NOT NULL,
      neighborhood VARCHAR(160) NOT NULL,
      street VARCHAR(200) NOT NULL,
      direction_type VARCHAR(16) NOT NULL DEFAULT 'TEK_YONLU',
      arm_type VARCHAR(2) NOT NULL DEFAULT 'T',
      lighting_type VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
      generated_code VARCHAR(255) NOT NULL,
      source VARCHAR(16) NOT NULL DEFAULT 'MAP_TAP',
      gps_accuracy_m DOUBLE PRECISION,
      captured_by TEXT,
      notes TEXT,
      captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      imported_pole_id TEXT,
      imported_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
  `ALTER TABLE pole_capture_staging ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS city VARCHAR(80) NOT NULL DEFAULT 'Tokat'`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS district VARCHAR(120)`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(160)`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS street VARCHAR(200)`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS direction_type VARCHAR(16) NOT NULL DEFAULT 'TEK_YONLU'`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS arm_type VARCHAR(2) NOT NULL DEFAULT 'T'`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS lighting_type VARCHAR(16) NOT NULL DEFAULT 'NORMAL'`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS generated_code VARCHAR(255)`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'MAP_TAP'`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS gps_accuracy_m DOUBLE PRECISION`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS captured_by TEXT`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS notes TEXT`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS imported_pole_id TEXT`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE pole_capture_staging ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_pole_capture_staging_generated_code_unique
    ON pole_capture_staging(generated_code)`,
  `CREATE INDEX IF NOT EXISTS idx_pole_capture_staging_captured_at
    ON pole_capture_staging(captured_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_pole_capture_staging_imported_at
    ON pole_capture_staging(imported_at)`,
  `CREATE INDEX IF NOT EXISTS idx_pole_capture_staging_neighborhood
    ON pole_capture_staging(neighborhood)`,
  `DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_capture_direction_type'
      ) THEN
        ALTER TABLE pole_capture_staging
        ADD CONSTRAINT chk_capture_direction_type
        CHECK (direction_type IN ('TEK_YONLU', 'CIFT_YONLU'));
      END IF;
    END $$`,
  `DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_capture_arm_type'
      ) THEN
        ALTER TABLE pole_capture_staging
        ADD CONSTRAINT chk_capture_arm_type
        CHECK (arm_type IN ('L', 'T'));
      END IF;
    END $$`,
  `DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_capture_lighting_type'
      ) THEN
        ALTER TABLE pole_capture_staging
        ADD CONSTRAINT chk_capture_lighting_type
        CHECK (lighting_type IN ('NORMAL', 'AYDINLATMALI'));
      END IF;
    END $$`,

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
  `DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'login_attempts' AND column_name = 'id'
      ) THEN
        EXECUTE 'ALTER TABLE login_attempts ALTER COLUMN id SET DEFAULT gen_random_uuid()';
      END IF;
    END $$`,
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
      try {
        await client.query(statement);
      } catch (error) {
        // Legacy databases can have type mismatches (e.g. TEXT vs UUID FKs).
        // Skip incompatible statements and continue applying the rest.
        console.warn('⚠️ Schema compatibility statement skipped:', error?.message || error);
      }
    }

    schemaChecked = true;
    console.log('✅ Schema compatibility checks completed');
  } finally {
    client.release();
  }
};
