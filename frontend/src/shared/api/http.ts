import axios from 'axios';
import { getStoredToken } from '../lib/auth-storage';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const http = axios.create({
  baseURL,
});

http.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
