import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import worker from '../dist/index.js';
import { memoryCache } from '../dist/utils/cache.js';

describe('Worker Entrypoint & Route Dispatching Unit Tests', () => {
  beforeEach(() => {
    memoryCache.clear();
  });

  test('CORS preflight (OPTIONS) returns 204 with allowed headers', async () => {
    const req = new Request('https://worker.local/api/hycom/profile', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://oceanscope-d6305.web.app',
        'Access-Control-Request-Method': 'GET',
      },
    });

    const res = await worker.fetch(req);
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://oceanscope-d6305.web.app');
    assert.ok(res.headers.get('Access-Control-Allow-Methods').includes('GET'));
  });

  test('Rejects non-GET methods with 405 Method Not Allowed', async () => {
    const req = new Request('https://worker.local/api/hycom/profile', {
      method: 'POST',
      body: JSON.stringify({ lat: 15 }),
    });

    const res = await worker.fetch(req);
    assert.equal(res.status, 405);
    const body = await res.json();
    assert.ok(body.detail.includes('Method POST not allowed'));
  });

  test('GET /health returns healthy status and service info', async () => {
    const req = new Request('https://worker.local/health');
    const res = await worker.fetch(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'healthy');
    assert.equal(body.service, 'oceanscope-hycom-api');
    assert.ok(body.timestamp);
  });

  test('Unknown route returns 404 with helpful endpoint list', async () => {
    const req = new Request('https://worker.local/api/unknown-endpoint');
    const res = await worker.fetch(req);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.detail.includes('Endpoint not found'));
  });

  test('Profile endpoint returns 400 when missing coordinates', async () => {
    const req = new Request('https://worker.local/api/hycom/profile');
    const res = await worker.fetch(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.detail.includes('Missing required query parameters'));
  });

  test('Datasets listing returns operational and historical catalog', async () => {
    const req = new Request('https://worker.local/api/hycom/datasets');
    const res = await worker.fetch(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.datasets));
    assert.ok(body.datasets.some((d) => d.id === 'ESPC-D-V02'));
    assert.ok(body.datasets.some((d) => d.id === 'GLBy0.08_expt_93.0'));
  });
});
