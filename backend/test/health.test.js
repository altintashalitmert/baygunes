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

test('CORS allows configured localhost origin', async () => {
  const origin = 'https://localhost:5173';
  const response = await request(app)
    .get('/api/health')
    .set('Origin', origin);

  assert.equal(response.status, 200);
  assert.equal(response.headers['access-control-allow-origin'], origin);
});

test('CORS blocks unknown origin', async () => {
  const response = await request(app)
    .get('/api/health')
    .set('Origin', 'https://example.com');

  assert.equal(response.status, 200);
  assert.equal(response.headers['access-control-allow-origin'], undefined);
});

test('POST /api/log/error validates message', async () => {
  const response = await request(app)
    .post('/api/log/error')
    .send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, 'message is required');
});

test('POST /api/log/error accepts payload', async () => {
  const response = await request(app)
    .post('/api/log/error')
    .send({
      message: 'UI crash sample',
      stack: 'Error: sample',
      componentStack: 'at UsersPage',
      app: 'baygunes-frontend',
    });

  assert.equal(response.status, 202);
  assert.equal(response.body.success, true);
});
