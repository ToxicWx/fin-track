import clsx from 'clsx';
import type { ReactNode } from 'react';

type BadgeProps = {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return <span className={clsx('badge', `badge--${tone}`)}>{children}</span>;
}
