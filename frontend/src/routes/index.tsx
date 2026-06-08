import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "@/layouts/AppLayout";
import Login from "@/pages/Login";
import Schedule from "@/pages/Schedule";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import UsersPage from "@/pages/admin/Users";
import ReportsPage from "@/pages/admin/Reports";
import ShiftManagement from "@/pages/admin/ShiftManagement";
import ProfilePage from "@/pages/profile/Profile";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/schedule" replace />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="admin/users"
          element={
            <RequireAdmin>
              <UsersPage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/shifts"
          element={
            <RequireAdmin>
              <ShiftManagement />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/reports"
          element={
            <RequireAdmin>
              <ReportsPage />
            </RequireAdmin>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
