import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface User {
  uuid: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: {
    code: string;
    description?: string;
    capabilities?: { capability: string }[];
  };
}

export interface LoginResponse {
  access_token: string;
  expiresIn: string;
  user: User;
}

class AuthService {
  private tokenKey = 'mst_token';
  private userKey = 'mst_user';

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await axios.post<LoginResponse>(`${API_URL}/auth/login`, {
      username,
      password,
    });

    const { access_token, user } = response.data;
    localStorage.setItem(this.tokenKey, access_token);
    localStorage.setItem(this.userKey, JSON.stringify(user));

    return response.data;
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    window.location.href = '/';
  }

  hasCapability(capability: string): boolean {
    const user = this.getUser();
    if (!user?.role?.capabilities) return false;
    return user.role.capabilities.some((c) => c.capability === capability);
  }

  getAuthHeader(): { Authorization: string } | {} {
    const token = this.getToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }
}

export const authService = new AuthService();
