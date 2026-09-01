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
  refreshUser: () => Promise<void>;
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
    // Backend devuelve { token, refreshToken, user } y setea access_token +
    // refresh_token como cookies httpOnly — no hace falta guardar nada aquí.
    const res = await apiClient.post<{ user: BackendUserProfile }>(
      '/auth/login',
      { email, password },
    );
    const authUser = toAuthUser(res.data.user);
    setUser(authUser);
    return authUser;
  }

  async function logout() {
    // El refresh token se lee de su cookie httpOnly en el backend.
    await apiClient.post('/auth/logout');
    setUser(null);
  }

  async function refreshUser(): Promise<void> {
    const res = await apiClient.get<BackendUserProfile>('/auth/me');
    setUser(toAuthUser(res.data));
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
