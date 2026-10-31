import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { HycomClient } from '../dist/services/hycom-client.js';

describe('OPeNDAP ASCII Parser Unit Tests', () => {
  const client = new HycomClient();

  test('Parses valid temperature array and applies scale factor + offset', () => {
    const sampleAscii = `
Dataset {
    Grid {
     ARRAY:
        Int16 water_temp[time = 1][depth = 3][lat = 1][lon = 1];
     MAPS:
        Float64 time[time = 1];
        Float64 depth[depth = 3];
        Float64 lat[lat = 1];
        Float64 lon[lon = 1];
    } water_temp;
} ESPC-D-V02/t3z/2026;
---------------------------------------------
water_temp.water_temp[1][3][1][1]
[0][0][0], 10476
[0][1][0], 9902
[0][2][0], 8974

water_temp.time[1]
235161.0

water_temp.depth[3]
0.0, 2.0, 25.0
`;

    const values = client.parseAsciiArray(sampleAscii, 'water_temp', 0.001, 20.0, -30000);
    assert.equal(values.length, 3);
    // 10476 * 0.001 + 20.0 = 30.476
    assert.equal(values[0], 30.476);
    // 9902 * 0.001 + 20.0 = 29.902
    assert.equal(values[1], 29.902);
    // 8974 * 0.001 + 20.0 = 28.974
    assert.equal(values[2], 28.974);
  });

  test('Handles missing values and land mask (-30000) as null', () => {
    const landAscii = `
---------------------------------------------
water_temp.water_temp[1][3][1][1]
[0][0][0], -30000
[0][1][0], -30000
[0][2][0], -30000

water_temp.time[1]
235161.0
`;
    const values = client.parseAsciiArray(landAscii, 'water_temp', 0.001, 20.0, -30000);
    assert.equal(values.length, 3);
    assert.equal(values[0], null);
    assert.equal(values[1], null);
    assert.equal(values[2], null);
  });

  test('Handles salinity scale factor and offset', () => {
    const salinityAscii = `
---------------------------------------------
salinity.salinity[1][2][1][1]
[0][0][0], 16421
[0][1][0], 16616

salinity.time[1]
235161.0
`;
    const values = client.parseAsciiArray(salinityAscii, 'salinity', 0.001, 20.0, -30000);
    assert.equal(values.length, 2);
    // 16421 * 0.001 + 20.0 = 36.421
    assert.equal(values[0], 36.421);
    // 16616 * 0.001 + 20.0 = 36.616
    assert.equal(values[1], 36.616);
  });

  test('Handles ocean velocity scale factor (addOffset = 0)', () => {
    const velocityAscii = `
---------------------------------------------
water_u.water_u[1][2][1][1]
[0][0][0], 92
[0][1][0], -150

water_u.time[1]
235161.0
`;
    const values = client.parseAsciiArray(velocityAscii, 'water_u', 0.001, 0.0, -30000);
    assert.equal(values.length, 2);
    // 92 * 0.001 = 0.092
    assert.equal(values[0], 0.092);
    // -150 * 0.001 = -0.15
    assert.equal(values[1], -0.15);
  });

  test('Gracefully ignores empty or malformed inputs without crashing', () => {
    assert.deepEqual(client.parseAsciiArray('', 'water_temp', 0.001, 20.0, -30000), []);
    assert.deepEqual(client.parseAsciiArray('Random non-DODS text', 'water_temp', 0.001, 20.0, -30000), []);
  });
});
