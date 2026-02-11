-- Create Account Types enum
CREATE TYPE account_type AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- Accounts (Customers/Clients) table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type account_type DEFAULT 'CORPORATE',
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    tax_no VARCHAR(50),
    tax_office VARCHAR(100),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_accounts_company ON accounts(company_name);
CREATE INDEX idx_accounts_email ON accounts(email);

-- Add account_id and price columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0;
