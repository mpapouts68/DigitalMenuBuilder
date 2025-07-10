import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Staff, LoginResponse, CacheData } from '@shared/schema';

interface AuthContextType {
  staff: Staff | null;
  token: string | null;
  cacheData: CacheData | null;
  login: (pin: string) => Promise<LoginResponse>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cacheData, setCacheData] = useState<CacheData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedToken = localStorage.getItem('pos_token');
    const savedStaff = localStorage.getItem('pos_staff');
    
    if (savedToken && savedStaff) {
      setToken(savedToken);
      setStaff(JSON.parse(savedStaff));
      loadCacheData(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadCacheData = async (authToken: string) => {
    try {
      const response = await fetch('/api/cache', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCacheData(data);
      }
    } catch (error) {
      console.error('Failed to load cache data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (pin: string): Promise<LoginResponse> => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      });

      const result = await response.json();
      
      if (result.success && result.staff && result.token) {
        setStaff(result.staff);
        setToken(result.token);
        localStorage.setItem('pos_token', result.token);
        localStorage.setItem('pos_staff', JSON.stringify(result.staff));
        
        // Load cache data after successful login
        await loadCacheData(result.token);
      }
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error' };
    }
  };

  const logout = () => {
    setStaff(null);
    setToken(null);
    setCacheData(null);
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_staff');
  };

  const value = {
    staff,
    token,
    cacheData,
    login,
    logout,
    isAuthenticated: !!staff && !!token,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}