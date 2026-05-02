import { createContext } from 'react';

export type ToastTone = 'success' | 'warning' | 'danger';

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

export type ToastInput = Omit<ToastItem, 'id'>;

export type ToastContextValue = {
  pushToast: (input: ToastInput) => void;
};

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);
