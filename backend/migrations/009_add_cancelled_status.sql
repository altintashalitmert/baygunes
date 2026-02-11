-- Add CANCELLED status to order_status enum
-- This status is used for overlap checking and order cancellation

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'CANCELLED';
