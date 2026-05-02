import { createContext } from 'react';
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from '../../shared/types/api';

export type AuthContextValue = {
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (input: LoginInput) => Promise<AuthResponse>;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
