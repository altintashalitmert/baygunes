
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Use absolute path for .env if needed, or assume running from proper pwd.
// Since we are running via agent, simplest is to rely on standard loading.
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://pbms_user:pbms_password@localhost:5432/pbms_db',
});

const cleanData = async () => {
  try {
    console.log('🗑️  Cleaning existing data...');
    // Delete orders first due to foreign keys
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM poles');
  } catch (err) {
    console.error('❌ Error cleaning data:', err);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    console.log('🌱 Seeding fresh data...');
    
    // Helper to insert pole
    const insertPole = async (code, lat, lng, dist, status = 'AVAILABLE') => {
      const res = await pool.query(
        `INSERT INTO poles (pole_code, latitude, longitude, city, district, neighborhood, street, sequence_no, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'Tokat', $4, 'Merkez', 'Cumhuriyet Cd.', 1, $5, NOW(), NOW()) RETURNING id`,
        [code, lat, lng, dist, status]
      );
      return res.rows[0].id;
    };

    // Get a valid user ID for created_by
    let userId;
    const userRes = await pool.query('SELECT id FROM users LIMIT 1');
    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
    } else {
       // Insert default user if missing. Assuming UUID is auto-gen or we rely on DB default. 
       // If DB requires explicit ID, we might fail again without uuid-ossp, so let's try standard insert.
       try {
         const newUser = await pool.query(
           `INSERT INTO users (name, email, password, role, created_at, updated_at)
            VALUES ('System Admin', 'admin@mbg.com', '$2b$10$EpOppp94yAv.m.e.c/1.UO/2/5/8/0/3/6/9/12...dummyhash', 'SUPER_ADMIN', NOW(), NOW())
            RETURNING id`
         );
         userId = newUser.rows[0].id;
       } catch (e) {
          console.log('Could not create user, using dummy UUID just in case (might fail if foreign key constraint)');
          userId = '00000000-0000-0000-0000-000000000000'; 
       }
    }

    // Helper to insert order
    const insertOrder = async (poleId, client, status, daysOffset = 0) => {
      const start = new Date();
      start.setDate(start.getDate() + daysOffset);
      const end = new Date(start);
      end.setDate(end.getDate() + 30); // 30 day contract
      
      const startStr = start.toISOString();
      const endStr = end.toISOString();

      await pool.query(
        `INSERT INTO orders (pole_id, client_name, client_contact, start_date, end_date, status, created_by, created_at, updated_at)
         VALUES ($1, $2, '0532 555 0000', $3, $4, $5, $6, NOW(), NOW())`,
        [poleId, client, startStr, endStr, status, userId]
      );
    };

    // 1. Niksar - PENDING (No Files) -> Should show upload buttons
    const p1 = await insertPole('TK-NI-101', '40.5914', '36.9533', 'Niksar', 'OCCUPIED');
    await insertOrder(p1, 'Erbaa Yaprak Pazarı', 'PENDING');

    // 2. Niksar - LIVE (Files exist usually, but let's leave empty to test or assume uploaded)
    // Actually, LIVE implies everything is done.
    const p2 = await insertPole('TK-NI-102', '40.5890', '36.9500', 'Niksar', 'OCCUPIED');
    await insertOrder(p2, 'Gaziosmanpaşa Üniv.', 'LIVE', -5);

    // 3. Zile - PRINTING (Maybe contract uploaded, but image pending?)
    const p3 = await insertPole('TK-ZI-103', '40.3000', '35.8000', 'Zile', 'OCCUPIED');
    await insertOrder(p3, 'Zile Pekmezi A.Ş.', 'PRINTING');

    // 4. Zile - AWAITING MOUNT
    const p4 = await insertPole('TK-ZI-101', '40.3020', '35.8020', 'Zile', 'OCCUPIED');
    await insertOrder(p4, 'Niksarkale Turizm', 'AWAITING_MOUNT');

    // 5. Zile - EXPIRED
    const p5 = await insertPole('TK-ZI-102', '40.3050', '35.8050', 'Zile', 'OCCUPIED');
    await insertOrder(p5, 'Tokat Belediyesi', 'EXPIRED', -35); // Expired 5 days ago

    // AVAILABLE POLES
    await insertPole('TK-TU-101', '40.3900', '36.0800', 'Turhal', 'AVAILABLE');
    await insertPole('TK-TU-102', '40.3920', '36.0820', 'Turhal', 'AVAILABLE');
    await insertPole('TK-TU-103', '40.3940', '36.0840', 'Turhal', 'AVAILABLE');
    await insertPole('TK-ER-101', '40.6900', '36.5700', 'Erbaa', 'AVAILABLE');
    await insertPole('TK-NI-103', '40.5950', '36.9550', 'Niksar', 'AVAILABLE');

    console.log('✅ Database reset and seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding data:', err);
    process.exit(1);
  }
};

const run = async () => {
    await cleanData();
    await seedData();
};

run();
