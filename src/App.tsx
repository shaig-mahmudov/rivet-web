import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { TasksPage } from './pages/TasksPage';
import { BlockedTasksPage } from './pages/BlockedTasksPage';
import { DeletedTasksPage } from './pages/DeletedTasksPage';
import { UsersPage } from './pages/UsersPage';

// Private Route Guard
const PrivateRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        Restoring session...
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

// Admin Guard
const AdminRoute = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        Verifying permissions...
      </div>
    );
  }

  return user && isAdmin ? <Outlet /> : <Navigate to="/" replace />;
};

// Main Layout Wrapper for Authenticated Pages
const AppLayout = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <Outlet />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Private Routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/blocked-tasks" element={<BlockedTasksPage />} />
              <Route path="/deleted-tasks" element={<DeletedTasksPage />} />
              
              {/* Admin Protected Routes */}
              <Route element={<AdminRoute />}>
                <Route path="/admin/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          {/* Wildcard Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
