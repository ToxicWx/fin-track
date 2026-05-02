import { http } from './http';
import type { CurrencyRate } from '../types/api';

export const ratesApi = {
  async getRates() {
    const { data } = await http.get<CurrencyRate[]>('/aggregator/nbu/rates');
    return data;
  },
};
