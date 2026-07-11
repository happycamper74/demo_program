import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DemoApiClient, DemoApiClientError, type StartDemoRequest } from '../api/demo-api-client.js';
import { QualificationForm } from '../components/QualificationForm.js';
import { UnsupportedIndustryNotice } from '../components/UnsupportedIndustryNotice.js';
import { Layout, PageCard } from '../components/Layout.js';
import { EXPERIENCE_DEFINITION_ID } from '../lib/constants.js';
import { loadSelectedIndustry, saveDemoSession } from '../lib/session-storage.js';
import { isIndustrySupported, type QualificationFormValues } from '../lib/validation.js';

function buildStartDemoPayload(
  values: QualificationFormValues,
  challengeCompleted: boolean,
): StartDemoRequest {
  const base: StartDemoRequest = {
    full_name: values.fullName,
    business_name: values.businessName,
    email: values.email,
    business_market: values.businessMarket as 'NL' | 'US' | 'OTHER',
    industry: values.industry,
    business_location: values.businessLocation,
    company_size: values.companySize,
    website: values.noWebsite ? undefined : values.website,
    no_website: values.noWebsite,
    biggest_challenge: values.biggestChallenge,
    implementation_timeframe: values.implementationTimeframe,
    experience_definition_id: EXPERIENCE_DEFINITION_ID,
    company_website_url: values.honeypot,
    challenge_completed: challengeCompleted,
  };

  if (values.businessMarket === 'OTHER') {
    return {
      ...base,
      country_name: values.countryName.trim(),
    };
  }

  return {
    ...base,
    phone_number: values.phoneE164 ?? undefined,
  };
}

export function QualificationPage({ client }: { client: DemoApiClient }) {
  const navigate = useNavigate();
  const industry = loadSelectedIndustry() ?? 'plumbing';
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [challengeRequired, setChallengeRequired] = useState(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const industrySupported = useMemo(() => isIndustrySupported(industry), [industry]);

  async function handleSubmit(values: QualificationFormValues) {
    setSubmitError(null);

    try {
      const response = await client.startDemo(buildStartDemoPayload(values, challengeCompleted));

      saveDemoSession({
        experienceSessionId: response.experience_session_id,
        experienceToken: response.experience_token,
        prospectId: response.prospect_id,
        sharedDemoPhoneNumber: response.shared_demo_phone_number,
        industry: values.industry,
        industrySupported: response.industry_supported,
        scenarioExamples:
          response.instructions?.scenario_examples ?? [
            'Blocked kitchen sink',
            'No hot water',
            'Leaking pipe',
          ],
        instructionsTitle: response.instructions?.title ?? 'Your interactive demo is ready',
        instructionsMessage:
          response.instructions?.message ??
          'Call the number below from the phone number you used to register.',
      });

      navigate('/demo/instructions');
    } catch (error) {
      if (error instanceof DemoApiClientError && error.code === 'CHALLENGE_REQUIRED') {
        setChallengeRequired(true);
        setSubmitError(error.message);
        return;
      }

      if (error instanceof DemoApiClientError && error.action === 'book_discovery') {
        setSubmitError(error.message);
        return;
      }

      setSubmitError(error instanceof Error ? error.message : 'Unable to start demo.');
    }
  }

  return (
    <Layout>
      <PageCard title="Tell us about your business">
        {!industrySupported ? <UnsupportedIndustryNotice /> : null}
        {challengeRequired ? (
          <div className="notice">
            <p>Verification placeholder: confirm you are a real person before starting the demo.</p>
            <label>
              <input
                type="checkbox"
                checked={challengeCompleted}
                onChange={(event) => setChallengeCompleted(event.target.checked)}
              />{' '}
              I confirm I am not an automated bot
            </label>
          </div>
        ) : null}
        <QualificationForm industry={industry} onSubmit={handleSubmit} />
        {submitError ? <p className="field-error">{submitError}</p> : null}
        {submitError && submitError.includes('Discovery Session') ? (
          <div className="button-row">
            <Link className="button-link primary" to="/demo/booking">
              Book Discovery Session
            </Link>
          </div>
        ) : null}
      </PageCard>
    </Layout>
  );
}
