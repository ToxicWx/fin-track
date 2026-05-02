import { http } from './http';
import type {
  Asset,
  CreateAssetInput,
  DeleteResponse,
  RefreshAllResponse,
} from '../types/api';

export const assetsApi = {
  async getAssets() {
    const { data } = await http.get<Asset[]>('/assets');
    return data;
  },
  async createAsset(payload: CreateAssetInput) {
    const { data } = await http.post<Asset>('/assets', payload);
    return data;
  },
  async updateAsset(id: string, payload: Partial<CreateAssetInput>) {
    const { data } = await http.patch<Asset>(`/assets/${id}`, payload);
    return data;
  },
  async deleteAsset(id: string) {
    const { data } = await http.delete<DeleteResponse>(`/assets/${id}`);
    return data;
  },
  async refreshAsset(id: string) {
    const { data } = await http.post<Asset>(`/assets/${id}/refresh`);
    return data;
  },
  async refreshAllAssets() {
    const { data } = await http.post<RefreshAllResponse>('/assets/refresh-all');
    return data;
  },
};
