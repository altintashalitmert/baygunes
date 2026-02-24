import dotenv from 'dotenv';
import pool from '../src/utils/prisma.js';

dotenv.config();

const TOKAT_POLES = [
  { code: 'TOK-MRK-101', district: 'Merkez', neighborhood: 'Cumhuriyet Mah.', street: 'Gaziosmanpaşa Bulvarı', latitude: 40.3167, longitude: 36.5500 },
  { code: 'TOK-MRK-102', district: 'Merkez', neighborhood: 'Cumhuriyet Mah.', street: 'Atatürk Caddesi', latitude: 40.3178, longitude: 36.5521 },
  { code: 'TOK-MRK-103', district: 'Merkez', neighborhood: 'Mahmutpaşa Mah.', street: 'Şehitler Caddesi', latitude: 40.3192, longitude: 36.5464 },
  { code: 'TOK-MRK-104', district: 'Merkez', neighborhood: 'Gülbaharhatun Mah.', street: 'Vali Zekai Gümüşdiş Cad.', latitude: 40.3135, longitude: 36.5452 },
  { code: 'TOK-ERB-201', district: 'Erbaa', neighborhood: 'Karakaya Mah.', street: 'Cumhuriyet Caddesi', latitude: 40.6689, longitude: 36.5668 },
  { code: 'TOK-ERB-202', district: 'Erbaa', neighborhood: 'Yavuz Selim Mah.', street: 'Mithatpaşa Caddesi', latitude: 40.6701, longitude: 36.5695 },
  { code: 'TOK-ERB-203', district: 'Erbaa', neighborhood: 'Erek Mah.', street: 'Şehit Astsubay Cad.', latitude: 40.6662, longitude: 36.5634 },
  { code: 'TOK-TUR-301', district: 'Turhal', neighborhood: 'Müftü Mah.', street: 'Kazım Karabekir Cad.', latitude: 40.3872, longitude: 36.0813 },
  { code: 'TOK-TUR-302', district: 'Turhal', neighborhood: 'Celal Mah.', street: 'Cumhuriyet Meydanı', latitude: 40.3891, longitude: 36.0780 },
  { code: 'TOK-TUR-303', district: 'Turhal', neighborhood: 'Mimar Sinan Mah.', street: 'Sanayi Caddesi', latitude: 40.3848, longitude: 36.0847 },
  { code: 'TOK-ZIL-401', district: 'Zile', neighborhood: 'Alacamescit Mah.', street: 'Atatürk Bulvarı', latitude: 40.3038, longitude: 35.8860 },
  { code: 'TOK-ZIL-402', district: 'Zile', neighborhood: 'Cedid Mah.', street: 'Hükümet Caddesi', latitude: 40.3017, longitude: 35.8833 },
  { code: 'TOK-ZIL-403', district: 'Zile', neighborhood: 'Camii Kebir Mah.', street: 'Şehit Teğmen Cad.', latitude: 40.3061, longitude: 35.8897 },
  { code: 'TOK-NIK-501', district: 'Niksar', neighborhood: 'İsmetpaşa Mah.', street: 'Niksar Caddesi', latitude: 40.5914, longitude: 36.9531 },
  { code: 'TOK-NIK-502', district: 'Niksar', neighborhood: 'Bağlar Mah.', street: 'Lale Sokak', latitude: 40.5886, longitude: 36.9494 },
  { code: 'TOK-NIK-503', district: 'Niksar', neighborhood: 'Sofular Mah.', street: 'Cumhuriyet Caddesi', latitude: 40.5942, longitude: 36.9558 },
];

const ACCOUNT_DATA = [
  { company_name: 'Tokat Belediyesi', contact_name: 'Mehmet Yılmaz', phone: '0555 100 10 10', email: 'iletisim@tokat.bel.tr' },
  { company_name: 'Erbaa Organize Sanayi', contact_name: 'Ayşe Demir', phone: '0555 100 10 11', email: 'bilgi@erbaaosb.com' },
  { company_name: 'Turhal Şeker Fabrikası', contact_name: 'Ali Korkmaz', phone: '0555 100 10 12', email: 'kurumsal@turhalseker.com' },
  { company_name: 'Zile Ticaret Odası', contact_name: 'Fatma Kaya', phone: '0555 100 10 13', email: 'info@ziletso.org.tr' },
  { company_name: 'Niksar Gıda Ltd.', contact_name: 'Hasan Çelik', phone: '0555 100 10 14', email: 'destek@niksargida.com' },
];

const ORDER_STATUSES = ['PENDING', 'SCHEDULED', 'PRINTING', 'AWAITING_MOUNT', 'LIVE', 'COMPLETED'];

const tableExists = async (client, tableName) => {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists
    `,
    [tableName]
  );
  return result.rows[0]?.exists === true;
};

const columnExists = async (client, tableName, columnName) => {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS exists
    `,
    [tableName, columnName]
  );
  return result.rows[0]?.exists === true;
};

const ensureAccount = async (client, account) => {
  const existing = await client.query(
    `SELECT id FROM accounts WHERE company_name = $1 LIMIT 1`,
    [account.company_name]
  );

  if (existing.rows.length > 0) return existing.rows[0];

  const inserted = await client.query(
    `
      INSERT INTO accounts (type, company_name, contact_name, email, phone, tax_no, tax_office, address)
      VALUES ('CORPORATE', $1, $2, $3, $4, $5, $6, $7)
      RETURNING id, company_name
    `,
    [
      account.company_name,
      account.contact_name,
      account.email,
      account.phone,
      `TK-${Math.floor(100000 + Math.random() * 900000)}`,
      'Tokat Vergi Dairesi',
      'Tokat / Türkiye',
    ]
  );

  return inserted.rows[0];
};

