import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import InvestigationPage from './pages/InvestigationPage';
import SecurityManagement from './pages/SecurityManagement';
import SecurityRules from './pages/SecurityRules';
import Unauthorized from './pages/Unauthorized';
import Login from './pages/Login';

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) {
    return children;
  }

  const destination = role === 'admin' ? '/admin' : '/employee';
  return <Navigate to={destination} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route
      path="/login"
      element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      }
    />
    <Route
      path="/admin"
      element={
        <ProtectedRoute roles={['admin']}>
          <ErrorBoundary>
            <AdminDashboard />
          </ErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/investigate/:username"
      element={
        <ProtectedRoute roles={['admin']}>
          <ErrorBoundary>
            <InvestigationPage />
          </ErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/rules"
      element={
        <ProtectedRoute roles={['admin']}>
          <ErrorBoundary>
            <SecurityRules />
          </ErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/security"
      element={
        <ProtectedRoute roles={['admin']}>
          <ErrorBoundary>
            <SecurityManagement />
          </ErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/employee"
      element={
        <ProtectedRoute roles={['employee']}>
          <EmployeeDashboard />
        </ProtectedRoute>
      }
    />
    <Route path="/unauthorized" element={<Unauthorized />} />
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
