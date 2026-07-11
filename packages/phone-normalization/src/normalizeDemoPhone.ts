import parsePhoneNumber from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

import type { DemoMarket, PhoneNormalizationResult } from './types.js';

const DEFAULT_COUNTRY: Record<DemoMarket, CountryCode> = {
  NL: 'NL',
  US: 'US',
};

function isDemoMarket(market: string): market is DemoMarket {
  return market === 'NL' || market === 'US';
}

export function normalizeDemoPhone(
  rawPhone: string,
  market: DemoMarket,
): PhoneNormalizationResult {
  if (!isDemoMarket(market)) {
    return {
      ok: false,
      code: 'UNSUPPORTED_MARKET',
      message: 'Phone normalization is only supported for NL and US markets.',
    };
  }

  const trimmed = rawPhone.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: 'PHONE_REQUIRED',
      message: 'Phone number is required.',
    };
  }

  const parsed = parsePhoneNumber(trimmed, DEFAULT_COUNTRY[market]);
  if (!parsed?.isValid()) {
    return {
      ok: false,
      code: 'INVALID_PHONE',
      message: 'Enter a valid phone number for the selected market.',
    };
  }

  return {
    ok: true,
    e164: parsed.number,
    display: parsed.formatInternational(),
    countryCode: market,
  };
}
