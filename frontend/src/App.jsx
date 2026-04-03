import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DeanDashboard from './pages/DeanDashboard';
import HODDashboard from './pages/HODDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AllocationDashboard from './pages/AllocationDashboard';
import Login from './pages/Login';
import Notes from './pages/Notes';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Resources from './pages/Resources';
import Payment from './pages/Payment';
import Placeholder from './pages/Placeholder';
import StudentProfile from './pages/StudentProfile';
import AllMeetings from './pages/AllMeetings';
import Approvals from './pages/Approvals';
import FacultyList from './pages/FacultyList';

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
    if (userRole === 'faculty') return <Navigate to="/faculty-dashboard" replace />;
    if (userRole === 'admin') return <Navigate to="/admin-dashboard" replace />;
    if (userRole === 'dean') return <Navigate to="/dean-dashboard" replace />;
    if (userRole === 'hod') return <Navigate to="/hod-dashboard" replace />;
    if (userRole === 'non_teaching') return <Navigate to="/staff-dashboard" replace />;

    // To prevent infinite loops with Login.jsx, unrecognized roles go to unauthorized instead of ping-ponging back to login.
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Root redirect based on role
const RootRedirect = () => {
  const { profile, loading } = useAuth();

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">Loading...</div>;

  const userRole = profile?.role?.toLowerCase();

  if (userRole === 'student') return <Navigate to="/student-dashboard" replace />;
  if (userRole === 'faculty') return <Navigate to="/faculty-dashboard" replace />;
  if (userRole === 'admin') return <Navigate to="/admin-dashboard" replace />;
  if (userRole === 'dean') return <Navigate to="/dean-dashboard" replace />;
  if (userRole === 'hod') return <Navigate to="/hod-dashboard" replace />;
  if (userRole === 'non_teaching') return <Navigate to="/staff-dashboard" replace />;

  return <Navigate to="/unauthorized" replace />;
};

const UnauthorizedFallback = () => {
  const { signOut } = useAuth();

  return (
    <div className="p-12 text-center space-y-6">
      <h1 className="text-3xl font-black text-red-500 uppercase tracking-widest">Unauthorized Role</h1>
      <p className="text-gray-500 font-bold uppercase text-sm tracking-widest">Your specific account role could not be authorized or mapped to a live dashboard.</p>
      <button
        onClick={signOut}
        className="px-6 py-2 bg-[#1a1b4b] text-white font-bold rounded-xl shadow-md uppercase text-xs tracking-widest hover:bg-[#2a2c6d] transition-colors"
      >
        Sign Out & Switch Account
      </button>
    </div>
  );
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

            {/* Faculty-only routes */}
            <Route
              path="/faculty-dashboard"
              element={
                <RoleRoute allowedRoles={['faculty', 'hod']}>
                  <FacultyDashboard />
                </RoleRoute>
              }
            />

            {/* Admin-only routes */}
            <Route
              path="/admin-dashboard"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </RoleRoute>
              }
            />

            {/* Admin/HOD Academic Allocator */}
            <Route
              path="/allocation-dashboard"
              element={
                <RoleRoute allowedRoles={['admin', 'hod']}>
                  <AllocationDashboard />
                </RoleRoute>
              }
            />

            {/* Dean-only routes */}
            <Route
              path="/dean-dashboard"
              element={
                <RoleRoute allowedRoles={['dean']}>
                  <DeanDashboard />
                </RoleRoute>
              }
            />

            {/* HOD-only routes */}
            <Route
              path="/hod-dashboard"
              element={
                <RoleRoute allowedRoles={['hod', 'admin']}>
                  <HODDashboard />
                </RoleRoute>
              }
            />

            {/* Staff-only routes */}
            <Route
              path="/staff-dashboard"
              element={
                <RoleRoute allowedRoles={['non_teaching']}>
                  <StaffDashboard />
                </RoleRoute>
              }
            />

            {/* Shared routes (both roles can access) */}
            <Route path="/unauthorized" element={<UnauthorizedFallback />} />
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
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/faculty" element={<FacultyList />} />

            {/* Fallback Catch-All Route to prevent white screens on invalid URLs */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
