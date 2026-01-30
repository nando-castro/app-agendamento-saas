import axios from 'axios';
import { getAdminToken } from './storage';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// “publicApi” não injeta bearer automaticamente
export const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
