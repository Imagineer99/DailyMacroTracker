import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../utils/api';

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  validateCredentials: (username: string, password: string) => { valid: boolean; errors: string[] };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Client-side validation for credentials
  const validateCredentials = useCallback((username: string, password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!username || username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (username && !/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }, []);

  // Check if token is expired
  const isTokenExpired = useCallback((token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error parsing token:', error);
      return true;
    }
  }, []);

  // Logout function with cleanup
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    api.setAuthToken(null);
  }, []);

  // Check and refresh token
  const checkTokenValidity = useCallback(async () => {
    const storedToken = localStorage.getItem('authToken');
    
    if (!storedToken) {
      setLoading(false);
      return;
    }

    // Check if token is expired
    if (isTokenExpired(storedToken)) {
      console.log('Token expired, logging out');
      logout();
      setLoading(false);
      return;
    }

    // Token is valid, verify with backend
    try {
      const response = await api.getUserData();
      if (!response.success) {
        console.log('Token invalid on server, logging out');
        logout();
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      logout();
    }
    
    setLoading(false);
  }, [isTokenExpired, logout]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('authUser');
      
      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          
          // Check if token is expired
          if (isTokenExpired(storedToken)) {
            console.log('Token expired, logging out');
            logout();
            setLoading(false);
            return;
          }

          // Set initial state
          setToken(storedToken);
          setUser(userData);
          api.setAuthToken(storedToken);
          
          // Verify token with backend
          const response = await api.getUserData();
          if (!response.success) {
            console.log('Token invalid on server, logging out');
            logout();
          }
        } catch (error) {
          console.error('Failed to initialize auth state:', error);
          logout();
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Set up token expiration check interval
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      if (isTokenExpired(token)) {
        console.log('Token expired during session, logging out');
        logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [token, isTokenExpired, logout]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Client-side validation
    const validation = validateCredentials(username, password);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('. ') };
    }

    try {
      const response = await api.login(username.trim(), password);
      
      if (response.success && response.data) {
        const { token: newToken, user: userData } = response.data;
        
        // Update auth state only after successful login
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('authUser', JSON.stringify(userData));
        api.setAuthToken(newToken);
        
        return { success: true };
      } else {
        // Return error from server
        return { 
          success: false, 
          error: response.error || 'Invalid username or password'
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      // Return error from server if available
      return { 
        success: false, 
        error: error.response?.data?.error || 'An unexpected error occurred. Please try again.'
      };
    }
  };

  const register = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Client-side validation
    const validation = validateCredentials(username, password);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('. ') };
    }

    try {
      setLoading(true);
      const response = await api.register(username.trim(), password);
      
      if (response.success && response.data) {
        const { token: newToken, user: userData } = response.data;
        
        setToken(newToken);
        setUser(userData);
        
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('authUser', JSON.stringify(userData));
        
        api.setAuthToken(newToken);
        
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user && !!token,
    validateCredentials
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 