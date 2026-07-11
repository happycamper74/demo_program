import { useEffect, useState } from 'react';
import type { OpsApiClient } from '../api/ops-api-client.js';

export function IndustryDemandPage({ client }: { client: OpsApiClient }) {
  const [rows, setRows] = useState<
    Array<{
      industry: string;
      industry_selected: number;
      demo_started: number;
      demo_completed: number;
      discovery_booked: number;
    }>
  >([]);

  useEffect(() => {
    void client.getIndustryDemandReport().then((response) => setRows(response.industries));
  }, [client]);

  return (
    <section>
      <h2>Industry Demand</h2>
      <table className="ops-table">
        <thead>
          <tr>
            <th>Industry</th>
            <th>Selected</th>
            <th>Demo started</th>
            <th>Demo completed</th>
            <th>Discovery booked</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.industry}>
              <td>{row.industry}</td>
              <td>{row.industry_selected}</td>
              <td>{row.demo_started}</td>
              <td>{row.demo_completed}</td>
              <td>{row.discovery_booked}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
