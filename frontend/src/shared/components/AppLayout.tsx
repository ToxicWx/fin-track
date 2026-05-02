import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../app/providers/use-auth';
import { Button } from './ui/Button';

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
  },
  {
    to: '/assets',
    label: 'Assets',
  },
  {
    to: '/converter',
    label: 'Converter',
  },
];

export function AppLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">FT</div>
          <div>
            <div className="brand-title">My Finance</div>
          </div>
        </div>

        <nav className="sidebar-nav sidebar-nav--rich">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link'
              }
            >
              <strong>{item.label}</strong>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <strong>{user?.email}</strong>
          <Button variant="ghost" onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>

      <main className="app-main">
        <header className="topbar topbar--dense">
          <div>
            <div className="eyebrow">Main</div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
