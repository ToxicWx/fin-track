import type { ReactNode } from 'react';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  asideTitle: string;
  asideItems: string[];
  variant?: 'default' | 'minimal';
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  asideTitle,
  asideItems,
  variant = 'default',
  children,
}: AuthShellProps) {
  return (
    <div className={`auth-shell auth-shell--${variant}`}>
      <section className="auth-shell__content">
        <div className="auth-panel">
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
          {children}
        </div>
      </section>
      {variant === 'default' ? (
        <aside className="auth-shell__aside">
          <div className="mesh-card">
            <div className="mesh-card__label">{asideTitle}</div>
            <ul className="mesh-list">
              {asideItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
