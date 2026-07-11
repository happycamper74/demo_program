import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { OpsApiClient } from './api/ops-api-client.js';
import { OpsLayout } from './components/OpsLayout.js';
import { ActionCenterPage } from './pages/ActionCenterPage.js';
import { FunnelReportPage } from './pages/FunnelReportPage.js';
import { IndustryDemandPage } from './pages/IndustryDemandPage.js';
import { LiveOperationsPage } from './pages/LiveOperationsPage.js';
import { PlatformHealthPage } from './pages/PlatformHealthPage.js';
import { SessionHistoryPage } from './pages/SessionHistoryPage.js';

export const APP_NAME = 'operations-center' as const;

const opsApiClient = new OpsApiClient();

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<OpsLayout />}>
          <Route path="/" element={<Navigate to="/actions" replace />} />
          <Route path="/actions" element={<ActionCenterPage client={opsApiClient} />} />
          <Route path="/live" element={<LiveOperationsPage client={opsApiClient} />} />
          <Route path="/history" element={<SessionHistoryPage client={opsApiClient} />} />
          <Route path="/health" element={<PlatformHealthPage client={opsApiClient} />} />
          <Route path="/analytics/funnel" element={<FunnelReportPage client={opsApiClient} />} />
          <Route
            path="/analytics/industry"
            element={<IndustryDemandPage client={opsApiClient} />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/actions" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export { opsApiClient };
