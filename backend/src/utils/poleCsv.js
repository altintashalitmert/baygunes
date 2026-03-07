import { Parser } from 'json2csv';

export const POLE_CSV_FIELDS = [
  'id',
  'pole_code',
  'latitude',
  'longitude',
  'city',
  'district',
  'neighborhood',
  'street',
  'sequence_no',
  'pole_type',
  'direction_type',
  'arm_type',
  'status',
];

const ALLOWED_POLE_TYPES = new Set(['NORMAL', 'AYDINLATMALI']);
const ALLOWED_DIRECTION_TYPES = new Set(['TEK_YONLU', 'CIFT_YONLU']);
const ALLOWED_ARM_TYPES = new Set(['L', 'T']);
const ALLOWED_STATUSES = new Set(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE']);

const sanitizeText = (value) => {
  const normalized = String(value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  return normalized === '' ? null : normalized;
};

const parseOptionalNumber = (value, fieldName, rowNumber) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;

  const parsed = Number(String(value).trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`Satir ${rowNumber}: "${fieldName}" sayisal olmali.`);
  }

  return parsed;
};

const parseRequiredNumber = (value, fieldName, rowNumber) => {
  const parsed = parseOptionalNumber(value, fieldName, rowNumber);
  if (parsed === null) {
    throw new Error(`Satir ${rowNumber}: "${fieldName}" zorunludur.`);
  }
  return parsed;
};

const normalizeEnum = (value, allowedValues, fallback, fieldName, rowNumber) => {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase();

  if (!normalized) return fallback;
  if (!allowedValues.has(normalized)) {
    throw new Error(`Satir ${rowNumber}: "${fieldName}" gecersiz.`);
  }

  return normalized;
};

const parseCsvRows = (csvContent) => {
  const source = String(csvContent ?? '').replace(/^\uFEFF/, '');
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if (char === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      continue;
    }

    if (char === '\r') {
      if (nextChar === '\n') {
        continue;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += char;
  }

  if (inQuotes) {
    throw new Error('CSV icinde kapanmamis cift tirnak bulundu.');
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((value) => String(value).trim() !== ''));
};

export const serializePolesToCsv = (rows) => {
  const parser = new Parser({ fields: POLE_CSV_FIELDS });
  const records = rows.map((row) => ({
    id: row.id ?? '',
    pole_code: row.pole_code ?? '',
    latitude: row.latitude ?? '',
    longitude: row.longitude ?? '',
    city: row.city ?? '',
    district: row.district ?? '',
    neighborhood: row.neighborhood ?? '',
    street: row.street ?? '',
    sequence_no: row.sequence_no ?? '',
    pole_type: row.pole_type ?? 'NORMAL',
    direction_type: row.direction_type ?? 'TEK_YONLU',
    arm_type: row.arm_type ?? 'T',
    status: row.status ?? 'AVAILABLE',
  }));

  return parser.parse(records);
};

export const parsePoleCsvContent = (csvContent) => {
  const rows = parseCsvRows(csvContent);
  if (rows.length < 2) {
    throw new Error('CSV bos veya sadece baslik satirindan olusuyor.');
  }

  const headers = rows[0].map((header) => String(header ?? '').trim());
  const missingHeaders = POLE_CSV_FIELDS.filter((field) => !headers.includes(field));
  if (missingHeaders.length > 0) {
    throw new Error(`CSV basliklari eksik: ${missingHeaders.join(', ')}`);
  }

  const headerIndexMap = new Map(headers.map((header, index) => [header, index]));
  const parsedRows = [];
  const seenIds = new Set();
  const seenPoleCodes = new Set();

  for (let index = 1; index < rows.length; index += 1) {
    const rowNumber = index + 1;
    const rawRow = rows[index];
    const getField = (fieldName) => rawRow[headerIndexMap.get(fieldName)] ?? '';

    const poleCode = sanitizeText(getField('pole_code'));
    if (!poleCode) {
      throw new Error(`Satir ${rowNumber}: "pole_code" zorunludur.`);
    }

    const id = sanitizeText(getField('id'));
    if (id) {
      if (seenIds.has(id)) {
        throw new Error(`Satir ${rowNumber}: tekrar eden "id" bulundu.`);
      }
      seenIds.add(id);
    }

    if (seenPoleCodes.has(poleCode)) {
      throw new Error(`Satir ${rowNumber}: tekrar eden "pole_code" bulundu.`);
    }
    seenPoleCodes.add(poleCode);

    parsedRows.push({
      id,
      poleCode,
      latitude: parseRequiredNumber(getField('latitude'), 'latitude', rowNumber),
      longitude: parseRequiredNumber(getField('longitude'), 'longitude', rowNumber),
      city: sanitizeText(getField('city')),
      district: sanitizeText(getField('district')),
      neighborhood: sanitizeText(getField('neighborhood')),
      street: sanitizeText(getField('street')),
      sequenceNo: parseOptionalNumber(getField('sequence_no'), 'sequence_no', rowNumber),
      poleType: normalizeEnum(
        getField('pole_type'),
        ALLOWED_POLE_TYPES,
        'NORMAL',
        'pole_type',
        rowNumber
      ),
      directionType: normalizeEnum(
        getField('direction_type'),
        ALLOWED_DIRECTION_TYPES,
        'TEK_YONLU',
        'direction_type',
        rowNumber
      ),
      armType: normalizeEnum(getField('arm_type'), ALLOWED_ARM_TYPES, 'T', 'arm_type', rowNumber),
      status: normalizeEnum(
        getField('status'),
        ALLOWED_STATUSES,
        'AVAILABLE',
        'status',
        rowNumber
      ),
    });
  }

  return parsedRows;
};
