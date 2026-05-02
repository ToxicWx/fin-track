import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="not-found">
      <div className="eyebrow">404</div>
      <h1>Page not found</h1>
      <p>This route may not be implemented in the current interface yet.</p>
      <Link className="inline-link" to="/dashboard">
        Return to dashboard
      </Link>
    </div>
  );
}
