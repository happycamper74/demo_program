import { normalizeDemoPhone } from '@experience-platform/phone-normalization';
import type { DemoMarket } from '@experience-platform/phone-normalization';

import {
  COUNTRY_NAME_MAX_LENGTH,
  SUPPORTED_INDUSTRY,
  type BusinessMarket,
} from './constants.js';

export type { BusinessMarket };

export interface QualificationFormValues {
  businessMarket: BusinessMarket | '';
  countryName: string;
  fullName: string;
  businessName: string;
  email: string;
  phoneNumber: string;
  phoneE164: string | null;
  industry: string;
  businessLocation: string;
  companySize: string;
  website: string;
  noWebsite: boolean;
  biggestChallenge: string;
  implementationTimeframe: string;
  honeypot: string;
}

export interface QualificationValidationResult {
  readonly valid: boolean;
  readonly errors: Record<string, string>;
  readonly normalizedPhoneE164: string | null;
  readonly normalizedPhoneDisplay: string | null;
}

export function isSupportedBusinessMarket(
  market: BusinessMarket | '',
): market is DemoMarket {
  return market === 'NL' || market === 'US';
}

export function applyBusinessMarketChange(
  next: BusinessMarket,
  current: Pick<QualificationFormValues, 'phoneNumber' | 'phoneE164' | 'countryName'>,
): Pick<QualificationFormValues, 'phoneNumber' | 'phoneE164' | 'countryName'> {
  if (next === 'OTHER') {
    return {
      phoneNumber: '',
      phoneE164: null,
      countryName: current.countryName,
    };
  }

  return {
    phoneNumber: '',
    phoneE164: null,
    countryName: '',
  };
}

export function isIndustrySupported(industry: string): boolean {
  return industry.trim().toLowerCase() === SUPPORTED_INDUSTRY;
}

export function validateQualificationForm(
  values: QualificationFormValues,
): QualificationValidationResult {
  const errors: Record<string, string> = {};
  let normalizedPhoneE164: string | null = null;
  let normalizedPhoneDisplay: string | null = null;

  if (values.honeypot.trim().length > 0) {
    errors.form = 'Unable to start demo right now.';
  }

  if (!values.businessMarket) {
    errors.businessMarket = 'Please select your business market.';
  }

  if (!values.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  }

  if (!values.businessName.trim()) {
    errors.businessName = 'Business name is required.';
  }

  if (!values.email.trim()) {
    errors.email = 'Email is required.';
  }

  if (values.businessMarket === 'OTHER') {
    const countryName = values.countryName.trim();
    if (!countryName) {
      errors.countryName = 'Country is required.';
    } else if (countryName.length > COUNTRY_NAME_MAX_LENGTH) {
      errors.countryName = 'Country must be 100 characters or fewer.';
    }
  } else if (isSupportedBusinessMarket(values.businessMarket)) {
    const phoneResult = normalizeDemoPhone(values.phoneNumber, values.businessMarket);
    if (!phoneResult.ok) {
      errors.phoneNumber =
        phoneResult.code === 'PHONE_REQUIRED'
          ? 'Phone number is required.'
          : phoneResult.message;
    } else {
      normalizedPhoneE164 = phoneResult.e164;
      normalizedPhoneDisplay = phoneResult.display;
    }
  }

  if (!values.businessLocation.trim()) {
    errors.businessLocation = 'Business location is required.';
  }

  if (!values.companySize.trim()) {
    errors.companySize = 'Company size is required.';
  }

  if (!values.noWebsite && !values.website.trim()) {
    errors.website = 'Website is required unless you select No website.';
  }

  if (!values.biggestChallenge.trim()) {
    errors.biggestChallenge = 'Please select your biggest challenge.';
  }

  if (!values.implementationTimeframe.trim()) {
    errors.implementationTimeframe = 'Please select an implementation timeframe.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedPhoneE164,
    normalizedPhoneDisplay,
  };
}
