import {
  Home,
  Megaphone,
  GraduationCap,
  FileText,
  Library,
  Calendar,
  CalendarDays,
  Award,
  CreditCard,
  Mail,
  Clock,
  FolderOpen,
  LogOut,
  BookOpen,
  CheckSquare,
  Briefcase,
  Users,
  MessageSquare,
  MessageCircle,
  BarChart3,
  Package,
  ShoppingCart,
  UserPlus,
  Shield,
  Activity,
  TrendingUp,
  Layers,
  Database,
  Eye,
  Video
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

const getNavItems = (role) => {
  if (role === 'admin') {
    return [
      { to: '/admin-dashboard', icon: Home, label: 'Admin Dashboard' },
      { to: '/announcements', icon: Megaphone, label: 'Announcement' },
      { to: '/meetings', icon: Video, label: 'Meetings & Live Classes' },
      { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
      { to: '/allocation-dashboard', icon: CalendarDays, label: 'Allocations' },
      { to: '/users', icon: FileText, label: 'Users' },
      { to: '/student-letter-requests', icon: Mail, label: 'Letter Requests' },
      { to: '/faculty-requisitions', icon: Briefcase, label: 'Faculty Requisitions' },
      { to: '/faculty-proposals', icon: Briefcase, label: 'Faculty Proposals' },
      { to: '/approvals', icon: Clock, label: 'Leave Approvals' },
      { to: '/inventory', icon: Package, label: 'Inventory' },
      { to: '/procurement', icon: ShoppingCart, label: 'Procurement' },
      { to: '/academic-feedback', icon: BarChart3, label: 'Academic Feedback' },
      { to: '/performance-appraisal', icon: Award, label: 'Performance Appraisals' },
      { to: '/admissions', icon: UserPlus, label: 'Admission Requests' },
      { to: '/schedule-allocation', icon: Clock, label: 'Schedule Allocation' },
      { to: '/academic-rules', icon: Shield, label: 'Academic Rules Engine' },
      { to: '/student-lifecycle', icon: Activity, label: 'Student Lifecycle' },
      { to: '/academic-promotion', icon: TrendingUp, label: 'Academic Promotion' },
      { to: '/admin/academic-records', icon: FileText, label: 'Academic Records' },
      { to: '/admin/graduation', icon: GraduationCap, label: 'Graduation Processing' },
      { to: '/course-registration-admin', icon: BookOpen, label: 'Course Registration System' },
      { to: '/admin/credits', icon: Award, label: 'Credit System Admin' },
      { to: '/admin/class-batches', icon: Layers, label: 'Class & Batch Management' },
      { to: '/admin/report-center', icon: FileText, label: 'Enterprise Report Center' },
      { to: '/admin/analytics-dashboard', icon: BarChart3, label: 'Institutional Analytics' },
      { to: '/admin/bulk-data', icon: Database, label: 'Enterprise Bulk Data Hub' },
      { to: '/admin/student-360', icon: Eye, label: 'Student 360' },
      { to: '/admin/audit-center', icon: Shield, label: 'Audit Center' },
    ];
  }

  if (role === 'dean') {
    return [
      { to: '/dean-dashboard', icon: Home, label: 'Dean Dashboard' },
      { to: '/meetings', icon: Video, label: 'Meetings & Live Classes' },
      { to: '/approvals', icon: Clock, label: 'Leave Approvals' },
      { to: '/analytics', icon: FileText, label: 'Analytics' },
      { to: '/reports', icon: FileText, label: 'Reports' },
      { to: '/inventory', icon: Package, label: 'Inventory' },
      { to: '/procurement', icon: ShoppingCart, label: 'Procurement' },
      { to: '/academic-feedback', icon: BarChart3, label: 'Academic Feedback' },
      { to: '/performance-appraisal', icon: Award, label: 'Performance Appraisals' },
      { to: '/academic-rules', icon: Shield, label: 'Academic Rules Engine' },
      { to: '/student-lifecycle', icon: Activity, label: 'Student Lifecycle' },
      { to: '/academic-promotion', icon: TrendingUp, label: 'Academic Promotion' },
      { to: '/admin/academic-records', icon: FileText, label: 'Academic Records' },
      { to: '/admin/graduation', icon: GraduationCap, label: 'Graduation Processing' },
      { to: '/course-registration-admin', icon: BookOpen, label: 'Course Registration System' },
      { to: '/admin/class-batches', icon: Layers, label: 'Class & Batch Management' },
      { to: '/admin/report-center', icon: FileText, label: 'Enterprise Report Center' },
      { to: '/admin/analytics-dashboard', icon: BarChart3, label: 'Institutional Analytics' },
      { to: '/admin/bulk-data', icon: Database, label: 'Enterprise Bulk Data Hub' },
      { to: '/admin/student-360', icon: Eye, label: 'Student 360' },
      { to: '/admin/audit-center', icon: Shield, label: 'Audit Center' },
    ];
  }

  if (role === 'hod') {
    return [
      { to: '/hod-dashboard', icon: Home, label: 'HOD Dashboard' },
      { to: '/meetings', icon: Video, label: 'Meetings & Live Classes' },
      { to: '/leave-application', icon: FileText, label: 'Leave Application' },
      { to: '/discussions', icon: MessageSquare, label: 'Discussion' },
      { to: '/allocation-dashboard', icon: CalendarDays, label: 'Allocations' },
      { to: '/faculty-dashboard', icon: Home, label: 'Instructor View' },
      { to: '/faculty', icon: FileText, label: 'Faculty List' },
      { to: '/calendar', icon: Calendar, label: 'Calendar' },
      { to: '/performance-appraisal', icon: Award, label: 'Performance & Appraisal' },
      { to: '/faculty-proposals', icon: Briefcase, label: 'Proposals' },
      { to: '/faculty-requisitions', icon: Briefcase, label: 'Requisitions' },
      { to: '/approvals', icon: Clock, label: 'Leave Approvals' },
      { to: '/reports', icon: FileText, label: 'Reports' },
      { to: '/academic-feedback', icon: BarChart3, label: 'Academic Feedback' },
      { to: '/performance-appraisal', icon: Award, label: 'Performance Appraisals' },
      { to: '/academic-rules', icon: Shield, label: 'Academic Rules Engine' },
      { to: '/student-lifecycle', icon: Activity, label: 'Student Lifecycle' },
      { to: '/academic-promotion', icon: TrendingUp, label: 'Academic Promotion' },
      { to: '/admin/academic-records', icon: FileText, label: 'Academic Records' },
      { to: '/admin/graduation', icon: GraduationCap, label: 'Graduation Processing' },
      { to: '/course-registration-admin', icon: BookOpen, label: 'Course Registration System' },
      { to: '/admin/class-batches', icon: Layers, label: 'Class & Batch Management' },
      { to: '/admin/report-center', icon: FileText, label: 'Enterprise Report Center' },
      { to: '/admin/analytics-dashboard', icon: BarChart3, label: 'Institutional Analytics' },
      { to: '/admin/bulk-data', icon: Database, label: 'Enterprise Bulk Data Hub' },
      { to: '/admin/student-360', icon: Eye, label: 'Student 360' },
      { to: '/admin/audit-center', icon: Shield, label: 'Audit Center' },
    ];
  }

  if (role === 'non_teaching') {
    return [
      { to: '/staff-dashboard', icon: Home, label: 'Staff Dashboard' },
      { to: '/announcements', icon: Megaphone, label: 'Announcement' },
      { to: '/meetings', icon: Video, label: 'Meetings & Live Classes' },
      { to: '/library', icon: Library, label: 'Library' },
      { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
      { to: '/performance-appraisal', icon: Award, label: 'Performance & Appraisal' },
      { to: '/request-letter', icon: FileText, label: 'Requisitions' },
      { to: '/proposals', icon: FileText, label: 'Proposals' },
      { to: '/salary-slip', icon: CreditCard, label: 'Salary Slip' },
      { to: '/student-letter-requests', icon: Mail, label: 'Letter Requests' },
      { to: '/leave-application', icon: FileText, label: 'Leave Application' },
      { to: '/inventory', icon: Package, label: 'Inventory' },
      { to: '/procurement', icon: ShoppingCart, label: 'Procurement' },
    ];
  }

  if (role === 'faculty') {
    return [
      { to: '/faculty-dashboard', icon: Home, label: 'Home' },
      { to: '/meetings', icon: Video, label: 'Meetings & Live Classes' },
      { to: '/faculty-courses', icon: BookOpen, label: 'My Courses' },
      { to: '/performance-appraisal', icon: Award, label: 'Performance & Appraisal' },
      { to: '/request-letter', icon: FileText, label: 'Requisitions' },
      { to: '/proposals', icon: FileText, label: 'Proposals' },
      { to: '/lor', icon: FileText, label: 'LOR' },
      { to: '/salary-slip', icon: CreditCard, label: 'Salary Slip' },
      { to: '/faculty', icon: Users, label: 'Faculty Management' },
      { to: '/faculty/course-registration', icon: BookOpen, label: 'Course Registration' },
      { to: '/faculty/class-batches', icon: Layers, label: 'Class & Practical Batches' },
      { to: '/admin/report-center', icon: FileText, label: 'Enterprise Report Center' },
      { to: '/admin/analytics-dashboard', icon: BarChart3, label: 'Institutional Analytics' },
    ];
  }

  const base = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/announcements', icon: Megaphone, label: 'Announcement' },
    { to: '/meetings', icon: Video, label: 'Meetings & Live Classes' },
    { to: '/student-courses', icon: GraduationCap, label: 'Courses' },
    { to: '/course-registration', icon: BookOpen, label: 'Course Registration' },
    { to: '/student/credits', icon: Award, label: 'Credit Portfolio & Audit' },
    { to: '/student/class-batch', icon: Layers, label: 'Class & Practical Batch' },
    { to: '/student/academic-timeline', icon: Clock, label: 'Academic Audit Timeline' },
    { to: '/admin/report-center', icon: FileText, label: 'Student Report Center' },
    { to: '/discussions', icon: MessageSquare, label: 'Discussion' },
    { to: '/assignments', icon: FileText, label: 'Assignment' },
    { to: '/library', icon: Library, label: 'Library' },
    { to: '/calendar', icon: CalendarDays, label: 'Calender' },
    { to: '/schedule', icon: Calendar, label: 'Schedule' },
    { to: '/results', icon: Award, label: 'Result' },
    { to: '/payment', icon: CreditCard, label: 'Payment' },
    { to: '/request-letter', icon: Mail, label: 'Request Letter' },
    { to: '/leave-application', icon: FileText, label: 'Leave Application' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
    { to: '/feedback', icon: MessageCircle, label: 'Feedback' },
    { to: '/resources', icon: FolderOpen, label: 'Resources' },
  ];
  return base;
};

const Sidebar = ({ open = false, onClose }) => {
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const role = profile?.role?.toLowerCase();

  const navItems = getNavItems(role || 'student');

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/student-dashboard';
    if (path === '/faculty-dashboard') return location.pathname === '/faculty-dashboard';
    if (path === '/admin-dashboard') return location.pathname === '/admin-dashboard';
    if (path === '/dean-dashboard') return location.pathname === '/dean-dashboard';
    if (path === '/hod-dashboard') return location.pathname === '/hod-dashboard';
    if (path === '/staff-dashboard') return location.pathname === '/staff-dashboard';
    if (path === '/allocation-dashboard') return location.pathname === '/allocation-dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`h-screen w-64 bg-white border-r border-[var(--color-border-light)] flex flex-col fixed left-0 top-0 z-20 transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`} aria-label="Main navigation">
      <div className="p-6 border-b border-[var(--color-border-light)]">
        <Link to="/" className="flex items-center gap-2">
          <div className="text-xl font-black tracking-wider">
            <span className="text-[#1a1b4b]">MY</span><span className="text-[#ef4444]">SPACE</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 mt-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            onClick={() => onClose?.()}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive(to)
              ? 'bg-[#1a1b4b]/10 text-[#1a1b4b]'
              : 'text-gray-500 hover:bg-[#f4f6fa] hover:text-[#1a1b4b]'
              }`}
          >
            <Icon size={20} strokeWidth={2.5} />
            <span className="tracking-tight">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-[var(--color-border-light)] space-y-3">
        {/* Profile Section */}
        <Link to="/profile" onClick={() => onClose?.()} className="flex items-center gap-3 px-4 py-4 rounded-3xl bg-gradient-to-br from-[#1a1b4b] to-[#2d3a8c] text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all">
          <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-inner backdrop-blur-sm">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-lg font-black text-white">
                {(profile?.full_name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white tracking-tight truncate leading-tight">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-[12px] font-black text-white/50 uppercase tracking-widest leading-none mt-0.5">
              {profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Student'}
            </p>
          </div>
          <div className="w-2 h-2 bg-green-400 flex-shrink-0 shadow-[0_0_6px_2px_rgba(74,222,128,0.5)]"></div>
        </Link>

        {/* Logout Button */}
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-[#ef4444] hover:bg-red-50 transition-all shadow-sm active:scale-95"
        >
          <LogOut size={20} strokeWidth={2.5} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
