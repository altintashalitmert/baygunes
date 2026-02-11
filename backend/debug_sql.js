import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testQuery() {
  try {
    const client = await pool.connect();
    console.log("Connected to DB");

    // The problematic query from pole.controller.js
    const query = `
      SELECT 
        p.*,
        o.id as active_order_id,
        o.start_date,
        o.end_date,
        o.client_name,
        o.status as order_status,
        o.contract_file_url,
        o.ad_image_url
      FROM poles p
      LEFT JOIN orders o ON p.id = o.pole_id 
        AND o.status NOT IN ('COMPLETED', 'EXPIRED')
        AND o.end_date >= CURRENT_DATE
      WHERE 1=1
      ORDER BY p.created_at DESC
    `;

    console.log("Running Query...");
    const res = await client.query(query);
    console.log("Success! Rows:", res.rows.length);
    client.release();
  } catch (err) {
    console.error("QUERY ERROR:", err.message);
    if(err.hint) console.error("HINT:", err.hint);
    if(err.position) console.error("POSITION:", err.position);
  } finally {
    pool.end();
  }
}

testQuery();