async function seedTokat() {
  const client = await pool.connect();

  try {
    console.log('🌱 Tokat demo verileri yükleniyor...');
    await client.query('BEGIN');

    const adminResult = await client.query(
      `
        SELECT id
        FROM users
        WHERE role = 'SUPER_ADMIN' AND active = true
        ORDER BY created_at ASC
        LIMIT 1
      `
    );

    if (adminResult.rows.length === 0) {
      throw new Error('SUPER_ADMIN kullanıcı bulunamadı. Önce kullanıcıları seedleyin.');
    }
    const adminId = adminResult.rows[0].id;

    const hasAccounts = await tableExists(client, 'accounts');
    const hasOrders = await tableExists(client, 'orders');
    const hasTransactions = await tableExists(client, 'transactions');
    const hasOrderAccountId = hasOrders ? await columnExists(client, 'orders', 'account_id') : false;
    const hasOrderPrice = hasOrders ? await columnExists(client, 'orders', 'price') : false;

    const poles = [];
    for (const pole of TOKAT_POLES) {
      const upsertPole = await client.query(
        `
          INSERT INTO poles (pole_code, latitude, longitude, city, district, neighborhood, street, status, created_at, updated_at, deleted_at)
          VALUES ($1, $2, $3, 'Tokat', $4, $5, $6, 'AVAILABLE', NOW(), NOW(), NULL)
          ON CONFLICT (pole_code) DO UPDATE
            SET latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                city = EXCLUDED.city,
                district = EXCLUDED.district,
                neighborhood = EXCLUDED.neighborhood,
                street = EXCLUDED.street,
                deleted_at = NULL,
                updated_at = NOW()
          RETURNING id, pole_code
        `,
        [pole.code, pole.latitude, pole.longitude, pole.district, pole.neighborhood, pole.street]
      );
      poles.push(upsertPole.rows[0]);
    }

    console.log(`✅ ${poles.length} Tokat direği oluşturuldu/güncellendi.`);

    let accounts = [];
    if (hasAccounts) {
      for (const account of ACCOUNT_DATA) {
        const created = await ensureAccount(client, account);
        accounts.push(created);
      }
      console.log(`✅ ${accounts.length} cari hesap hazır.`);
    } else {
      console.log('ℹ️ accounts tablosu bulunamadı, sipariş seed atlanacak.');
    }

    let createdOrders = 0;
    let createdTransactions = 0;

    if (hasOrders && hasAccounts && hasOrderAccountId) {
      for (let i = 0; i < poles.length; i += 1) {
        const pole = poles[i];
        const shouldCreateOrder = i % 3 !== 2; // bir kısmı boş kalsın

        if (!shouldCreateOrder) {
          await client.query(
            `UPDATE poles SET status = 'AVAILABLE', updated_at = NOW() WHERE id = $1`,
            [pole.id]
          );
          continue;
        }

        const account = accounts[i % accounts.length];
        const status = ORDER_STATUSES[i % ORDER_STATUSES.length];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (i % 4));
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 20 + (i % 10));
        const price = 7500 + i * 250;

        const existingOrder = await client.query(
          `
            SELECT id
            FROM orders
            WHERE pole_id = $1
              AND account_id = $2
              AND status = $3
              AND start_date = $4::date
            LIMIT 1
          `,
          [pole.id, account.id, status, startDate.toISOString().slice(0, 10)]
        );

        let orderId;
        if (existingOrder.rows.length > 0) {
          orderId = existingOrder.rows[0].id;
        } else {
          const insertOrderColumns = ['pole_id', 'account_id', 'client_name', 'client_contact', 'start_date', 'end_date', 'status', 'created_by', 'created_at', 'updated_at'];
          const insertOrderValues = [pole.id, account.id, `TOKAT DEMO - ${account.company_name}`, account.phone, startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10), status, adminId];

          if (hasOrderPrice) {
            insertOrderColumns.splice(8, 0, 'price');
            insertOrderValues.splice(8, 0, price);
          }

          const placeholders = insertOrderValues.map((_, idx) => `$${idx + 1}`).join(', ');
          const insertSql = `
            INSERT INTO orders (${insertOrderColumns.join(', ')})
            VALUES (${placeholders}, NOW(), NOW())
            RETURNING id
          `;
          const inserted = await client.query(insertSql, insertOrderValues);
          orderId = inserted.rows[0].id;
          createdOrders += 1;
        }

        await client.query(
          `UPDATE poles SET status = 'OCCUPIED', updated_at = NOW() WHERE id = $1`,
          [pole.id]
        );

        if (hasTransactions && status === 'COMPLETED') {
          const transactionExists = await client.query(
            `
              SELECT id
              FROM transactions
              WHERE order_id = $1
              LIMIT 1
            `,
            [orderId]
          );

          if (transactionExists.rows.length === 0) {
            await client.query(
              `
                INSERT INTO transactions (account_id, order_id, amount, type, description, transaction_date, created_by, created_at)
                VALUES ($1, $2, $3, 'BANK_TRANSFER', $4, NOW(), $5, NOW())
              `,
              [account.id, orderId, price, 'Tokat demo tamamlanan iş tahsilatı', adminId]
            );
            createdTransactions += 1;
          }
        }
      }
    }

    await client.query('COMMIT');

    console.log(`✅ ${createdOrders} yeni demo sipariş eklendi.`);
    if (hasTransactions) {
      console.log(`✅ ${createdTransactions} demo tahsilat eklendi.`);
    }
    console.log('🎯 Tokat demo seed tamamlandı.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed hatası:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedTokat();
