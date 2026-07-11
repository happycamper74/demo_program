import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PhoneInstructions } from '../components/PhoneInstructions.js';
import { ScenarioGuidance } from '../components/ScenarioGuidance.js';
import { Layout, PageCard } from '../components/Layout.js';
import { clearWaitlistConfirmation, loadDemoSession } from '../lib/session-storage.js';

export function InstructionsPage() {
  const navigate = useNavigate();
  const session = loadDemoSession();

  useEffect(() => {
    clearWaitlistConfirmation();
  }, []);

  if (!session) {
    return <Navigate to="/demo/industry" replace />;
  }

  return (
    <Layout>
      <PageCard title={session.instructionsTitle}>
        <PhoneInstructions
          phoneNumber={session.sharedDemoPhoneNumber}
          message={session.instructionsMessage}
        />
        <ScenarioGuidance examples={session.scenarioExamples} />
        <div className="button-row">
          <button
            type="button"
            className="primary"
            onClick={() => navigate('/demo/live')}
          >
            I&apos;m ready — show live progress
          </button>
        </div>
      </PageCard>
    </Layout>
  );
}
