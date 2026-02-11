import pool from '../utils/prisma.js';

// GET /api/pricing
export const getPricing = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM pricing_config');
    
    // Convert array to object for easier frontend consumption
    const pricing = result.rows.reduce((acc, curr) => {
      acc[curr.key] = {
        value: parseFloat(curr.value),
        unit: curr.unit
      };
      return acc;
    }, {});

    // Default values if not present
    const defaults = {
      print_price_sqm: { value: 500, unit: 'TL' },
      mount_price: { value: 200, unit: 'TL' },
      dismount_price: { value: 150, unit: 'TL' }
    };

    res.json({
      success: true,
      data: { ...defaults, ...pricing }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/pricing
export const updatePricing = async (req, res, next) => {
  try {
    const updates = req.body; // { key: value, ... }
    const keys = Object.keys(updates);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const key of keys) {
        const val = updates[key];
        // Upsert logic
        await client.query(
          `INSERT INTO pricing_config (key, value, unit, updated_at)
           VALUES ($1, $2, 'TL', NOW())
           ON CONFLICT (key) 
           DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, val]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Pricing updated successfully'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};
