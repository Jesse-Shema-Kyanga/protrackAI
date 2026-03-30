import { useState, useMemo, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AuthContext, { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Tasks from './pages/Tasks';
import ActivityAnalytics from './pages/ActivityAnalytics';
import SupervisorDashboard from './pages/SupervisorDashboard';
import HRDashboard from './pages/HRDashboard';
import WorkforceAnalytics from './pages/WorkforceAnalytics';
import Goals from './pages/Goals';
import TimeTracking from './pages/TimeTracking';
import Feedback from './pages/Feedback';
import Notifications from './pages/Notifications';
import AIManagement from './pages/AIManagement';
import ReviewQueue from './pages/ReviewQueue';
import Profile from './pages/Profile';
import LeaveManagement from './pages/LeaveManagement';
import OrgManagement from './pages/OrgManagement';
import EmployeeRiskProfile from './pages/EmployeeRiskProfile';
import { Box, Typography, GlobalStyles } from '@mui/material';

// Placeholder Pages (Remaining)
const Placeholder = ({ title }) => <Box p={3}><Typography variant="h4">{title} 🚧</Typography></Box>;

import { ThemeProvider } from '@mui/material/styles';
import getTheme from './theme';
import './App.css';

export const ColorModeContext = createContext({ toggleColorMode: () => { } });

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { io } from 'socket.io-client';
import { useEffect } from 'react';

// Socket instance
const socket = io('http://localhost:5000');

// Smart redirect based on role
const RoleBasedRedirect = () => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'hr') return <Navigate to="/hr-dashboard" replace />;
  if (user.role === 'supervisor') return <Navigate to="/supervisor-dashboard" replace />;
  return <Navigate to="/employee-dashboard" replace />;
};

// Protected route with role check
const RoleProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <RoleBasedRedirect />;
  return <Outlet />;
};

function App() {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');

  // Persist theme mode
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // Clean listeners on mount
  useEffect(() => {
    socket.on('connect', () => console.log('🟢 Socket connected'));

    socket.on('task-update', (data) => {
      toast.info(`New Task: ${data.task.title}`);
    });

    socket.on('task-completed', (data) => {
      toast.success(`${data.user} completed a task! 🎉`);
    });

    return () => {
      socket.off('connect');
      socket.off('task-update');
      socket.off('task-completed');
    }
  }, []);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <Router>
      <AuthProvider>
        <ColorModeContext.Provider value={colorMode}>
          <ThemeProvider theme={theme}>
            <GlobalStyles styles={{ '#root': { width: '100% !important', maxWidth: '100% !important' } }} />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected Routes */}
              <Route element={<PrivateRoute />}>
                <Route element={<Layout />}>
                  <Route path="/employee-dashboard" element={<EmployeeDashboard />} />

                  {/* Supervisor Only */}
                  <Route element={<RoleProtectedRoute allowedRoles={['supervisor', 'hr']} />}>
                    <Route path="/supervisor-dashboard" element={<SupervisorDashboard />} />
                    <Route path="/time" element={<TimeTracking />} />
                    <Route path="/ai-management" element={<AIManagement />} />
                    <Route path="/review-queue" element={<ReviewQueue />} />
                  </Route>

                  {/* HR Only */}
                  <Route element={<RoleProtectedRoute allowedRoles={['hr']} />}>
                    <Route path="/hr-dashboard" element={<HRDashboard />} />
                    <Route path="/hr-analytics" element={<WorkforceAnalytics />} />
                    <Route path="/org-management" element={<OrgManagement />} />
                    <Route path="/evaluations" element={<Feedback />} />
                    <Route path="/employee-risk/:userId" element={<EmployeeRiskProfile />} />
                  </Route>

                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/feedback" element={<Feedback />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/leave" element={<LeaveManagement />} />
                  <Route path="/analytics" element={<ActivityAnalytics />} />

                  {/* Smart Redirect root to correct dashboard */}
                  <Route path="/" element={<RoleBasedRedirect />} />
                </Route>
              </Route>
            </Routes>
          </ThemeProvider>
        </ColorModeContext.Provider>
      </AuthProvider>
      <ToastContainer position="bottom-right" theme="colored" />
    </Router>
  );
}

export default App;
