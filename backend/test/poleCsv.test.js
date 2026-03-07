import test from 'node:test';
import assert from 'node:assert/strict';

import { parsePoleCsvContent, serializePolesToCsv } from '../src/utils/poleCsv.js';

test('pole CSV export/import roundtrip preserves supported fields', () => {
  const csv = serializePolesToCsv([
    {
      id: 'pole-1',
      pole_code: 'TOKAT-YESILIRMAK-0001',
      latitude: 40.313131,
      longitude: 36.565656,
      city: 'Tokat',
      district: 'Merkez',
      neighborhood: 'Yeşilırmak',
      street: 'Gaziosmanpaşa Bulvarı, Ön Cephe',
      sequence_no: 1,
      pole_type: 'AYDINLATMALI',
      direction_type: 'TEK_YONLU',
      arm_type: 'L',
      status: 'AVAILABLE',
    },
    {
      id: 'pole-2',
      pole_code: 'TOKAT-KUMBET-0002',
      latitude: 40.323232,
      longitude: 36.575757,
      city: 'Tokat',
      district: 'Merkez',
      neighborhood: 'Kümbet',
      street: 'Behzat Bulvarı "Kuzey"',
      sequence_no: 2,
      pole_type: 'NORMAL',
      direction_type: 'CIFT_YONLU',
      arm_type: 'T',
      status: 'OCCUPIED',
    },
  ]);

  const rows = parsePoleCsvContent(csv);

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    id: 'pole-1',
    poleCode: 'TOKAT-YESILIRMAK-0001',
    latitude: 40.313131,
    longitude: 36.565656,
    city: 'Tokat',
    district: 'Merkez',
    neighborhood: 'Yeşilırmak',
    street: 'Gaziosmanpaşa Bulvarı, Ön Cephe',
    sequenceNo: 1,
    poleType: 'AYDINLATMALI',
    directionType: 'TEK_YONLU',
    armType: 'L',
    status: 'AVAILABLE',
  });
  assert.equal(rows[1].street, 'Behzat Bulvarı "Kuzey"');
  assert.equal(rows[1].directionType, 'CIFT_YONLU');
});

test('pole CSV import validation rejects missing headers', () => {
  assert.throws(
    () => parsePoleCsvContent('pole_code,latitude\nTOKAT-TEST-0001,40.1'),
    /CSV basliklari eksik/
  );
});
