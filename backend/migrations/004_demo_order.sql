-- Add demo order to one of the Tokat poles
-- Date: 2026-02-03

-- First, get a user ID for created_by
DO $$
DECLARE
    admin_user_id UUID;
    pole_id UUID;
BEGIN
    -- Get admin user
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@pbms.com' LIMIT 1;
    
    -- Get TOCENGA03 pole
    SELECT id INTO pole_id FROM poles WHERE pole_code = 'TOCENGA03' LIMIT 1;
    
    -- Insert demo order
    INSERT INTO orders (
        pole_id,
        client_name,
        client_contact,
        start_date,
        end_date,
        status,
        created_by
    ) VALUES (
        pole_id,
        'Coca Cola Turkey',
        '+90 555 123 4567',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '7 days',
        'LIVE',
        admin_user_id
    );
    
    -- Update pole status to OCCUPIED
    UPDATE poles SET status = 'OCCUPIED' WHERE id = pole_id;
END $$;
