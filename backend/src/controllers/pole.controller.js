import pool from '../utils/prisma.js';
import { reverseGeocode, generatePoleCode as generatePoleCodeFromLocation } from '../services/geocoding.service.js';
import { randomUUID } from 'crypto';

// GET /api/poles - List all poles
export const getPoles = async (req, res, next) => {
  try {
    const { status, city, district, includeDeleted } = req.query;
    
    // Query with LEFT JOIN to get active order information
    // Use DISTINCT ON to ensure unique poles even if multiple future orders exist
    // We prioritize orders that started earlier (current ones) over future ones (SCHEDULED)
    let query = `
      SELECT DISTINCT ON (p.id)
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
        AND o.status NOT IN ('COMPLETED', 'EXPIRED', 'CANCELLED')
        AND o.end_date >= CURRENT_DATE
      WHERE 1=1
    `;
    
    // Exclude soft-deleted poles by default
    if (includeDeleted !== 'true') {
      query += ` AND p.deleted_at IS NULL`;
    }
    
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND p.status = $${paramCount++}`;
      params.push(status);
    }
    if (city) {
      query += ` AND p.city ILIKE $${paramCount++}`;
      params.push(`%${city}%`);
    }
    if (district) {
      query += ` AND p.district ILIKE $${paramCount++}`;
      params.push(`%${district}%`);
    }

    // Important: ORDER BY must start with the DISTINCT ON column(s)
    query += ' ORDER BY p.id, o.start_date ASC, p.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        poles: result.rows,
        count: result.rows.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/poles/:id - Get pole by ID
export const getPoleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM poles WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pole not found',
      });
    }

    res.json({
      success: true,
      data: {
        pole: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/poles - Create new pole
export const createPole = async (req, res, next) => {
  try {
    const {
      latitude,
      longitude,
      city: manualCity,
      district: manualDistrict,
      neighborhood: manualNeighborhood,
      street: manualStreet,
      sequenceNo,
      startDate,
      endDate,
      useGeocoding = true,
    } = req.body;

    // Validation
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
      });
    }

    let city = manualCity;
    let district = manualDistrict;
    let neighborhood = manualNeighborhood;
    let street = manualStreet;

    // Try reverse geocoding if enabled and manual values not provided
    if (useGeocoding) {
      try {
        const geocodeResult = await reverseGeocode(latitude, longitude);
        if (geocodeResult) {
          city = city || geocodeResult.city;
          district = district || geocodeResult.district;
          neighborhood = neighborhood || geocodeResult.neighborhood;
          street = street || geocodeResult.street;
        }
      } catch (geoError) {
        console.error('Geocoding failed:', geoError);
        // Continue with manual values
      }
    }

    // Generate pole code (e.g., ISKADB01)
    // Format: IL-ILCE-MAHALLE-CADDE-SIRA
    const poleCode = generatePoleCode(
      city,
      district,
      neighborhood,
      street,
      sequenceNo
    );

    // Check if pole code already exists
    const existing = await pool.query(
      'SELECT id FROM poles WHERE pole_code = $1',
      [poleCode]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Pole with this code already exists',
      });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert pole
      const poleResult = await client.query(
        `INSERT INTO poles (
           id, pole_code, latitude, longitude, city, district, neighborhood, street, sequence_no, status, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'AVAILABLE', NOW(), NOW())
         RETURNING *`,
        [randomUUID(), poleCode, latitude, longitude, city, district, neighborhood, street, sequenceNo]
      );

      const pole = poleResult.rows[0];

      // Create order if dates provided
      if (startDate && endDate) {
        await client.query(
          `INSERT INTO orders (
             id, pole_id, client_name, client_contact, start_date, end_date, status, created_by, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [randomUUID(), pole.id, 'Default Client', '', startDate, endDate, 'LIVE', req.user.id]
        );

        // Update pole status to OCCUPIED
        await client.query(
          'UPDATE poles SET status = $1 WHERE id = $2',
          ['OCCUPIED', pole.id]
        );

        pole.status = 'OCCUPIED';
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          pole,
        },
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

// PATCH /api/poles/:id - Update pole
export const updatePole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, city, district, neighborhood, street, status, startDate, endDate } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update pole fields
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (latitude !== undefined) {
        updates.push(`latitude = $${paramCount++}`);
        values.push(latitude);
      }
      if (longitude !== undefined) {
        updates.push(`longitude = $${paramCount++}`);
        values.push(longitude);
      }
      if (city !== undefined) {
        updates.push(`city = $${paramCount++}`);
        values.push(city);
      }
      if (district !== undefined) {
        updates.push(`district = $${paramCount++}`);
        values.push(district);
      }
      if (neighborhood !== undefined) {
        updates.push(`neighborhood = $${paramCount++}`);
        values.push(neighborhood);
      }
      if (street !== undefined) {
        updates.push(`street = $${paramCount++}`);
        values.push(street);
      }
      if (status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(status);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(id);

        await client.query(
          `UPDATE poles SET ${updates.join(', ')} WHERE id = $${paramCount}`,
          values
        );
      }

      // Handle order dates update
      if (startDate && endDate) {
        // Check if pole has active order
        const orderCheck = await client.query(
          `SELECT id FROM orders WHERE pole_id = $1 AND status NOT IN ('COMPLETED', 'EXPIRED', 'CANCELLED')`,
          [id]
        );

        if (orderCheck.rows.length > 0) {
          // Update existing order
          await client.query(
            `UPDATE orders SET start_date = $1, end_date = $2, updated_at = NOW() WHERE id = $3`,
            [startDate, endDate, orderCheck.rows[0].id]
          );
        } else {
          // Create new order
          await client.query(
            `INSERT INTO orders (
               id, pole_id, client_name, client_contact, start_date, end_date, status, created_by, created_at, updated_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [randomUUID(), id, 'Updated Client', '', startDate, endDate, 'LIVE', req.user.id]
          );
        }
      }

      // Get updated pole with order info
      const result = await client.query(
        `SELECT 
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
          AND o.status NOT IN ('COMPLETED', 'EXPIRED', 'CANCELLED')
        WHERE p.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Pole not found',
        });
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        data: {
          pole: result.rows[0],
        },
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

// DELETE /api/poles/:id - Soft delete pole
export const deletePole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;

    // Check if pole has active orders
    const orders = await pool.query(
      "SELECT id FROM orders WHERE pole_id = $1 AND status NOT IN ('COMPLETED', 'EXPIRED', 'CANCELLED')",
      [id]
    );

    if (orders.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete pole with active orders',
      });
    }

    // Soft delete
    const result = await pool.query(
      `UPDATE poles 
       SET deleted_at = NOW(), 
           status = 'INACTIVE',
           updated_at = NOW()
       WHERE id = $1 
       AND deleted_at IS NULL
       RETURNING id, pole_code, deleted_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pole not found or already deleted',
      });
    }

    res.json({
      success: true,
      message: 'Pole soft deleted successfully',
      data: {
        pole: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/poles/:id/restore - Restore soft-deleted pole
export const restorePole = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE poles 
       SET deleted_at = NULL, 
           status = 'AVAILABLE',
           updated_at = NOW()
       WHERE id = $1 
       AND deleted_at IS NOT NULL
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pole not found or not deleted',
      });
    }

    res.json({
      success: true,
      message: 'Pole restored successfully',
      data: {
        pole: result.rows[0],
      },
    });
  } catch (error) {
    next(error)
  }
};

// Helper function to generate pole code
function generatePoleCode(city, district, neighborhood, street, sequenceNo) {
  const cityCode = city ? city.substring(0, 2).toUpperCase() : 'XX';
  const districtCode = district ? district.substring(0, 3).toUpperCase() : 'XXX';
  const neighborhoodCode = neighborhood ? neighborhood.substring(0, 2).toUpperCase() : 'XX';
  const streetCode = street ? street.substring(0, 1).toUpperCase() : 'X';
  const seqCode = (sequenceNo || 1).toString().padStart(2, '0');

  return `${cityCode}${districtCode}${neighborhoodCode}${streetCode}${seqCode}`;
}

// GET /api/poles/available - Get available poles only
export const getAvailablePoles = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM poles WHERE status = 'AVAILABLE' ORDER BY pole_code"
    );

    res.json({
      success: true,
      data: {
        poles: result.rows,
        count: result.rows.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/poles/check-availability - Check if pole is available for date range
export const checkAvailability = async (req, res, next) => {
  try {
    const { poleId, startDate, endDate } = req.body;

    if (!poleId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'poleId, startDate, and endDate are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date range',
      });
    }

    // Check for overlapping orders
    const result = await pool.query(
      `SELECT id FROM orders 
       WHERE pole_id = $1 
       AND status NOT IN ('COMPLETED', 'EXPIRED', 'CANCELLED')
       AND (
         (start_date <= $2 AND end_date >= $2) OR
         (start_date <= $3 AND end_date >= $3) OR
         (start_date >= $2 AND end_date <= $3)
       )`,
      [poleId, startDate, endDate]
    );

    const isAvailable = result.rows.length === 0;

    res.json({
      success: true,
      data: {
        available: isAvailable,
        conflicts: result.rows.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
