import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://pbms_user:pbms_password@localhost:5432/pbms_db',
});

async function seedTokat() {
  try {
    console.log('🌱 Tokat demo verileri yükleniyor...');
    
    // 1. Get Admin User
    const userRes = await pool.query("SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1");
    if (userRes.rows.length === 0) throw new Error('Admin user not found');
    const adminId = userRes.rows[0].id;

    // 2. Create Poles in Tokat Districts
    const districts = ['Merkez', 'Erbaa', 'Turhal', 'Zile', 'Niksar'];
    const poles = [];
    
    for (const d of districts) {
        for (let i = 1; i <= 3; i++) {
            const code = `TK-${d.substring(0,2).toUpperCase()}-${100 + i}`;
            const res = await pool.query(
                `INSERT INTO poles (pole_code, district, neighborhood, latitude, longitude, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                 ON CONFLICT (pole_code) DO UPDATE SET updated_at = NOW()
                 RETURNING id, pole_code`,
                [code, d, 'Cumhuriyet Mah.', 40.3167, 36.5500, 'AVAILABLE']
            );
            poles.push(res.rows[0]);
        }
    }

    console.log(`✅ ${poles.length} direk oluşturuldu.`);

    // 3. Create Demo Orders in different statuses
    const clients = ['Tokat Belediyesi', 'Zile Pekmezi A.Ş.', 'Erbaa Yaprak Pazarı', 'Gaziosmanpaşa Üniv.', 'Niksar Suları'];
    const statuses = ['PENDING', 'PRINTING', 'AWAITING_MOUNT', 'LIVE', 'COMPLETED'];
    
    for (let i = 0; i < poles.length; i++) {
        const status = statuses[i % statuses.length];
        const client = clients[i % clients.length];
        const pole = poles[i];
        
        await pool.query(
            `INSERT INTO orders (pole_id, client_name, client_contact, status, start_date, end_date, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW() + interval '30 days', $5, NOW(), NOW())`,
            [pole.id, client, '05550001122', status, adminId]
        );

        if (status !== 'AVAILABLE') {
            await pool.query("UPDATE poles SET status = 'OCCUPIED' WHERE id = $1", [pole.id]);
        }
    }

    console.log('✅ Tokat demo siparişleri oluşturuldu.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Hata:', err);
    process.exit(1);
  }
}

seedTokat();
