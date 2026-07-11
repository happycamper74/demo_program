import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DemoApiClient } from '../api/demo-api-client.js';
import { Layout, PageCard } from '../components/Layout.js';
import { loadDemoSession, updateDemoSessionToken } from '../lib/session-storage.js';

export function RecoveryPage({ client }: { client: DemoApiClient }) {
  const navigate = useNavigate();
  const session = loadDemoSession();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);

  if (!session) {
    return <Navigate to="/demo/industry" replace />;
  }

  async function handleRecover() {
    if (!session) {
      return;
    }

    setRecovering(true);
    setError(null);
    setMessage(null);

    try {
      const response = await client.recoverSession(
        session.experienceSessionId,
        session.experienceToken,
      );
      updateDemoSessionToken(response.experience_token);
      setMessage('Session recovered. You can continue where you left off.');
      navigate('/demo/live');
    } catch (recoverError) {
      setError(recoverError instanceof Error ? recoverError.message : 'Recovery failed.');
    } finally {
      setRecovering(false);
    }
  }

  return (
    <Layout>
      <PageCard title="Recover your demo session">
        <p>
          Your connection was interrupted. You can restore this demo session within the recovery
          window and receive a new temporary access token.
        </p>
        <div className="button-row">
          <button type="button" className="primary" disabled={recovering} onClick={() => void handleRecover()}>
            {recovering ? 'Recovering…' : 'Recover session'}
          </button>
          <button type="button" className="secondary" onClick={() => navigate('/demo/live')}>
            Return to live demo
          </button>
        </div>
        {message ? <p>{message}</p> : null}
        {error ? <p className="field-error">{error}</p> : null}
      </PageCard>
    </Layout>
  );
}
