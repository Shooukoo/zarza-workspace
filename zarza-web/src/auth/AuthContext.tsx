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

type BackendUserProfile = {
  id: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
};

function toAuthUser(u: BackendUserProfile): AuthUser {
  return {
    sub: u.id,
    email: u.email,
    role: u.role,
    firstName: u.firstName,
    lastName: u.lastName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate session from existing cookie on mount
  useEffect(() => {
    apiClient
      .get<BackendUserProfile>('/auth/me')
      .then((res) => setUser(toAuthUser(res.data)))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<AuthUser> {
    // Backend devuelve { user: { id, email, role, firstName, lastName } }
    const res = await apiClient.post<{ user: BackendUserProfile }>(
      '/auth/login',
      { email, password },
    );
    const authUser = toAuthUser(res.data.user);
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
