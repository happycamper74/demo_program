import { useEffect, useState } from 'react';
import type { OpsApiClient, PlatformHealthComponent } from '../api/ops-api-client.js';

export function PlatformHealthPage({ client }: { client: OpsApiClient }) {
  const [components, setComponents] = useState<PlatformHealthComponent[]>([]);

  useEffect(() => {
    void client.getPlatformHealth().then((response) => setComponents(response.components));
  }, [client]);

  return (
    <section>
      <h2>Platform Health</h2>
      <table className="ops-table">
        <thead>
          <tr>
            <th>Component</th>
            <th>Status</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {components.map((component) => (
            <tr key={component.component}>
              <td>{component.component}</td>
              <td className={`ops-status-${component.status}`}>{component.status}</td>
              <td>{component.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
