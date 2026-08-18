import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PlannerWorkspace from './components/layout/PlannerWorkspace';
import SharedProjectPage from './pages/SharedProjectPage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { useAuthStore } from './features/auth/store/useAuthStore';
import { ToastProvider } from './components/ui/ToastProvider';

function App() {
  const token = useAuthStore(state => state.token);

  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={token ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/app/:projectId" 
            element={
              <ProtectedRoute>
                <PlannerWorkspace />
              </ProtectedRoute>
            } 
          />
          <Route path="/shared/:projectId" element={<SharedProjectPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
