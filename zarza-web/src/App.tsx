import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './auth/PrivateRoute';
import { LoginPage } from './auth/LoginPage';
import { AppShell } from './shared/AppShell';
import { Forbidden403Page } from './shared/Forbidden403Page';
import { NotFound404Page } from './shared/NotFound404Page';
import { DashboardPage } from './dashboard/DashboardPage';
import { CamposPage } from './campos/CamposPage';
import { SolicitudesPage } from './solicitudes/SolicitudesPage';
import { AnalisisPage } from './analisis/AnalisisPage';
import { UsersPage } from './admin/UsersPage';
import { Role } from './auth/types';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<Forbidden403Page />} />

      {/* Authenticated shell */}
      <Route element={<PrivateRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route
            element={
              <PrivateRoute allowedRoles={[Role.ADMIN, Role.PRODUCTOR]} />
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={[Role.ADMIN]} />}>
            <Route path="/usuarios" element={<UsersPage />} />
          </Route>

          <Route
            element={
              <PrivateRoute
                allowedRoles={[Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO]}
              />
            }
          >
            <Route path="/campos" element={<CamposPage />} />
          </Route>

          <Route
            element={
              <PrivateRoute
                allowedRoles={[Role.ADMIN, Role.AGRONOMO, Role.MONITOR]}
              />
            }
          >
            <Route path="/solicitudes" element={<SolicitudesPage />} />
          </Route>

          <Route
            element={
              <PrivateRoute allowedRoles={[Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR]} />
            }
          >
            <Route path="/analisis" element={<AnalisisPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound404Page />} />
    </Routes>
  );
}
