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
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

const getNavItems = (role) => {
  const base = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/announcements', icon: Megaphone, label: 'Announcement' },
    { to: '/courses', icon: GraduationCap, label: 'Courses' },
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
    if (path === '/') return location.pathname === '/' || location.pathname === '/student-dashboard' || location.pathname === '/faculty-dashboard';
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
            className={`flex items-center gap-3 px-4 py-3 rounded-full text-sm font-bold transition-all ${isActive(to)
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
        <div className="flex items-center gap-3 px-4 py-4 rounded-3xl bg-gradient-to-br from-[#1a1b4b] to-[#2d3a8c] text-white shadow-lg">
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
              {profile?.role?.toLowerCase() === 'instructor' ? 'Instructor' : profile?.role?.toLowerCase() === 'admin' ? 'Admin' : 'Student'}
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 shadow-[0_0_6px_2px_rgba(74,222,128,0.5)]"></div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-full text-sm font-bold text-[#ef4444] hover:bg-red-50 transition-all shadow-sm active:scale-95"
        >
          <LogOut size={20} strokeWidth={2.5} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
