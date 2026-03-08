import pool from '../utils/prisma.js';
import { randomUUID } from 'crypto';
import { parsePoleCsvContent, serializePolesToCsv } from '../utils/poleCsv.js';

const normalizePoleIds = (value) =>
  [...new Set((Array.isArray(value) ? value : []).map((item) => String(item ?? '').trim()).filter(Boolean))];

const loadExistingPoles = async (client, ids, poleCodes) => {
  const clauses = [];
  const params = [];

  if (ids.length > 0) {
    params.push(ids);
    clauses.push(`id::text = ANY($${params.length}::text[])`);
  }

  if (poleCodes.length > 0) {
    params.push(poleCodes);
    clauses.push(`pole_code = ANY($${params.length}::text[])`);
  }

  if (clauses.length === 0) return [];

  const result = await client.query(
    `
      SELECT id, pole_code
      FROM poles
      WHERE ${clauses.join(' OR ')}
    `,
    params
  );

  return result.rows;
};

// PATCH /api/poles/bulk-update - Bulk update poles
export const bulkUpdatePoles = async (req, res, next) => {
  try {
    const { poleIds, status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required for bulk update',
      });
    }

    if (!poleIds || !Array.isArray(poleIds) || poleIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'poleIds array is required',
      });
    }

    const result = await pool.query(
      'UPDATE poles SET status = $1, updated_at = NOW() WHERE id::text = ANY($2::text[]) RETURNING *',
      [status, poleIds]
    );

    res.json({
      success: true,
      message: `Updated ${result.rows.length} poles`,
      data: {
        count: result.rows.length,
        poles: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/poles/bulk-export - Export selected poles as CSV
export const exportPolesCsv = async (req, res, next) => {
  try {
    const poleIds = normalizePoleIds(req.body?.poleIds);

    if (poleIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV export icin en az bir direk secilmelidir.',
      });
    }

    const result = await pool.query(
      `
        SELECT
          id,
          pole_code,
          latitude,
          longitude,
          city,
          district,
          neighborhood,
          street,
          sequence_no,
          pole_type,
          direction_type,
          arm_type,
          status
        FROM poles
        WHERE id::text = ANY($1::text[])
          AND deleted_at IS NULL
        ORDER BY pole_code ASC
      `,
      [poleIds]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Secilen direkler bulunamadi.',
      });
    }

    const csvContent = serializePolesToCsv(result.rows);
    const filename = `selected-poles-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// POST /api/poles/bulk-import - Import poles from exported CSV format
export const importPolesCsv = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const csvContent = typeof req.body?.csvContent === 'string' ? req.body.csvContent : '';
    const fileName =
      typeof req.body?.fileName === 'string' && req.body.fileName.trim()
        ? req.body.fileName.trim()
        : 'poles.csv';

    if (!csvContent.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Import icin CSV icerigi gerekli.',
      });
    }

    const rows = parsePoleCsvContent(csvContent);
    const ids = rows.map((row) => row.id).filter(Boolean);
    const poleCodes = rows.map((row) => row.poleCode);

    await client.query('BEGIN');

    const existingPoles = await loadExistingPoles(client, ids, poleCodes);
    const existingById = new Map(existingPoles.map((row) => [String(row.id), row]));
    const existingByCode = new Map(existingPoles.map((row) => [String(row.pole_code), row]));
    const updates = [];
    const creates = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;
      const matchedById = row.id ? existingById.get(row.id) || null : null;
      const matchedByCode = existingByCode.get(row.poleCode) || null;

      if (matchedById && matchedByCode && matchedById.id !== matchedByCode.id) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: `Satir ${rowNumber}: id ve pole_code farkli direklere ait.`,
        });
      }

      const matchedPole = matchedById || matchedByCode;
      if (matchedPole) {
        updates.push({
          targetId: matchedPole.id,
          row,
        });
        continue;
      }

      creates.push({
        id: row.id || randomUUID(),
        row,
      });
    }

    for (const item of updates) {
      await client.query(
        `
          UPDATE poles
          SET
            pole_code = $1,
            latitude = $2,
            longitude = $3,
            city = $4,
            district = $5,
            neighborhood = $6,
            street = $7,
            sequence_no = $8,
            pole_type = $9,
            direction_type = $10,
            arm_type = $11,
            status = $12,
            deleted_at = NULL,
            updated_at = NOW()
          WHERE id = $13
        `,
        [
          item.row.poleCode,
          item.row.latitude,
          item.row.longitude,
          item.row.city,
          item.row.district,
          item.row.neighborhood,
          item.row.street,
          item.row.sequenceNo,
          item.row.poleType,
          item.row.directionType,
          item.row.armType,
          item.row.status,
          item.targetId,
        ]
      );
    }

    for (const item of creates) {
      await client.query(
        `
          INSERT INTO poles (
            id,
            pole_code,
            latitude,
            longitude,
            city,
            district,
            neighborhood,
            street,
            sequence_no,
            pole_type,
            direction_type,
            arm_type,
            status,
            deleted_at,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, NULL, NOW(), NOW()
          )
        `,
        [
          item.id,
          item.row.poleCode,
          item.row.latitude,
          item.row.longitude,
          item.row.city,
          item.row.district,
          item.row.neighborhood,
          item.row.street,
          item.row.sequenceNo,
          item.row.poleType,
          item.row.directionType,
          item.row.armType,
          item.row.status,
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `CSV import tamamlandi: ${creates.length} yeni, ${updates.length} guncel.`,
      data: {
        fileName,
        rowCount: rows.length,
        createdCount: creates.length,
        updatedCount: updates.length,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// PATCH /api/poles/bulk-delete - Soft delete multiple poles
export const bulkDeletePoles = async (req, res, next) => {
  try {
    const { poleIds } = req.body;

    if (!poleIds || !Array.isArray(poleIds) || poleIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'poleIds array is required',
      });
    }

    // Check for active orders
    const activeOrders = await pool.query(
      `SELECT DISTINCT pole_id FROM orders 
       WHERE pole_id::text = ANY($1::text[]) 
       AND status NOT IN ('COMPLETED', 'EXPIRED', 'CANCELLED')`,
      [poleIds]
    );

    if (activeOrders.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete poles with active orders: ${activeOrders.rows.map(r => r.pole_id).join(', ')}`,
      });
    }

    const result = await pool.query(
      `UPDATE poles
       SET deleted_at = NOW(),
           status = 'INACTIVE',
           updated_at = NOW()
       WHERE id::text = ANY($1::text[])
       AND deleted_at IS NULL
       RETURNING id, pole_code, deleted_at`,
      [poleIds]
    );

    res.json({
      success: true,
      message: `Soft deleted ${result.rows.length} poles`,
      data: {
        count: result.rows.length,
        poles: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};
