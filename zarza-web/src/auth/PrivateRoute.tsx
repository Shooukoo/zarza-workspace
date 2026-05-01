import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './useAuth';
import { Role } from './types';

interface PrivateRouteProps {
  allowedRoles?: Role[];
}

export function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Spin size="large" fullscreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
