import { normalizeDemoPhone } from '@experience-platform/phone-normalization';
import { useState } from 'react';
import {
  BUSINESS_MARKET_OPTIONS,
  CHALLENGE_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  COUNTRY_NAME_MAX_LENGTH,
  IMPLEMENTATION_TIMEFRAME_OPTIONS,
  type BusinessMarket,
} from '../lib/constants.js';
import {
  applyBusinessMarketChange,
  isSupportedBusinessMarket,
  validateQualificationForm,
  type QualificationFormValues,
} from '../lib/validation.js';

interface QualificationFormProps {
  industry: string;
  onSubmit: (values: QualificationFormValues) => Promise<void>;
}

const initialValues = (industry: string): QualificationFormValues => ({
  businessMarket: '',
  countryName: '',
  fullName: '',
  businessName: '',
  email: '',
  phoneNumber: '',
  phoneE164: null,
  industry,
  businessLocation: '',
  companySize: '',
  website: '',
  noWebsite: false,
  biggestChallenge: '',
  implementationTimeframe: '',
  honeypot: '',
});

export function QualificationForm({ industry, onSubmit }: QualificationFormProps) {
  const [values, setValues] = useState<QualificationFormValues>(initialValues(industry));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateQualificationForm({ ...values, industry });
    setErrors(validation.errors);

    if (!validation.valid) {
      return;
    }

    const submittedValues: QualificationFormValues = {
      ...values,
      industry,
      phoneE164: validation.normalizedPhoneE164,
      phoneNumber: validation.normalizedPhoneDisplay ?? values.phoneNumber,
    };

    setSubmitting(true);
    try {
      await onSubmit(submittedValues);
    } finally {
      setSubmitting(false);
    }
  }

  function updateField<K extends keyof QualificationFormValues>(
    key: K,
    value: QualificationFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleBusinessMarketChange(next: BusinessMarket) {
    setValues((current) => ({
      ...current,
      businessMarket: next,
      ...applyBusinessMarketChange(next, current),
    }));
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.businessMarket;
      delete nextErrors.phoneNumber;
      delete nextErrors.countryName;
      return nextErrors;
    });
  }

  function handlePhoneBlur() {
    if (!isSupportedBusinessMarket(values.businessMarket)) {
      return;
    }

    const result = normalizeDemoPhone(values.phoneNumber, values.businessMarket);
    if (!result.ok) {
      setErrors((current) => ({
        ...current,
        phoneNumber:
          result.code === 'PHONE_REQUIRED' ? 'Phone number is required.' : result.message,
      }));
      setValues((current) => ({ ...current, phoneE164: null }));
      return;
    }

    setValues((current) => ({
      ...current,
      phoneNumber: result.display,
      phoneE164: result.e164,
    }));
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.phoneNumber;
      return nextErrors;
    });
  }

  function handlePhoneChange(value: string) {
    setValues((current) => ({ ...current, phoneNumber: value, phoneE164: null }));
  }

  const isOtherMarket = values.businessMarket === 'OTHER';
  const isSupportedMarket = isSupportedBusinessMarket(values.businessMarket);
  const submitLabel = isOtherMarket
    ? submitting
      ? 'Joining waitlist…'
      : 'Join waitlist'
    : submitting
      ? 'Starting demo…'
      : 'Start interactive demo';

  return (
    <form className="stack" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="company_website_url">Company website URL</label>
        <input
          id="company_website_url"
          name="company_website_url"
          tabIndex={-1}
          autoComplete="off"
          value={values.honeypot}
          onChange={(event) => updateField('honeypot', event.target.value)}
        />
      </div>

      <fieldset className="field">
        <legend>Business market</legend>
        {BUSINESS_MARKET_OPTIONS.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name="businessMarket"
              value={option.value}
              checked={values.businessMarket === option.value}
              onChange={() => handleBusinessMarketChange(option.value)}
            />{' '}
            {option.label}
          </label>
        ))}
        {errors.businessMarket ? (
          <span className="field-error">{errors.businessMarket}</span>
        ) : null}
      </fieldset>

      <div className="field">
        <label htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          value={values.fullName}
          onChange={(event) => updateField('fullName', event.target.value)}
        />
        {errors.fullName ? <span className="field-error">{errors.fullName}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="businessName">Business name</label>
        <input
          id="businessName"
          value={values.businessName}
          onChange={(event) => updateField('businessName', event.target.value)}
        />
        {errors.businessName ? <span className="field-error">{errors.businessName}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={values.email}
          onChange={(event) => updateField('email', event.target.value)}
        />
        {errors.email ? <span className="field-error">{errors.email}</span> : null}
      </div>

      {isSupportedMarket ? (
        <div className="field">
          <label htmlFor="phoneNumber">Phone number</label>
          <input
            id="phoneNumber"
            type="tel"
            value={values.phoneNumber}
            onChange={(event) => handlePhoneChange(event.target.value)}
            onBlur={handlePhoneBlur}
          />
          {errors.phoneNumber ? <span className="field-error">{errors.phoneNumber}</span> : null}
        </div>
      ) : null}

      {isOtherMarket ? (
        <div className="field">
          <label htmlFor="countryName">Country</label>
          <input
            id="countryName"
            value={values.countryName}
            maxLength={COUNTRY_NAME_MAX_LENGTH}
            onChange={(event) => updateField('countryName', event.target.value)}
          />
          {errors.countryName ? <span className="field-error">{errors.countryName}</span> : null}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="businessLocation">Business location</label>
        <input
          id="businessLocation"
          value={values.businessLocation}
          onChange={(event) => updateField('businessLocation', event.target.value)}
        />
        {errors.businessLocation ? (
          <span className="field-error">{errors.businessLocation}</span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="companySize">Company size</label>
        <select
          id="companySize"
          value={values.companySize}
          onChange={(event) => updateField('companySize', event.target.value)}
        >
          <option value="">Select company size</option>
          {COMPANY_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.companySize ? <span className="field-error">{errors.companySize}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          value={values.website}
          disabled={values.noWebsite}
          onChange={(event) => updateField('website', event.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={values.noWebsite}
            onChange={(event) => updateField('noWebsite', event.target.checked)}
          />{' '}
          No website
        </label>
        {errors.website ? <span className="field-error">{errors.website}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="biggestChallenge">Biggest business challenge</label>
        <select
          id="biggestChallenge"
          value={values.biggestChallenge}
          onChange={(event) => updateField('biggestChallenge', event.target.value)}
        >
          <option value="">Select a challenge</option>
          {CHALLENGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.biggestChallenge ? (
          <span className="field-error">{errors.biggestChallenge}</span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="implementationTimeframe">Implementation timeframe</label>
        <select
          id="implementationTimeframe"
          value={values.implementationTimeframe}
          onChange={(event) => updateField('implementationTimeframe', event.target.value)}
        >
          <option value="">Select timeframe</option>
          {IMPLEMENTATION_TIMEFRAME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.implementationTimeframe ? (
          <span className="field-error">{errors.implementationTimeframe}</span>
        ) : null}
      </div>

      {errors.form ? <p className="field-error">{errors.form}</p> : null}

      <button type="submit" className="primary" disabled={submitting}>
        {submitLabel}
      </button>
    </form>
  );
}
