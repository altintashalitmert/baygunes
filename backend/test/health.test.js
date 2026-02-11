import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.JWT_SECRET ??= 'test-secret';

const { default: app } = await import('../src/server.js');

test('GET /api/health returns OK payload', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'OK');
  assert.equal(response.body.message, 'PBMS API is running');
  assert.ok(response.body.timestamp);
});

test('GET /api/users without token returns 401', async () => {
  const response = await request(app).get('/api/users');

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, 'No token provided');
});

test('GET /api/not-found returns 404 json', async () => {
  const response = await request(app).get('/api/not-found');

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, 'Route not found');
});
