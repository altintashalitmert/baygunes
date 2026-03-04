import { randomUUID } from 'crypto';
import pool from '../utils/prisma.js';

const DIRECTION_TYPES = new Set(['TEK_YONLU', 'CIFT_YONLU']);
const ARM_TYPES = new Set(['L', 'T']);
const LIGHTING_TYPES = new Set(['NORMAL', 'AYDINLATMALI']);
const SOURCE_TYPES = new Set(['MAP_TAP', 'GPS']);

// Approximate bounding box for Tokat Merkez operational area.
const TOKAT_BOUNDS = Object.freeze({
  minLat: 40.12,
  maxLat: 40.58,
  minLng: 36.25,
  maxLng: 36.86,
});

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isWithinBounds = (lat, lng, bounds) =>
  lat >= bounds.minLat &&
  lat <= bounds.maxLat &&
  lng >= bounds.minLng &&
  lng <= bounds.maxLng;

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return false;
};

const sanitizeText = (value, { fallback = '', max = 160 } = {}) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
};

const toCodeSegment = (value, { fallback = 'X', max = 24 } = {}) => {
  const normalized = sanitizeText(value, { fallback: '' })
    .toUpperCase()
    .replace(/Ç/g, 'C')
    .replace(/Ğ/g, 'G')
    .replace(/İ/g, 'I')
    .replace(/İ/g, 'I')
    .replace(/Ö/g, 'O')
    .replace(/Ş/g, 'S')
    .replace(/Ü/g, 'U')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, max);

  return normalized || fallback;
};

const normalizeDirectionType = (value) => {
  const normalized = sanitizeText(value, { fallback: 'TEK_YONLU', max: 16 }).toUpperCase();
  return DIRECTION_TYPES.has(normalized) ? normalized : 'TEK_YONLU';
};

const normalizeArmType = (value) => {
  const normalized = sanitizeText(value, { fallback: 'T', max: 2 }).toUpperCase();
  return ARM_TYPES.has(normalized) ? normalized : 'T';
};

const normalizeLightingType = (value) => {
  const normalized = sanitizeText(value, { fallback: 'NORMAL', max: 16 }).toUpperCase();
  return LIGHTING_TYPES.has(normalized) ? normalized : 'NORMAL';
};

const normalizeSource = (value) => {
  const normalized = sanitizeText(value, { fallback: 'MAP_TAP', max: 16 }).toUpperCase();
  return SOURCE_TYPES.has(normalized) ? normalized : 'MAP_TAP';
};

const extractBasePrefix = (code) => {
  if (!code) return '';
  return String(code).replace(/-\d{4}$/, '').trim();
};

const generateNextCodeByPrefix = async (client, prefix) => {
  const likePattern = `${prefix}-%`;
  const result = await client.query(
    `
      SELECT GREATEST(
        COALESCE(
          (
            SELECT MAX(
              CASE
                WHEN pole_code ~ '-[0-9]{4}$' THEN RIGHT(pole_code, 4)::int
                ELSE 0
              END
            )
            FROM poles
            WHERE pole_code LIKE $1
          ),
          0
        ),
        COALESCE(
          (
            SELECT MAX(
              CASE
                WHEN generated_code ~ '-[0-9]{4}$' THEN RIGHT(generated_code, 4)::int
                ELSE 0
              END
            )
            FROM pole_capture_staging
            WHERE generated_code LIKE $1
          ),
          0
        )
      ) AS max_seq
    `,
    [likePattern]
  );

  const nextSeq = (result.rows[0]?.max_seq || 0) + 1;
  return `${prefix}-${String(nextSeq).padStart(4, '0')}`;
};

const buildCodePrefix = ({ neighborhood, street }) => {
  const mahalleSegment = toCodeSegment(neighborhood, { fallback: 'MAHALLE', max: 28 });
  const streetSegment = toCodeSegment(street, { fallback: 'CADDE', max: 28 });
  return `TOKAT-${mahalleSegment}-${streetSegment}`;
};

const normalizeCaptureIds = (value) => {
  const source = Array.isArray(value) ? value : [value];
  return [...new Set(source.map((item) => String(item ?? '').trim()).filter(Boolean))];
};

