-- Enable PostGIS extension when available.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') THEN
        CREATE EXTENSION IF NOT EXISTS postgis;
    END IF;
END $$;

-- Create enums
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'OPERATOR', 'PRINTER', 'FIELD');
CREATE TYPE pole_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE');
CREATE TYPE order_status AS ENUM ('PENDING', 'PRINTING', 'AWAITING_MOUNT', 'LIVE', 'EXPIRED', 'COMPLETED');
CREATE TYPE file_type AS ENUM ('CONTRACT', 'AD_IMAGE', 'PROOF_MOUNT', 'PROOF_DISMOUNT');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- Poles table
CREATE TABLE poles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pole_code VARCHAR(50) UNIQUE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    city VARCHAR(100),
    district VARCHAR(100),
    neighborhood VARCHAR(100),
    street VARCHAR(255),
    sequence_no INTEGER,
    status pole_status DEFAULT 'AVAILABLE',
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_poles_status ON poles(status);
CREATE INDEX idx_poles_code ON poles(pole_code);
CREATE INDEX idx_poles_deleted_at ON poles(deleted_at);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        CREATE INDEX IF NOT EXISTS idx_poles_location ON poles USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));
    END IF;
END $$;

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pole_id UUID NOT NULL REFERENCES poles(id) ON DELETE RESTRICT,
    client_name VARCHAR(255) NOT NULL,
    client_contact VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status order_status DEFAULT 'PENDING',
    contract_file_url VARCHAR(500),
    ad_image_url VARCHAR(500),
    created_by UUID NOT NULL REFERENCES users(id),
    assigned_printer UUID REFERENCES users(id),
    assigned_field UUID REFERENCES users(id),
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_orders_pole ON orders(pole_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_dates ON orders(start_date, end_date);
CREATE INDEX idx_orders_printer ON orders(assigned_printer);
CREATE INDEX idx_orders_field ON orders(assigned_field);
CREATE INDEX idx_orders_cancelled_at ON orders(cancelled_at);

-- Workflow History table
CREATE TABLE workflow_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status order_status,
    new_status order_status NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workflow_order ON workflow_history(order_id);
CREATE INDEX idx_workflow_timestamp ON workflow_history(timestamp DESC);

-- Pricing Config table
CREATE TABLE pricing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Files table
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    file_type file_type NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    original_name VARCHAR(255),
    file_size INTEGER,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_files_order ON files(order_id);
CREATE INDEX idx_files_type ON files(file_type);

-- Insert default pricing config
INSERT INTO pricing_config (key, value, unit) VALUES
    ('print_price', 500.00, 'TL'),
    ('mount_price', 200.00, 'TL'),
    ('dismount_price', 150.00, 'TL'),
    ('vat_rate', 20.00, '%');
