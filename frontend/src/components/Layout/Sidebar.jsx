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
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

const getNavItems = (role) => {
  if (role === 'admin') {
    return [
      { to: '/admin-dashboard', icon: Home, label: 'Admin Dashboard' },
      { to: '/announcements', icon: Megaphone, label: 'Announcement' },
      { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
      { to: '/allocation-dashboard', icon: CalendarDays, label: 'Allocations' },
      { to: '/users', icon: FileText, label: 'Users' },
      { to: '/student-letter-requests', icon: Mail, label: 'Letter Requests' },
      { to: '/faculty-requisitions', icon: Briefcase, label: 'Faculty Requisitions' },
      { to: '/roles', icon: FileText, label: 'Roles' },
      { to: '/system-logs', icon: FileText, label: 'Logs' },
    ];
  }

  if (role === 'dean') {
    return [
      { to: '/dean-dashboard', icon: Home, label: 'Dean Dashboard' },
      { to: '/analytics', icon: FileText, label: 'Analytics' },
      { to: '/departments', icon: FileText, label: 'Departments' },
      { to: '/reports', icon: FileText, label: 'Reports' },
    ];
  }

  if (role === 'hod') {
    return [
      { to: '/hod-dashboard', icon: Home, label: 'HOD Dashboard' },
      { to: '/allocation-dashboard', icon: CalendarDays, label: 'Allocations' },
      { to: '/faculty-dashboard', icon: Home, label: 'Instructor View' },
      { to: '/faculty', icon: FileText, label: 'Faculty List' },
      { to: '/approvals', icon: FileText, label: 'Leave Approvals' },
      { to: '/faculty-requisitions', icon: Briefcase, label: 'Requisitions' },
    ];
  }

  if (role === 'non_teaching') {
    return [
      { to: '/staff-dashboard', icon: Home, label: 'Staff Dashboard' },
      { to: '/finance', icon: CreditCard, label: 'Finance' },
      { to: '/admissions', icon: FileText, label: 'Admissions' },
      { to: '/records', icon: FolderOpen, label: 'Records' },
    ];
  }

  if (role === 'faculty') {
    return [
      { to: '/faculty-dashboard', icon: Home, label: 'Home' },
      { to: '/announcements', icon: Megaphone, label: 'Announcement' },
      { to: '/faculty-courses', icon: BookOpen, label: 'My Courses' },
      { to: '/faculty-assignments', icon: CheckSquare, label: 'Assignments' },
      { to: '/faculty-resources', icon: FolderOpen, label: 'Resources' },
      { to: '/library', icon: Library, label: 'Library' },
      { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
      { to: '/request-letter', icon: FileText, label: 'Requisitions' },
      { to: '/proposals', icon: FileText, label: 'Proposals' },
      { to: '/lor', icon: FileText, label: 'LOR' },
      { to: '/salary-slip', icon: CreditCard, label: 'Salary Slip' },
    ];
  }

  const base = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/announcements', icon: Megaphone, label: 'Announcement' },
    { to: '/student-courses', icon: GraduationCap, label: 'Courses' },
    { to: '/assignments', icon: FileText, label: 'Assignment' },
    { to: '/library', icon: Library, label: 'Library' },
    { to: '/calendar', icon: CalendarDays, label: 'Calender' },
    { to: '/schedule', icon: Calendar, label: 'Schedule' },
    { to: '/results', icon: Award, label: 'Result' },
    { to: '/payment', icon: CreditCard, label: 'Payment' },
    { to: '/request-letter', icon: Mail, label: 'Request Letter' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
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
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none mt-0.5">
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
