import { useEffect, useState } from 'react';
import type { FunnelStageReport, OpsApiClient } from '../api/ops-api-client.js';

export function FunnelReportPage({ client }: { client: OpsApiClient }) {
  const [stages, setStages] = useState<FunnelStageReport[]>([]);

  useEffect(() => {
    void client.getFunnelReport().then((response) => setStages(response.stages));
  }, [client]);

  return (
    <section>
      <h2>Conversion Funnel</h2>
      <table className="ops-table">
        <thead>
          <tr>
            <th>Stage</th>
            <th>Count</th>
            <th>Drop-off</th>
            <th>Drop-off rate</th>
            <th>Avg seconds from previous</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage) => (
            <tr key={stage.stage}>
              <td>{stage.stage}</td>
              <td>{stage.count}</td>
              <td>{stage.drop_off_from_previous ?? '—'}</td>
              <td>{stage.drop_off_rate_from_previous ?? '—'}</td>
              <td>{stage.average_seconds_from_previous ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
