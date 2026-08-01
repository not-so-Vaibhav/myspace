import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';
// --- Student Pages ---
import StudentDashboard from './pages/Student/StudentDashboard';
import StudentProfile from './pages/Student/StudentProfile';
import StudentCourses from './pages/Student/StudentCourses';
import StudentAssignments from './pages/Student/StudentAssignments';
import StudentLetterRequests from './pages/Student/StudentLetterRequests';
import Attendance from './pages/Student/Attendance';
import Schedule from './pages/Student/Schedule';
import Results from './pages/Student/Results';
import CourseFeedback from './pages/Student/CourseFeedback';
import Notes from './pages/Student/Notes';
import Library from './pages/Student/Library';
import Discussions from './pages/Student/Discussions';
import CourseRegistration from './pages/Student/CourseRegistration';
import EnterpriseCreditDashboard from './pages/Student/EnterpriseCreditDashboard';
import StudentAcademicTimeline from './pages/Student/StudentAcademicTimeline';
import StudentClassBatchDashboard from './pages/Student/StudentClassBatchDashboard';

// --- Faculty Pages ---
import FacultyDashboard from './pages/Faculty/FacultyDashboard';
import FacultyProfile from './pages/Faculty/FacultyProfile';
import FacultyCourses from './pages/Faculty/FacultyCourses';
import FacultyAssignments from './pages/Faculty/FacultyAssignments';
import FacultyAttendance from './pages/Faculty/FacultyAttendance';
import FacultyList from './pages/Faculty/FacultyList';
import FacultyFeedbackAnalytics from './pages/Faculty/FacultyFeedbackAnalytics';
import FacultyProposals from './pages/Faculty/FacultyProposals';
import FacultyRequisitions from './pages/Faculty/FacultyRequisitions';
import FacultyResources from './pages/Faculty/FacultyResources';
import AssignmentCreate from './pages/Faculty/AssignmentCreate';
import AssignmentDetail from './pages/Faculty/AssignmentDetail';
import FacultyRegistrationDashboard from './pages/Faculty/FacultyRegistrationDashboard';
import FacultyBatchDashboard from './pages/Faculty/FacultyBatchDashboard';

// --- HOD Pages ---
import HODDashboard from './pages/HOD/HODDashboard';
import PerformanceAppraisal from './pages/HOD/PerformanceAppraisal';
import LOR from './pages/HOD/LOR';
import Proposals from './pages/HOD/Proposals';

// --- Dean Pages ---
import DeanDashboard from './pages/Dean/DeanDashboard';

// --- Admin Pages ---
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserManagement from './pages/Admin/UserManagement';
import Approvals from './pages/Admin/Approvals';
import AdmissionRequests from './pages/Admin/AdmissionRequests';
import AllocationAudit from './pages/Admin/AllocationAudit';
import AllocationDashboard from './pages/Admin/AllocationDashboard';
import ScheduleAllocation from './pages/Admin/ScheduleAllocation';
import Inventory from './pages/Admin/Inventory';
import Procurement from './pages/Admin/Procurement';
import Reports from './pages/Admin/Reports';
import AcademicRulesAdmin from './pages/Admin/AcademicRulesAdmin';
import StudentLifecycleAdmin from './pages/Admin/StudentLifecycleAdmin';
import AcademicPromotionAdmin from './pages/Admin/AcademicPromotionAdmin';
import AcademicRecordAdmin from './pages/Admin/AcademicRecordAdmin';
import GraduationAdmin from './pages/Admin/GraduationAdmin';
import CourseRegistrationAdmin from './pages/Admin/CourseRegistrationAdmin';
import EnterpriseCreditAdminPortal from './pages/Admin/EnterpriseCreditAdminPortal';
import ClassBatchAdminPortal from './pages/Admin/ClassBatchAdminPortal';
import EnterpriseReportCenter from './pages/Admin/EnterpriseReportCenter';
import EnterpriseAnalyticsDashboard from './pages/Admin/EnterpriseAnalyticsDashboard';
import EnterpriseBulkDataCenter from './pages/Admin/EnterpriseBulkDataCenter';
import Student360ProfileAdmin from './pages/Admin/Student360ProfileAdmin';
import EnterpriseAuditCenter from './pages/Admin/EnterpriseAuditCenter';

