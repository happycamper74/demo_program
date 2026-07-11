import { SUPPORTED_INDUSTRY } from './constants.js';

export interface QualificationFormValues {
  fullName: string;
  businessName: string;
  email: string;
  phoneNumber: string;
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
}

export function isIndustrySupported(industry: string): boolean {
  return industry.trim().toLowerCase() === SUPPORTED_INDUSTRY;
}

export function validateQualificationForm(
  values: QualificationFormValues,
): QualificationValidationResult {
  const errors: Record<string, string> = {};

  if (values.honeypot.trim().length > 0) {
    errors.form = 'Unable to start demo right now.';
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

  if (!values.phoneNumber.trim()) {
    errors.phoneNumber = 'Phone number is required.';
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
  };
}
