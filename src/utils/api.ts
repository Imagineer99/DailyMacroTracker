import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Base URL for API requests - use relative path so it works from the same server
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' 
  : window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : window.location.protocol === 'https:' 
      ? 'https://nutritiontracker.fit/api'
      : 'http://167.99.41.134:3001';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
  };
  message: string;
}

interface RegisterResponse {
  token: string;
  user: {
    id: string;
    username: string;
  };
  message: string;
}

interface UserData {
  customFoods: any[];
  dailyEntries: any[];
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  calculatorData?: {
    age: number;
    gender: 'male' | 'female';
    height: number;
    heightInches: number;
    weight: number;
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
    unitSystem: 'imperial' | 'metric';
  };
}

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 seconds
    });

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle common errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        // Only redirect on token expiration, not login failures
        if (error.response?.status === 401 && 
            error.config?.url !== '/api/auth/login' && 
            error.config?.url !== '/api/auth/register') {
          // Token expired or invalid (but not a login attempt)
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Set auth token for requests
  setAuthToken(token: string | null) {
    if (token) {
      this.axiosInstance.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      delete this.axiosInstance.defaults.headers.Authorization;
    }
  }

  // Generic request method
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.request({
        method,
        url,
        data,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`API ${method} ${url} error:`, error);
      
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to connect to server. Please check your internet connection.'
      };
    }
  }

  // Authentication methods
  async login(username: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('POST', '/api/auth/login', {
      username,
      password,
    });
  }

  async register(username: string, password: string): Promise<ApiResponse<RegisterResponse>> {
    return this.request<RegisterResponse>('POST', '/api/auth/register', {
      username,
      password,
    });
  }

  // User data methods
  async getUserData(): Promise<ApiResponse<UserData>> {
    return this.request<UserData>('GET', '/api/user/data');
  }

  async saveUserData(data: UserData): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('POST', '/api/user/data', data);
  }

  // Delete specific daily entry
  async deleteDailyEntry(entryId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('DELETE', `/api/user/daily-entry/${entryId}`);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request<{ status: string; timestamp: string }>('GET', '/api/health');
  }
}

// Export singleton instance
export const api = new ApiClient(); 