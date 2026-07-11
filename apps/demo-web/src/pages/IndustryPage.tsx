import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndustrySelector } from '../components/IndustrySelector.js';
import { UnsupportedIndustryNotice } from '../components/UnsupportedIndustryNotice.js';
import { Layout, PageCard } from '../components/Layout.js';
import { recordClientAnalyticsEvent } from '../lib/analytics.js';
import { loadSelectedIndustry, saveSelectedIndustry } from '../lib/session-storage.js';
import { isIndustrySupported } from '../lib/validation.js';

export function IndustryPage() {
  const navigate = useNavigate();
  const [industry, setIndustry] = useState(loadSelectedIndustry() ?? '');

  function continueToQualification() {
    if (!industry) {
      return;
    }

    saveSelectedIndustry(industry);
    recordClientAnalyticsEvent('industry.selected', { industry });
    navigate('/demo/qualify');
  }

  return (
    <Layout>
      <PageCard title="Select your industry">
        <p className="muted">We use your industry to personalize the demo experience.</p>
        <IndustrySelector value={industry} onChange={setIndustry} />
        {industry && !isIndustrySupported(industry) ? <UnsupportedIndustryNotice /> : null}
        <div className="button-row">
          <button
            type="button"
            className="primary"
            disabled={!industry}
            onClick={continueToQualification}
          >
            Continue
          </button>
        </div>
      </PageCard>
    </Layout>
  );
}
