import { http } from './http';
import type { DistributionItem, HistoryPoint, NetWorthResponse } from '../types/api';

export const analyticsApi = {
  async getNetWorth() {
    const { data } = await http.get<NetWorthResponse>('/analytics/net-worth');
    return data;
  },
  async getDistribution() {
    const { data } = await http.get<DistributionItem[]>('/analytics/distribution');
    return data;
  },
  async getHistory() {
    const { data } = await http.get<HistoryPoint[]>('/analytics/history');
    return data;
  },
};
