import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  latToGridIndex,
  lonToGridIndex,
  normalizeLongitude360,
  toSignedLongitude180,
  findNearestDepth,
  HYCOM_DEPTH_LEVELS,
} from '../dist/utils/coordinates.js';

describe('Coordinate Conversion & Grid Mapping Unit Tests', () => {
  test('Standard latitude mapping (Arabian Sea Lat 15.0°N)', () => {
    const { index, actualLat } = latToGridIndex(15.0);
    // (15.0 - (-80.0)) / 0.04 = 95.0 / 0.04 = 2375
    assert.equal(index, 2375);
    assert.equal(actualLat, 15.0);
  });

  test('Boundary latitudes: Equator, South Pole, North Pole', () => {
    const equator = latToGridIndex(0.0);
    assert.equal(equator.index, 2000);
    assert.equal(equator.actualLat, 0.0);

    const south = latToGridIndex(-80.0);
    assert.equal(south.index, 0);
    assert.equal(south.actualLat, -80.0);

    const north = latToGridIndex(90.0);
    assert.equal(north.index, 4250);
    assert.equal(north.actualLat, 90.0);
  });

  test('Standard longitude mapping (Arabian Sea Lon 70.0°E)', () => {
    const { index, actualLon } = lonToGridIndex(70.0);
    // 70.0 / 0.08 = 875
    assert.equal(index, 875);
    assert.equal(actualLon, 70.0);
  });

  test('Negative longitude normalization (Atlantic Lon -40.0°)', () => {
    // -40° should normalize to 320°
    const norm = normalizeLongitude360(-40.0);
    assert.equal(norm, 320.0);

    const { index, actualLon } = lonToGridIndex(-40.0);
    // 320 / 0.08 = 4000
    assert.equal(index, 4000);
    assert.equal(actualLon, -40.0);
  });

  test('Signed longitude roundtrip', () => {
    assert.equal(toSignedLongitude180(70.0), 70.0);
    assert.equal(toSignedLongitude180(320.0), -40.0);
    assert.equal(toSignedLongitude180(180.0), 180.0);
    assert.equal(toSignedLongitude180(0.0), 0.0);
  });

  test('Depth level nearest matching across 40 levels', () => {
    assert.equal(HYCOM_DEPTH_LEVELS.length, 40);
    assert.equal(HYCOM_DEPTH_LEVELS[0], 0.0);
    assert.equal(HYCOM_DEPTH_LEVELS[39], 5000.0);

    // Exact matches
    assert.deepEqual(findNearestDepth(0), { index: 0, depth: 0.0 });
    assert.deepEqual(findNearestDepth(10), { index: 5, depth: 10.0 });
    assert.deepEqual(findNearestDepth(100), { index: 19, depth: 100.0 });
    assert.deepEqual(findNearestDepth(5000), { index: 39, depth: 5000.0 });

    // In-between depth interpolation/nearest
    assert.deepEqual(findNearestDepth(13), { index: 6, depth: 12.0 }); // 13 is closer to 12 than 15
    assert.deepEqual(findNearestDepth(14), { index: 7, depth: 15.0 }); // 14 is closer to 15 than 12
    assert.deepEqual(findNearestDepth(450), { index: 26, depth: 400.0 });
  });
});
