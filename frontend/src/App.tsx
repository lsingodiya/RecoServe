import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Lookup from './pages/Lookup';
import Pipeline from './pages/Pipeline';
import LoginPage from './pages/LoginPage';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import ChatBot from './components/ChatBot';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, PermissionProtectedRoute } from './components/Guards';

// Inner component so it can use useAuth (which requires AuthProvider to be a parent)
function AppRoutes() {
  const { refreshPermissions } = useAuth();

  // When any API call returns a plain 403, silently sync permissions from DB.
  // This handles the case where an admin changed a role's permissions mid-session.
  useEffect(() => {
    const handler = () => refreshPermissions();
    window.addEventListener('auth:permission-denied', handler);
    return () => window.removeEventListener('auth:permission-denied', handler);
  }, [refreshPermissions]);

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="app-layout">
                <Sidebar />
                <main className="page-content">
                  <ChatBot />
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route
                      path="/lookup"
                      element={
                        <PermissionProtectedRoute requiredPermission="recommendations_view">
                          <Lookup />
                        </PermissionProtectedRoute>
                      }
                    />
                    <Route
                      path="/pipeline"
                      element={
                        <PermissionProtectedRoute requiredPermission="pipeline_run">
                          <Pipeline />
                        </PermissionProtectedRoute>
                      }
                    />
                    <Route
                      path="/users"
                      element={
                        <PermissionProtectedRoute requiredPermission="user_manage">
                          <UserManagement />
                        </PermissionProtectedRoute>
                      }
                    />
                    <Route
                      path="/roles"
                      element={
                        <PermissionProtectedRoute requiredPermission="user_manage">
                          <RoleManagement />
                        </PermissionProtectedRoute>
                      }
                    />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

