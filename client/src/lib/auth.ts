// JWT-based authentication utilities

const TOKEN_KEY = 'auth_token';

export interface AuthTokenPayload {
  username: string;
  role?: "admin" | "printer";
  exp: number;
  iat: number;
}

export const auth = {
  // Store JWT token in localStorage
  setToken: (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  // Get JWT token from localStorage
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Remove JWT token from localStorage
  removeToken: () => {
    localStorage.removeItem(TOKEN_KEY);
  },

  // Check if user is authenticated (has valid token)
  isAuthenticated: (): boolean => {
    const payload = auth.getTokenPayload();
    if (!payload) return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  },

  getTokenPayload: (): AuthTokenPayload | null => {
    const token = auth.getToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1])) as AuthTokenPayload;
    } catch {
      return null;
    }
  },

  // Get authorization header for API requests
  getAuthHeader: (): { Authorization: string } | {} => {
    const token = auth.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};
