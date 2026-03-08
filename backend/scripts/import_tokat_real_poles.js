import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../src/utils/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_NORMAL_CSV = '/Users/altintasmert/Downloads/direk_koordinatlari.csv';
const DEFAULT_LIGHTING_CSV = '/Users/altintasmert/Downloads/aydinlatma_direkleri.csv';
const TM_CENTRAL_MERIDIAN = Number.parseFloat(process.env.TM_CENTRAL_MERIDIAN || '36');
const TM_SCALE_FACTOR = Number.parseFloat(process.env.TM_SCALE_FACTOR || '1');
const GEOCODE_DELAY_MS = Number.parseInt(process.env.GEOCODE_DELAY_MS || '1100', 10);
const USE_GEOCODING = (process.env.USE_GEOCODING || 'true').trim().toLowerCase() !== 'false';
const DRY_RUN = (process.env.DRY_RUN || 'false').trim().toLowerCase() === 'true';

const TRANSLITERATION_MAP = {
  C: 'C',
  c: 'C',
  'Ç': 'C',
  'ç': 'C',
  G: 'G',
  g: 'G',
  'Ğ': 'G',
  'ğ': 'G',
  I: 'I',
  i: 'I',
  'İ': 'I',
  'ı': 'I',
  O: 'O',
  o: 'O',
  'Ö': 'O',
  'ö': 'O',
  S: 'S',
  s: 'S',
  'Ş': 'S',
  'ş': 'S',
  U: 'U',
  u: 'U',
  'Ü': 'U',
  'ü': 'U',
};

const firstNonEmpty = (...values) => {
  for (const value of values.flat()) {
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeText = (value, fallback) => {
  const compact = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  return compact || fallback;
};

const slugPart = (value, fallback = 'BILINMEYEN', maxLen = 24) => {
  const source = normalizeText(value, fallback);
  const mapped = source
    .split('')
    .map((char) => TRANSLITERATION_MAP[char] || char)
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (!mapped) return fallback;
  return mapped.slice(0, maxLen).replace(/-+$/g, '') || fallback;
};

const parseCsv = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 2) return [];
  const header = rows[0].split(',').map((col) => col.trim());
  const dataRows = rows.slice(1).map((line) => line.split(',').map((col) => col.trim()));

  return { header, dataRows };
};

// Projected TM coordinates (false easting 500000) -> Lat/Lon (WGS84)
const projectedTmToLatLon = (
  easting,
  northing,
  longOriginDeg = TM_CENTRAL_MERIDIAN,
  k0 = TM_SCALE_FACTOR
) => {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const eccSquared = 2 * f - f * f;
  const eccPrimeSquared = eccSquared / (1 - eccSquared);

  const x = easting - 500000.0;
  const y = northing;
  const m = y / k0;
  const mu =
    m /
    (a *
      (1 -
        eccSquared / 4 -
        (3 * eccSquared * eccSquared) / 64 -
        (5 * eccSquared * eccSquared * eccSquared) / 256));

  const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));

  const j1 = (3 * e1) / 2 - (27 * e1 * e1 * e1) / 32;
  const j2 = (21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32;
  const j3 = (151 * e1 * e1 * e1) / 96;
  const j4 = (1097 * e1 * e1 * e1 * e1) / 512;

  const fp =
    mu +
    j1 * Math.sin(2 * mu) +
    j2 * Math.sin(4 * mu) +
    j3 * Math.sin(6 * mu) +
    j4 * Math.sin(8 * mu);

  const sinFp = Math.sin(fp);
  const cosFp = Math.cos(fp);
  const tanFp = Math.tan(fp);

  const c1 = eccPrimeSquared * cosFp * cosFp;
  const t1 = tanFp * tanFp;
  const n1 = a / Math.sqrt(1 - eccSquared * sinFp * sinFp);
  const r1 =
    (a * (1 - eccSquared)) /
    Math.pow(1 - eccSquared * sinFp * sinFp, 1.5);
  const d = x / (n1 * k0);

  const q1 = (n1 * tanFp) / r1;
  const q2 = (d * d) / 2;
  const q3 =
    ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * eccPrimeSquared) *
      Math.pow(d, 4)) /
    24;
  const q4 =
    ((61 +
      90 * t1 +
      298 * c1 +
      45 * t1 * t1 -
      252 * eccPrimeSquared -
      3 * c1 * c1) *
      Math.pow(d, 6)) /
    720;
  const lat = fp - q1 * (q2 - q3 + q4);

  const q5 = d;
  const q6 = ((1 + 2 * t1 + c1) * Math.pow(d, 3)) / 6;
  const q7 =
    ((5 -
      2 * c1 +
      28 * t1 -
      3 * c1 * c1 +
      8 * eccPrimeSquared +
      24 * t1 * t1) *
      Math.pow(d, 5)) /
    120;
  const lon = ((q5 - q6 + q7) / cosFp) * (180 / Math.PI) + longOriginDeg;

  return {
    latitude: Number((lat * (180 / Math.PI)).toFixed(6)),
    longitude: Number(lon.toFixed(6)),
  };
};

