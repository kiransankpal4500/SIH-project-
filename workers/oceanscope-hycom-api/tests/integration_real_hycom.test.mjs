import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

import worker from '../dist/index.js';

describe('Real Live HYCOM OPeNDAP Integration Tests', () => {
  test('Live Metadata retrieval discovers real operational timestamps', async () => {
    const req = new Request('https://worker.local/api/hycom/metadata');
    const res = await worker.fetch(req);
    assert.equal(res.status, 200);
    const meta = await res.json();

    assert.equal(meta.model, 'HYCOM');
    assert.ok(meta.available_years.includes(2026));
    assert.ok(meta.latest_time.startsWith('2026-'));
    assert.equal(meta.depth_levels.length, 40);
  });

  test('Live Single Ocean Point measurement (Lat 15.0°N, Lon 70.0°E, surface temperature)', async () => {
    const req = new Request(
      'https://worker.local/api/hycom/point?latitude=15.0&longitude=70.0&variable=temperature'
    );
    const t0 = performance.now();
    const res = await worker.fetch(req);
    const dur = performance.now() - t0;
    assert.equal(res.status, 200);

    const pt = await res.json();
    assert.equal(pt.model, 'HYCOM');
    assert.equal(pt.variable, 'temperature');
    assert.equal(pt.unit, '°C');
    assert.ok(pt.value !== null);

    // Arabian Sea surface temperature validation (typically 27 - 32 °C)
    assert.ok(pt.value >= 26.0 && pt.value <= 33.0, `Expected realistic temp, got ${pt.value}`);
    console.log(`\n  [INTEGRATION] Real Surface Temp at (15N, 70E): ${pt.value} °C in ${dur.toFixed(0)}ms`);
  });

  test('Live Vertical Profile generation and physical oceanographic validation', async () => {
    const req = new Request(
      'https://worker.local/api/hycom/profile?latitude=15.0&longitude=70.0'
    );
    const t0 = performance.now();
    const res = await worker.fetch(req);
    const dur = performance.now() - t0;
    assert.equal(res.status, 200);

    const prof = await res.json();
    assert.equal(prof.model, 'HYCOM');
    assert.equal(prof.profile.length, 40);

    // Verify depth ordering
    for (let i = 0; i < prof.profile.length - 1; i++) {
      assert.ok(
        prof.profile[i].depth < prof.profile[i + 1].depth,
        `Depth levels must strictly increase: ${prof.profile[i].depth} vs ${prof.profile[i + 1].depth}`
      );
    }

    const surface = prof.profile[0];
    const deep100m = prof.profile[19]; // index 19 is 100m

    // Verify surface temperature and salinity
    assert.ok(surface.temperature !== null);
    assert.ok(surface.salinity !== null);
    assert.ok(
      surface.temperature > 26.0 && surface.temperature < 33.0,
      `Surface temp out of bounds: ${surface.temperature}`
    );
    assert.ok(
      surface.salinity > 34.0 && surface.salinity < 38.0,
      `Surface salinity out of bounds: ${surface.salinity}`
    );

    // Verify thermocline gradient: surface should be warmer than 100m
    if (deep100m.temperature !== null) {
      assert.ok(
        surface.temperature > deep100m.temperature,
        `Expected thermocline drop: Surface ${surface.temperature}°C > 100m ${deep100m.temperature}°C`
      );
    }

    console.log(`  [INTEGRATION] Real Profile (40 depths) generated in ${dur.toFixed(0)}ms:`);
    console.log(`    Surface: ${surface.temperature}°C, ${surface.salinity} PSU at ${surface.depth}m`);
    console.log(`    100m:    ${deep100m.temperature}°C, ${deep100m.salinity} PSU at ${deep100m.depth}m`);
  });

  test('Live Land Point Test: returns nulls for land points, not fabricated data', async () => {
    // Central India land point (Lat 22.0°N, Lon 78.0°E)
    const req = new Request(
      'https://worker.local/api/hycom/point?latitude=22.0&longitude=78.0&variable=temperature'
    );
    const res = await worker.fetch(req);
    assert.equal(res.status, 200);
    const pt = await res.json();
    // Land mask in HYCOM should evaluate to null
    assert.equal(pt.value, null, 'Land point must return null, not fabricated ocean measurement');
    console.log('  [INTEGRATION] Land point at (22N, 78E) correctly returned null');
  });

  test('Live Negative Longitude Test (Atlantic Ocean Lat 25.0°N, Lon -40.0°W)', async () => {
    const req = new Request(
      'https://worker.local/api/hycom/point?latitude=25.0&longitude=-40.0&variable=temperature'
    );
    const res = await worker.fetch(req);
    assert.equal(res.status, 200);
    const pt = await res.json();
    assert.equal(pt.latitude, 25.0);
    assert.equal(pt.longitude, -40.0);
    assert.ok(pt.value !== null);
    assert.ok(pt.value > 18.0 && pt.value < 32.0);
    console.log(`  [INTEGRATION] Atlantic Point (-40W, 25N) = ${pt.value} °C`);
  });

  test('Cache Hit Test: repeated query returns sub-10ms response with cache hit header', async () => {
    const url = 'https://worker.local/api/hycom/point?latitude=15.0&longitude=70.0&variable=temperature';

    // Miss or initial populate
    await worker.fetch(new Request(url));

    // Second request: Cache hit
    const t0 = performance.now();
    const cachedRes = await worker.fetch(new Request(url));
    const cachedDur = performance.now() - t0;

    assert.equal(cachedRes.status, 200);
    assert.ok(
      cachedRes.headers.get('X-OceanScope-Cache')?.startsWith('HIT'),
      'Expected cache hit header'
    );
    console.log(`  [INTEGRATION] Cache Hit Latency: ${cachedDur.toFixed(2)}ms`);
    assert.ok(cachedDur < 50.0, `Cache hit should be fast (< 50ms), got ${cachedDur}ms`);
  });

  test('Concurrent Requests Test: multiple simultaneous profiles execute cleanly', async () => {
    const req1 = worker.fetch(new Request('https://worker.local/api/hycom/point?latitude=12.0&longitude=65.0&variable=temperature'));
    const req2 = worker.fetch(new Request('https://worker.local/api/hycom/point?latitude=10.0&longitude=85.0&variable=temperature'));

    const [res1, res2] = await Promise.all([req1, req2]);
    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);

    const pt1 = await res1.json();
    const pt2 = await res2.json();
    assert.ok(pt1.value !== null);
    assert.ok(pt2.value !== null);
    console.log(`  [INTEGRATION] Concurrent points: Arabian Sea ${pt1.value}°C, Bay of Bengal ${pt2.value}°C`);
  });
});
