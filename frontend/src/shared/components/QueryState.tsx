import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

type QueryStateProps<T> = {
  query: UseQueryResult<T>;
  children: ReactNode;
};

export function QueryState<T>({ query, children }: QueryStateProps<T>) {
  if (query.isLoading) {
    return <div className="empty-state">Loading data...</div>;
  }

  if (query.isError) {
    return <div className="form-error">Failed to load data.</div>;
  }

  return <>{children}</>;
}
