import { describe, expect, it } from 'vitest';

import { PACKAGE_NAME, normalizeDemoPhone } from '../src/index.js';
import type { DemoMarket } from '../src/types.js';

describe('normalizeDemoPhone', () => {
  it('normalizes Dutch national format to +31 E.164', () => {
    const result = normalizeDemoPhone('0646275553', 'NL');
    expect(result).toEqual({
      ok: true,
      e164: '+31646275553',
      display: '+31 6 46275553',
      countryCode: 'NL',
    });
  });

  it('normalizes spaced Dutch input to the same E.164', () => {
    const compact = normalizeDemoPhone('0646275553', 'NL');
    const spaced = normalizeDemoPhone('06 4627 5553', 'NL');
    const e164 = compact.ok ? compact.e164 : null;

    expect(spaced.ok).toBe(true);
    expect(e164).toBe('+31646275553');
    if (spaced.ok) {
      expect(spaced.e164).toBe(e164);
    }
  });

  it('accepts Dutch numbers already in E.164', () => {
    const result = normalizeDemoPhone('+31646275553', 'NL');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.e164).toBe('+31646275553');
      expect(result.countryCode).toBe('NL');
    }
  });

  it('normalizes US national format to +1 E.164', () => {
    const result = normalizeDemoPhone('(213) 373-4253', 'US');
    expect(result).toEqual({
      ok: true,
      e164: '+12133734253',
      display: '+1 213 373 4253',
      countryCode: 'US',
    });
  });

  it('accepts US numbers already in E.164', () => {
    const result = normalizeDemoPhone('+12133734253', 'US');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.e164).toBe('+12133734253');
      expect(result.countryCode).toBe('US');
    }
  });

  it('returns PHONE_REQUIRED for empty input', () => {
    const result = normalizeDemoPhone('', 'NL');
    expect(result).toEqual({
      ok: false,
      code: 'PHONE_REQUIRED',
      message: 'Phone number is required.',
    });
  });

  it('returns PHONE_REQUIRED for whitespace-only input', () => {
    const result = normalizeDemoPhone('   ', 'US');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('PHONE_REQUIRED');
    }
  });

  it('returns INVALID_PHONE for invalid characters', () => {
    const result = normalizeDemoPhone('abc', 'NL');
    expect(result).toEqual({
      ok: false,
      code: 'INVALID_PHONE',
      message: 'Enter a valid phone number for the selected market.',
    });
  });

  it('returns INVALID_PHONE when a Dutch local number is parsed as US', () => {
    const result = normalizeDemoPhone('0646275553', 'US');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_PHONE');
    }
  });

  it('returns UNSUPPORTED_MARKET when OTHER is passed at runtime', () => {
    const result = normalizeDemoPhone('+31646275553', 'OTHER' as DemoMarket);
    expect(result).toEqual({
      ok: false,
      code: 'UNSUPPORTED_MARKET',
      message: 'Phone normalization is only supported for NL and US markets.',
    });
  });

  it('does not include e164 or display on failure paths', () => {
    const failures = [
      normalizeDemoPhone('', 'NL'),
      normalizeDemoPhone('abc', 'US'),
      normalizeDemoPhone('+31646275553', 'OTHER' as DemoMarket),
    ];

    for (const result of failures) {
      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty('e164');
      expect(result).not.toHaveProperty('display');
    }
  });
});

describe('@experience-platform/phone-normalization', () => {
  it('exports the package name', () => {
    expect(PACKAGE_NAME).toBe('@experience-platform/phone-normalization');
  });
});
