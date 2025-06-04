import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, LoginCredentials } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { 
  setAuthToken, 
  getAuthToken, 
  setCurrentUser, 
  getCurrentUser, 
  logout as authLogout 
} from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAuthToken();
      const savedUser = getCurrentUser();
      
      if (token && savedUser) {
        try {
          // Verify token is still valid
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setCurrentUser(userData);
          } else {
            // Token is invalid, clean up
            authLogout();
          }
        } catch (error) {
          // Network error or other issue, clean up
          authLogout();
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', credentials);
      const { user, token } = await response.json();
      
      setAuthToken(token);
      setCurrentUser(user);
      setUser(user);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authLogout();
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
