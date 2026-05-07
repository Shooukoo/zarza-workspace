import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { apiClient } from '../api/client';
import { AuthUser, Role } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate session from existing cookie on mount
  useEffect(() => {
    apiClient
      .get<AuthUser>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<AuthUser> {
    // Backend returns { user: { id, email, role } } — normalize id → sub to match AuthUser
    const res = await apiClient.post<{
      user: { id: string; email: string; role: Role };
    }>('/auth/login', { email, password });
    const u = res.data.user;
    const authUser: AuthUser = { sub: u.id, email: u.email, role: u.role };
    setUser(authUser);
    return authUser;
  }

  async function logout() {
    await apiClient.post('/auth/logout');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