const validateCoordinates = ({ latitude, longitude, allowOutsideTokat }) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return 'Enlem ve boylam sayisal bir deger olmali.';
  }
  if (latitude < -90 || latitude > 90) {
    return 'Enlem -90 ile 90 arasinda olmali.';
  }
  if (longitude < -180 || longitude > 180) {
    return 'Boylam -180 ile 180 arasinda olmali.';
  }

  if (!allowOutsideTokat) {
    const inTokat = isWithinBounds(latitude, longitude, TOKAT_BOUNDS);
    if (!inTokat) {
      const looksSwapped = isWithinBounds(longitude, latitude, TOKAT_BOUNDS);
      if (looksSwapped) {
        return 'Koordinatlar Tokat siniri disinda. Enlem/boylam ters girilmis olabilir.';
      }
      return 'Koordinatlar Tokat siniri disinda. Haritadan tekrar secin veya dis alan iznini acin.';
    }
  }

  return null;
};

export const listPoleCaptures = async (req, res, next) => {
  try {
    const { district, neighborhood, imported, limit = 200 } = req.query;
    const maxLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);

    const params = [];
    let paramCount = 1;
    let where = 'WHERE 1=1';

    if (district) {
      where += ` AND pcs.district ILIKE $${paramCount++}`;
      params.push(`%${district}%`);
    }
    if (neighborhood) {
      where += ` AND pcs.neighborhood ILIKE $${paramCount++}`;
      params.push(`%${neighborhood}%`);
    }
    if (imported === 'true') {
      where += ' AND pcs.imported_at IS NOT NULL';
    } else if (imported === 'false') {
      where += ' AND pcs.imported_at IS NULL';
    }

    params.push(maxLimit);
    const result = await pool.query(
      `
        SELECT
          pcs.*,
          u.name AS captured_by_name
        FROM pole_capture_staging pcs
        LEFT JOIN users u ON u.id::text = pcs.captured_by::text
        ${where}
        ORDER BY pcs.captured_at DESC
        LIMIT $${paramCount}
      `,
      params
    );

    res.json({
      success: true,
      data: {
        captures: result.rows,
        count: result.rows.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPoleCaptureGroups = async (req, res, next) => {
  try {
    const { district } = req.query;
    const params = [];
    let where = '';

    if (district) {
      params.push(`%${district}%`);
      where = 'WHERE district ILIKE $1';
    }

    const result = await pool.query(
      `
        SELECT
          district,
          neighborhood,
          COUNT(*) AS total_count,
          COUNT(*) FILTER (WHERE imported_at IS NULL) AS pending_count
        FROM pole_capture_staging
        ${where}
        GROUP BY district, neighborhood
        ORDER BY district ASC, neighborhood ASC
      `,
      params
    );

    res.json({
      success: true,
      data: {
        groups: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createPoleCapture = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const latitude = toNumber(req.body?.latitude);
    const longitude = toNumber(req.body?.longitude);
    const allowOutsideTokat = parseBoolean(req.body?.allowOutsideTokat);
    const gpsAccuracyM = toNumber(req.body?.gpsAccuracyM);

    const district = sanitizeText(req.body?.district, { max: 120 });
    const neighborhood = sanitizeText(req.body?.neighborhood, { max: 160 });
    const street = sanitizeText(req.body?.street, { max: 200 });
    const city = sanitizeText(req.body?.city, { fallback: 'Tokat', max: 80 }) || 'Tokat';
    const notes = sanitizeText(req.body?.notes, { max: 1200 }) || null;

    if (!district || !neighborhood || !street) {
      return res.status(400).json({
        success: false,
        error: 'Ilce, mahalle ve cadde alanlari zorunludur.',
      });
    }

    const coordinateError = validateCoordinates({ latitude, longitude, allowOutsideTokat });
    if (coordinateError) {
      return res.status(422).json({
        success: false,
        error: coordinateError,
      });
    }

    const directionType = normalizeDirectionType(req.body?.directionType);
    const armType = normalizeArmType(req.body?.armType);
    const lightingType = normalizeLightingType(req.body?.lightingType);
    const source = normalizeSource(req.body?.source);

    const roundedLat = Number(latitude.toFixed(6));
    const roundedLng = Number(longitude.toFixed(6));

    const prefix = buildCodePrefix({ neighborhood, street });

    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [prefix]);

    const generatedCode = await generateNextCodeByPrefix(client, prefix);

    const insertResult = await client.query(
      `
        INSERT INTO pole_capture_staging (
          id,
          latitude,
          longitude,
          city,
          district,
          neighborhood,
          street,
          direction_type,
          arm_type,
          lighting_type,
          generated_code,
          source,
          gps_accuracy_m,
          captured_by,
          notes,
          captured_at,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15,
          NOW(), NOW(), NOW()
        )
        RETURNING *
      `,
      [
        randomUUID(),
        roundedLat,
        roundedLng,
        city,
        district,
        neighborhood,
        street,
        directionType,
        armType,
        lightingType,
        generatedCode,
        source,
        gpsAccuracyM,
        req.user?.id || null,
        notes,
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        capture: insertResult.rows[0],
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const importPoleCaptures = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Import icin en az bir capture id gerekli.',
      });
    }

    await client.query('BEGIN');

    const capturesResult = await client.query(
      `
        SELECT *
        FROM pole_capture_staging
        WHERE id::text = ANY($1::text[])
          AND imported_at IS NULL
        FOR UPDATE
      `,
      [ids]
    );

    if (capturesResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Import edilecek uygun kayit bulunamadi.',
      });
    }

    const importedPoleIds = [];
    const importRows = [];

    for (const capture of capturesResult.rows) {
      let poleCode = capture.generated_code;
      const basePrefix = extractBasePrefix(capture.generated_code);

      const sequenceNoMatch = /-(\d{4})$/.exec(poleCode);
      let sequenceNo = sequenceNoMatch ? Number(sequenceNoMatch[1]) : null;

      let insertedPole = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const result = await client.query(
            `
              INSERT INTO poles (
                id, pole_code, latitude, longitude,
                city, district, neighborhood, street,
                sequence_no, pole_type, direction_type, arm_type,
                status, created_at, updated_at
              )
              VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8,
                $9, $10, $11, $12,
                'AVAILABLE', NOW(), NOW()
              )
              RETURNING id, pole_code
            `,
            [
              randomUUID(),
              poleCode,
              capture.latitude,
              capture.longitude,
              capture.city,
              capture.district,
              capture.neighborhood,
              capture.street,
              sequenceNo,
              capture.lighting_type || 'NORMAL',
              capture.direction_type || 'TEK_YONLU',
              capture.arm_type || 'T',
            ]
          );
          insertedPole = result.rows[0];
          break;
        } catch (error) {
          if (error?.code !== '23505' || !basePrefix) {
            throw error;
          }
          poleCode = await generateNextCodeByPrefix(client, basePrefix);
          const newSequenceMatch = /-(\d{4})$/.exec(poleCode);
          sequenceNo = newSequenceMatch ? Number(newSequenceMatch[1]) : sequenceNo;
        }
      }

      if (!insertedPole) {
        throw new Error(`Pole insert failed for capture ${capture.id}`);
      }

      importedPoleIds.push(insertedPole.id);
      importRows.push({
        captureId: capture.id,
        poleId: insertedPole.id,
        poleCode: insertedPole.pole_code,
      });
    }

    try {
      await client.query(
        `
          UPDATE pole_capture_staging
          SET
            imported_at = NOW(),
            imported_pole_id = mapped.pole_id,
            updated_at = NOW()
          FROM (
            SELECT
              UNNEST($1::text[]) AS capture_id,
              UNNEST($2::text[]) AS pole_id
          ) AS mapped
          WHERE pole_capture_staging.id::text = mapped.capture_id
        `,
        [importRows.map((x) => String(x.captureId)), importRows.map((x) => String(x.poleId))]
      );
    } catch (error) {
      if (error?.code !== '42804') throw error;
      await client.query(
        `
          UPDATE pole_capture_staging
          SET
            imported_at = NOW(),
            imported_pole_id = mapped.pole_id::uuid,
            updated_at = NOW()
          FROM (
            SELECT
              UNNEST($1::text[]) AS capture_id,
              UNNEST($2::text[]) AS pole_id
          ) AS mapped
          WHERE pole_capture_staging.id::text = mapped.capture_id
        `,
        [importRows.map((x) => String(x.captureId)), importRows.map((x) => String(x.poleId))]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        importedCount: importRows.length,
        importedPoleIds,
        rows: importRows,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const deletePoleCaptures = async (req, res, next) => {
  try {
    const ids = normalizeCaptureIds(req.body?.ids);
    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Silme icin en az bir capture id gerekli.',
      });
    }

    const result = await pool.query(
      `
        DELETE FROM pole_capture_staging
        WHERE id::text = ANY($1::text[])
          AND imported_at IS NULL
        RETURNING id::text AS id
      `,
      [ids]
    );

    const deletedIds = result.rows.map((row) => row.id);

    res.json({
      success: true,
      data: {
        requestedCount: ids.length,
        deletedCount: result.rowCount || 0,
        deletedIds,
      },
    });
  } catch (error) {
    next(error);
  }
};
