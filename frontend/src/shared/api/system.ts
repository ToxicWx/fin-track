import { http } from './http';
import type { HealthResponse } from '../types/api';

export const systemApi = {
  async getHealth() {
    const { data } = await http.get<HealthResponse>('/');
    return data;
  },
};