// --- Staff Pages ---
import StaffDashboard from './pages/Staff/StaffDashboard';
import LeaveApplication from './pages/Staff/LeaveApplication';
import Payment from './pages/Staff/Payment';
import RequestLetter from './pages/Staff/RequestLetter';
import Resources from './pages/Staff/Resources';
import SalarySlip from './pages/Staff/SalarySlip';

// --- Common / Shared Pages ---
import Dashboard from './pages/Common/Dashboard';
import Login from './pages/Common/Login';
import Register from './pages/Common/Register';
import Calendar from './pages/Common/Calendar';
import Announcements from './pages/Common/Announcements';
import AllMeetings from './pages/Common/AllMeetings';
import Courses from './pages/Common/Courses';
import CourseDetail from './pages/Common/CourseDetail';
import Placeholder from './pages/Common/Placeholder';

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
  const { user, profile, loading } = useAuth();

  // Send signed-out visitors straight to a visible screen while Supabase
  // restores any saved session in the background.
  if (!user) return <Navigate to="/login" replace />;

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

const ProfileSwitcher = () => {
  const { profile } = useAuth();
  const role = profile?.role?.toLowerCase();

  if (role === 'faculty' || role === 'hod' || role === 'dean' || role === 'admin') {
    return <FacultyProfile />;
  }
  return <StudentProfile />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RootRedirect />} />

          <Route element={<ProtectedLayout />}>
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

            <Route
              path="/schedule-allocation"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <ScheduleAllocation />
                </RoleRoute>
              }
            />

            {/* Academic Rules Engine – admin/dean/hod */}
            <Route
              path="/academic-rules"
              element={
                <RoleRoute allowedRoles={['admin', 'dean', 'hod']}>
                  <AcademicRulesAdmin />
                </RoleRoute>
              }
            />

            {/* Student Lifecycle Engine – admin/dean/hod */}
            <Route
              path="/student-lifecycle"
              element={
                <RoleRoute allowedRoles={['admin', 'dean', 'hod']}>
                  <StudentLifecycleAdmin />
                </RoleRoute>
              }
            />

            {/* Academic Promotion Engine – admin/dean/hod */}
            <Route
              path="/academic-promotion"
              element={
                <RoleRoute allowedRoles={['admin', 'dean', 'hod']}>
                  <AcademicPromotionAdmin />
                </RoleRoute>
              }
            />
            
            <Route path="/admin/academic-records" element={<AcademicRecordAdmin />} />
            <Route path="/admin/graduation" element={<GraduationAdmin />} />
            <Route path="/course-registration-admin" element={<RoleRoute allowedRoles={['admin', 'dean', 'hod']}><CourseRegistrationAdmin /></RoleRoute>} />
            <Route path="/admin/credits" element={<RoleRoute allowedRoles={['admin', 'dean', 'hod']}><EnterpriseCreditAdminPortal /></RoleRoute>} />
            <Route path="/admin/class-batches" element={<RoleRoute allowedRoles={['admin', 'dean', 'hod']}><ClassBatchAdminPortal /></RoleRoute>} />
            <Route path="/admin/report-center" element={<RoleRoute allowedRoles={['admin', 'dean', 'hod', 'faculty']}><EnterpriseReportCenter /></RoleRoute>} />
            <Route path="/admin/analytics-dashboard" element={<RoleRoute allowedRoles={['admin', 'dean', 'hod', 'faculty']}><EnterpriseAnalyticsDashboard /></RoleRoute>} />
            <Route path="/student/academic-timeline" element={<StudentAcademicTimeline />} />
            <Route path="/admin/bulk-data" element={<RoleRoute allowedRoles={['admin', 'dean', 'hod', 'faculty']}><EnterpriseBulkDataCenter /></RoleRoute>} />
            <Route path="/admin/student-360" element={<RoleRoute allowedRoles={['admin', 'dean', 'hod', 'faculty']}><Student360ProfileAdmin /></RoleRoute>} />
            <Route path="/admin/audit-center" element={<RoleRoute allowedRoles={['admin', 'dean', 'hod']}><EnterpriseAuditCenter /></RoleRoute>} />

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
            <Route path="/faculty-courses" element={<FacultyCourses />} />
            <Route path="/faculty-assignments" element={<FacultyAssignments />} />
            <Route path="/faculty-resources" element={<FacultyResources />} />
            <Route path="/student-courses" element={<StudentCourses />} />
            <Route path="/course-registration" element={<CourseRegistration />} />
            <Route path="/student/credits" element={<EnterpriseCreditDashboard />} />
            <Route path="/student/class-batch" element={<StudentClassBatchDashboard />} />
            <Route path="/faculty/course-registration" element={<FacultyRegistrationDashboard />} />
            <Route path="/faculty/class-batches" element={<FacultyBatchDashboard />} />
            <Route path="/faculty-attendance" element={<FacultyAttendance />} />
            <Route path="/discussions" element={<Discussions />} />
            <Route path="/users" element={<RoleRoute allowedRoles={['admin']}><UserManagement /></RoleRoute>} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/assignments" element={<StudentAssignments />} />
            <Route path="/library" element={<Library />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/results" element={<Results />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/request-letter" element={<RequestLetter />} />
            <Route path="/student-letter-requests" element={<RoleRoute allowedRoles={['admin', 'staff', 'non_teaching', 'hod']}><StudentLetterRequests /></RoleRoute>} />
            <Route path="/faculty-requisitions" element={<RoleRoute allowedRoles={['admin', 'hod']}><FacultyRequisitions /></RoleRoute>} />
            <Route path="/faculty-proposals" element={<RoleRoute allowedRoles={['admin', 'hod']}><FacultyProposals /></RoleRoute>} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/leave-application" element={<LeaveApplication />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/proposals" element={<Proposals />} />
            <Route path="/reports" element={<RoleRoute allowedRoles={['admin', 'dean', 'hod']}><Reports /></RoleRoute>} />
            <Route path="/audit/allocation/:id" element={<RoleRoute allowedRoles={['admin', 'dean', 'hod']}><AllocationAudit /></RoleRoute>} />
            <Route path="/inventory" element={<RoleRoute allowedRoles={['admin', 'dean']}><Inventory /></RoleRoute>} />
            <Route path="/procurement" element={<RoleRoute allowedRoles={['admin', 'dean']}><Procurement /></RoleRoute>} />
            <Route path="/admissions" element={<RoleRoute allowedRoles={['admin']}><AdmissionRequests /></RoleRoute>} />
            <Route path="/academic-feedback" element={<RoleRoute allowedRoles={['admin', 'dean']}><FacultyFeedbackAnalytics /></RoleRoute>} />
            <Route path="/performance-appraisal" element={<RoleRoute allowedRoles={['admin', 'faculty', 'hod', 'dean', 'non_teaching']}><PerformanceAppraisal /></RoleRoute>} />
            <Route path="/feedback" element={<CourseFeedback />} />
            <Route path="/lor" element={<LOR />} />
            <Route 
              path="/profile" 
              element={
                <RoleRoute allowedRoles={['student', 'faculty', 'hod', 'admin', 'dean', 'non_teaching']}>
                  <ProfileSwitcher />
                </RoleRoute>
              } 
            />
            <Route path="/meetings" element={<AllMeetings />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/faculty" element={<FacultyList />} />
            <Route path="/salary-slip" element={<RoleRoute allowedRoles={['faculty', 'admin', 'hod', 'non_teaching']}><SalarySlip /></RoleRoute>} />

            {/* Fallback Catch-All Route to prevent white screens on invalid URLs */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
