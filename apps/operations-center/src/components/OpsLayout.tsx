import { NavLink, Outlet } from 'react-router-dom';

export function OpsLayout() {
  return (
    <div className="ops-layout">
      <header className="ops-header">
        <h1>Operations Center</h1>
        <p className="muted">Internal operations workspace for the Experience Platform demo.</p>
        <nav className="ops-nav">
          <NavLink to="/actions">Action Center</NavLink>
          <NavLink to="/live">Live Operations</NavLink>
          <NavLink to="/history">Session History</NavLink>
          <NavLink to="/health">Platform Health</NavLink>
          <NavLink to="/analytics/funnel">Conversion Funnel</NavLink>
          <NavLink to="/analytics/industry">Industry Demand</NavLink>
        </nav>
      </header>
      <main className="ops-main">
        <Outlet />
      </main>
    </div>
  );
}
