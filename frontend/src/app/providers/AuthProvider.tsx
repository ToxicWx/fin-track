import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../../shared/api/auth';
import {
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  storeAuth,
} from '../../shared/lib/auth-storage';
import type { AuthUser } from '../../shared/types/api';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(getStoredToken()));

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const me = await authApi.me();
        setUser(me);
        storeAuth(token, me);
      } catch {
        clearStoredAuth();
        setToken(null);
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    void bootstrap();
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(token && user),
      isBootstrapping,
      token,
      user,
      async login(input) {
        const response = await authApi.login(input);
        setToken(response.accessToken);
        setUser(response.user);
        storeAuth(response.accessToken, response.user);
        return response;
      },
      async register(input) {
        const response = await authApi.register(input);
        setToken(response.accessToken);
        setUser(response.user);
        storeAuth(response.accessToken, response.user);
        return response;
      },
      logout() {
        clearStoredAuth();
        setToken(null);
        setUser(null);
      },
      async refreshMe() {
        const me = await authApi.me();
        setUser(me);
        if (token) {
          storeAuth(token, me);
        }
      },
    }),
    [isBootstrapping, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
