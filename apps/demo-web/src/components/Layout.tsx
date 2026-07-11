import { Link } from 'react-router-dom';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>LeadBoard Interactive Demo</h1>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

export function PageCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card stack" aria-labelledby="page-title">
      <h2 id="page-title">{title}</h2>
      {children}
    </section>
  );
}

export function PrimaryLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link className="button-link primary" to={to}>
      {children}
    </Link>
  );
}