const reverseGeocode = async (latitude, longitude, cache) => {
  const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const fallback = {
    city: 'Tokat',
    district: 'Merkez',
    neighborhood: 'Bilinmeyen Mahalle',
    street: 'Bilinmeyen Cadde',
  };

  if (!USE_GEOCODING) {
    cache.set(cacheKey, fallback);
    return fallback;
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=tr`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'baygunes-pole-import/1.0 (ops@baygunes.com)',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          await sleep(2000 * attempt);
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const address = data.address || {};

      const result = {
        city: normalizeText(
          firstNonEmpty(address.city, address.state, address.province, 'Tokat'),
          'Tokat'
        ),
        district: normalizeText(
          firstNonEmpty(address.city_district, address.town, address.county, address.municipality, 'Merkez'),
          'Merkez'
        ),
        neighborhood: normalizeText(
          firstNonEmpty(
            address.neighbourhood,
            address.suburb,
            address.quarter,
            address.city_block,
            address.residential,
            address.village,
            address.hamlet,
            'Bilinmeyen Mahalle'
          ),
          'Bilinmeyen Mahalle'
        ),
        street: normalizeText(
          firstNonEmpty(
            address.road,
            address.pedestrian,
            address.footway,
            address.cycleway,
            address.path,
            address.residential,
            'Bilinmeyen Cadde'
          ),
          'Bilinmeyen Cadde'
        ),
      };

      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (attempt === 3) {
        cache.set(cacheKey, fallback);
        return fallback;
      }
      await sleep(1000 * attempt);
    }
  }

  cache.set(cacheKey, fallback);
  return fallback;
};

const parsePoleRows = async () => {
  const normalCsvPath = process.env.NORMAL_POLES_CSV || DEFAULT_NORMAL_CSV;
  const lightingCsvPath = process.env.LIGHTING_POLES_CSV || DEFAULT_LIGHTING_CSV;

  const normalCsv = await parseCsv(normalCsvPath);
  const lightingCsv = await parseCsv(lightingCsvPath);

  const normalYIndex = normalCsv.header.findIndex((h) => h.toUpperCase() === 'NORTHING_Y');
  const normalXIndex = normalCsv.header.findIndex((h) => h.toUpperCase() === 'EASTING_X');
  const lightingYIndex = lightingCsv.header.findIndex((h) => h.toUpperCase() === 'Y');
  const lightingXIndex = lightingCsv.header.findIndex((h) => h.toUpperCase() === 'X');

  if (normalYIndex < 0 || normalXIndex < 0) {
    throw new Error('direk_koordinatlari.csv expected columns: Northing_Y,Easting_X');
  }
  if (lightingYIndex < 0 || lightingXIndex < 0) {
    throw new Error('aydinlatma_direkleri.csv expected columns: Y,X');
  }

  const allPoles = [];
  const appendRow = (northingRaw, eastingRaw, poleType) => {
    const northing = Number.parseFloat(String(northingRaw));
    const easting = Number.parseFloat(String(eastingRaw));
    if (!Number.isFinite(northing) || !Number.isFinite(easting)) return;

    const { latitude, longitude } = projectedTmToLatLon(easting, northing);
    allPoles.push({ latitude, longitude, poleType });
  };

  for (const row of normalCsv.dataRows) {
    appendRow(row[normalYIndex], row[normalXIndex], 'NORMAL');
  }
  for (const row of lightingCsv.dataRows) {
    appendRow(row[lightingYIndex], row[lightingXIndex], 'AYDINLATMALI');
  }

  return allPoles;
};

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

const run = async () => {
  const poles = await parsePoleRows();
  console.log(`📍 Total coordinates to import: ${poles.length}`);
  console.log(`ℹ️  Geocoding: ${USE_GEOCODING ? 'ENABLED' : 'DISABLED'}`);
  console.log(`ℹ️  Dry run: ${DRY_RUN ? 'ENABLED' : 'DISABLED'}`);

  const geocodeCache = new Map();
  const enriched = [];

  for (let index = 0; index < poles.length; index += 1) {
    const pole = poles[index];
    const cacheKey = `${pole.latitude.toFixed(6)},${pole.longitude.toFixed(6)}`;
    const wasCached = geocodeCache.has(cacheKey);
    const address = await reverseGeocode(pole.latitude, pole.longitude, geocodeCache);
    const neighborhood = normalizeText(address.neighborhood, 'Bilinmeyen Mahalle');
    const street = normalizeText(address.street, 'Bilinmeyen Cadde');
    const code = `TOKAT-${slugPart(neighborhood, 'MAHALLE')}-${slugPart(street, 'CADDE')}-${String(index + 1).padStart(4, '0')}`;

    enriched.push({
      id: randomUUID(),
      poleCode: code,
      latitude: pole.latitude,
      longitude: pole.longitude,
      city: 'Tokat',
      district: normalizeText(address.district, 'Merkez'),
      neighborhood,
      street,
      sequenceNo: index + 1,
      poleType: pole.poleType,
      status: 'AVAILABLE',
    });

    if (USE_GEOCODING && !wasCached) {
      await sleep(GEOCODE_DELAY_MS);
    }
    if ((index + 1) % 25 === 0 || index + 1 === poles.length) {
      console.log(`...processed ${index + 1}/${poles.length}`);
    }
  }

  const neighborhoodStats = enriched.reduce((acc, pole) => {
    const key = pole.neighborhood;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const typeStats = enriched.reduce((acc, pole) => {
    acc[pole.poleType] = (acc[pole.poleType] || 0) + 1;
    return acc;
  }, {});

  console.log('📊 Pole type counts:', typeStats);
  console.log(`📊 Neighborhood count: ${Object.keys(neighborhoodStats).length}`);

  const previewPath = path.resolve(__dirname, '../tmp_tokat_import_preview.json');
  await fs.writeFile(
    previewPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: enriched.length,
        typeStats,
        neighborhoodStats,
        sample: enriched.slice(0, 20),
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`📝 Preview written: ${previewPath}`);

  if (DRY_RUN) {
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `ALTER TABLE poles ADD COLUMN IF NOT EXISTS pole_type VARCHAR(32) NOT NULL DEFAULT 'NORMAL'`
    );

    const hasWorkflow = await tableExists(client, 'workflow_history');
    const hasFiles = await tableExists(client, 'files');
    const hasTransactions = await tableExists(client, 'transactions');
    const hasOrders = await tableExists(client, 'orders');

    if (hasWorkflow) await client.query('DELETE FROM workflow_history');
    if (hasFiles) await client.query('DELETE FROM files');
    if (hasTransactions) await client.query('DELETE FROM transactions');
    if (hasOrders) await client.query('DELETE FROM orders');
    await client.query('DELETE FROM poles');

    for (const pole of enriched) {
      await client.query(
        `INSERT INTO poles (
          id, pole_code, latitude, longitude, city, district, neighborhood, street, sequence_no, pole_type, status, deleted_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, NOW(), NOW()
        )`,
        [
          pole.id,
          pole.poleCode,
          pole.latitude,
          pole.longitude,
          pole.city,
          pole.district,
          pole.neighborhood,
          pole.street,
          pole.sequenceNo,
          pole.poleType,
          pole.status,
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`✅ Imported ${enriched.length} poles into local database.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error('❌ Import failed:', error?.message || error);
  process.exit(1);
});
