import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateCoordinates,
  validateVariable,
  parseAndValidateIsoDate,
  ValidationError,
} from '../dist/utils/validation.js';
import { errorResponse, HYCOMUpstreamError, HYCOMTimeoutError } from '../dist/utils/errors.js';

describe('Validation & Error Response Unit Tests', () => {
  test('Valid coordinates pass without error', () => {
    assert.doesNotThrow(() => validateCoordinates(15.0, 70.0, 0.0));
    assert.doesNotThrow(() => validateCoordinates(-80.0, -40.0, 5000.0));
    assert.doesNotThrow(() => validateCoordinates(90.0, 360.0, 6000.0));
  });

  test('Invalid latitude throws ValidationError', () => {
    assert.throws(() => validateCoordinates(95.0, 70.0, 0.0), ValidationError);
    assert.throws(() => validateCoordinates(-91.0, 70.0, 0.0), ValidationError);
    assert.throws(() => validateCoordinates(NaN, 70.0, 0.0), ValidationError);
  });

  test('Invalid longitude throws ValidationError', () => {
    assert.throws(() => validateCoordinates(15.0, 370.0, 0.0), ValidationError);
    assert.throws(() => validateCoordinates(15.0, -185.0, 0.0), ValidationError);
    assert.throws(() => validateCoordinates(15.0, NaN, 0.0), ValidationError);
  });

  test('Invalid depth throws ValidationError', () => {
    assert.throws(() => validateCoordinates(15.0, 70.0, -5.0), ValidationError);
    assert.throws(() => validateCoordinates(15.0, 70.0, 6500.0), ValidationError);
  });

  test('Supported variables pass; invalid variable throws ValidationError', () => {
    assert.equal(validateVariable('temperature'), 'temperature');
    assert.equal(validateVariable('TEMPERATURE'), 'temperature');
    assert.equal(validateVariable('salinity'), 'salinity');
    assert.equal(validateVariable('current_u'), 'current_u');
    assert.equal(validateVariable('current_v'), 'current_v');
    assert.equal(validateVariable('ssh'), 'ssh');

    assert.throws(() => validateVariable('random_var'), ValidationError);
    assert.throws(() => validateVariable('fake_var'), ValidationError);
  });

  test('Valid and latest ISO dates parse cleanly', () => {
    assert.equal(parseAndValidateIsoDate(null), null);
    assert.equal(parseAndValidateIsoDate(''), null);
    assert.equal(parseAndValidateIsoDate('latest'), null);

    const parsed = parseAndValidateIsoDate('2026-10-29T09:00:00Z');
    assert.ok(parsed instanceof Date);
    assert.equal(parsed.toISOString(), '2026-10-29T09:00:00.000Z');

    assert.throws(() => parseAndValidateIsoDate('not-a-date'), ValidationError);
  });

  test('Error responder generates correct status codes and prevents stack leaks', async () => {
    const valErrResp = errorResponse(new ValidationError('Invalid parameter'));
    assert.equal(valErrResp.status, 400);
    const valBody = await valErrResp.json();
    assert.equal(valBody.detail, 'Invalid parameter');
    assert.equal(valBody.stack, undefined); // No stack trace leak

    const timeoutResp = errorResponse(new HYCOMTimeoutError('Upstream timed out'));
    assert.equal(timeoutResp.status, 504);
    const timeoutBody = await timeoutResp.json();
    assert.equal(timeoutBody.detail, 'Upstream timed out');

    const upstreamResp = errorResponse(new HYCOMUpstreamError('THREDDS 502', 502));
    assert.equal(upstreamResp.status, 502);
  });
});
