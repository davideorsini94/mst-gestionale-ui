import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { authService } from './AuthService';

// In production, always use relative /api path to go through nginx proxy
// In development, use VITE_API_URL if set
const API_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || '/api');

export const getApiBaseUrl = () => API_URL;

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = authService.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          authService.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    // Per FormData, non impostare Content-Type - axios lo farà automaticamente con il boundary
    const finalConfig = data instanceof FormData
      ? { ...config, headers: { ...config?.headers, 'Content-Type': undefined } }
      : config;
    const response = await this.client.post<T>(url, data, finalConfig);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  async getBlob(url: string): Promise<Blob> {
    const response = await this.client.get(url, { responseType: 'blob' });
    return response.data;
  }
}

export const apiService = new ApiService();
