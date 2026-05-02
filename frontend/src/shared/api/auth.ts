import { http } from './http';
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from '../types/api';

export const authApi = {
  async login(payload: LoginInput) {
    const { data } = await http.post<AuthResponse>('/auth/login', payload);
    return data;
  },
  async register(payload: RegisterInput) {
    const { data } = await http.post<AuthResponse>('/auth/register', payload);
    return data;
  },
  async me() {
    const { data } = await http.get<AuthUser>('/auth/me');
    return data;
  },
};
