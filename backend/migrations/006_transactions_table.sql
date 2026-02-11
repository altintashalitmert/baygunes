-- Create Payment Types enum
CREATE TYPE payment_type AS ENUM ('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHECK');

-- Transactions (Payments) table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Payment can be linked to a specific order
    amount DECIMAL(10, 2) NOT NULL,
    type payment_type NOT NULL,
    description TEXT,
    transaction_date TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- Add 'paid_amount' column to orders for easier tracking
ALTER TABLE orders ADD COLUMN paid_amount DECIMAL(10, 2) DEFAULT 0;
