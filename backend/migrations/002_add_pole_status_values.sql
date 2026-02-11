-- Migration: Add MAINTENANCE and INACTIVE to pole_status enum
-- Date: 2026-02-03

-- Add new enum values
ALTER TYPE pole_status ADD VALUE IF NOT EXISTS 'MAINTENANCE';
ALTER TYPE pole_status ADD VALUE IF NOT EXISTS 'INACTIVE';
