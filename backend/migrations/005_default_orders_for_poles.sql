-- Add default 7-day orders to all existing poles without orders
-- Date: 2026-02-03

DO $$
DECLARE
    admin_user_id UUID;
    pole_record RECORD;
BEGIN
    -- Get admin user
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@pbms.com' LIMIT 1;
    
    -- Loop through all poles that don't have active orders
    FOR pole_record IN 
        SELECT p.id, p.pole_code 
        FROM poles p
        LEFT JOIN orders o ON p.id = o.pole_id AND o.status NOT IN ('COMPLETED', 'EXPIRED')
        WHERE o.id IS NULL AND p.status = 'AVAILABLE'
    LOOP
        -- Insert order
        INSERT INTO orders (
            pole_id,
            client_name,
            client_contact,
            start_date,
            end_date,
            status,
            created_by
        ) VALUES (
            pole_record.id,
            'Demo Client',
            '+90 555 000 0000',
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '7 days',
            'LIVE',
            admin_user_id
        );
        
        -- Update pole status
        UPDATE poles SET status = 'OCCUPIED' WHERE id = pole_record.id;
        
        RAISE NOTICE 'Created order for pole: %', pole_record.pole_code;
    END LOOP;
END $$;
