export type DemoMarket = 'NL' | 'US';

export type PhoneNormalizationErrorCode =
  | 'PHONE_REQUIRED'
  | 'INVALID_PHONE'
  | 'UNSUPPORTED_MARKET';

export type PhoneNormalizationResult =
  | {
      ok: true;
      e164: string;
      display: string;
      countryCode: DemoMarket;
    }
  | {
      ok: false;
      code: PhoneNormalizationErrorCode;
      message: string;
    };
