import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import Login from './pages/Login';
import Notes from './pages/Notes';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Resources from './pages/Resources';
import Payment from './pages/Payment';
import Placeholder from './pages/Placeholder';
import StudentProfile from './pages/StudentProfile';
import AllMeetings from './pages/AllMeetings';

// Layout wrapper for authenticated routes
const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[var(--color-surface-muted)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar onMenuClick={() => setSidebarOpen((o) => !o)} />
      <main className="pl-0 pt-16 lg:pl-64 min-h-screen">
        <Outlet />
      </main>
      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-10 lg:hidden" aria-hidden onClick={() => setSidebarOpen(false)} />}
    </div>
  );
};

// Role-based route protection
const RoleRoute = ({ allowedRoles, children }) => {
  const { profile, loading } = useAuth();

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">Loading...</div>;

  const userRole = profile?.role?.toLowerCase();

  if (!allowedRoles.includes(userRole)) {
    if (userRole === 'student') return <Navigate to="/student-dashboard" replace />;
    if (userRole === 'instructor' || userRole === 'admin') return <Navigate to="/faculty-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Root redirect based on role
const RootRedirect = () => {
  const { profile, loading } = useAuth();

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">Loading...</div>;

  const userRole = profile?.role?.toLowerCase();

  if (userRole === 'student') return <Navigate to="/student-dashboard" replace />;
  if (userRole === 'instructor' || userRole === 'admin') return <Navigate to="/faculty-dashboard" replace />;

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedLayout />}>
            {/* Root redirects to role-specific dashboard */}
            <Route path="/" element={<RootRedirect />} />

            {/* Student-only routes */}
            <Route
              path="/student-dashboard"
              element={
                <RoleRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </RoleRoute>
              }
            />

            {/* Faculty-only routes (instructor role in DB) */}
            <Route
              path="/faculty-dashboard"
              element={
                <RoleRoute allowedRoles={['instructor', 'admin']}>
                  <FacultyDashboard />
                </RoleRoute>
              }
            />

            {/* Shared routes (both roles can access) */}
            <Route path="/notes" element={<Notes />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/announcements" element={<Placeholder />} />
            <Route path="/assignments" element={<Placeholder />} />
            <Route path="/library" element={<Placeholder />} />
            <Route path="/calendar" element={<Placeholder />} />
            <Route path="/schedule" element={<Placeholder />} />
            <Route path="/results" element={<Placeholder />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/request-letter" element={<Placeholder />} />
            <Route path="/attendance" element={<Placeholder />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/proposals" element={<Placeholder />} />
            <Route path="/lor" element={<Placeholder />} />
            <Route path="/profile" element={<StudentProfile />} />
            <Route path="/meetings" element={<AllMeetings />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
