import { Home, Mail, GraduationCap, FileText, Calendar, Clock, LayoutDashboard, FolderOpen, Settings, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

const getNavItems = (role) => {
  const base = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/messages', icon: Mail, label: 'Messages' },
    { to: '/courses', icon: GraduationCap, label: 'Courses' },
    { to: '/quizzes', icon: FileText, label: 'Assignments' },
    { to: '/schedule', icon: Calendar, label: 'Schedule' },
    { to: '/history', icon: Clock, label: 'Attendance' },
    { to: role === 'student' ? '/student-dashboard' : '/faculty-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/resources', icon: FolderOpen, label: 'Resources' },
    { to: '/settings', icon: Settings, label: 'Settings' },
    { to: '/alerts', icon: AlertTriangle, label: 'Notifications' },
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
      <div className="p-4 border-b border-[var(--color-border-light)]">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-blue)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
            L
          </div>
          <span className="text-lg font-bold text-[var(--color-text)]">MySpace</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            onClick={() => onClose?.()}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-button)] text-sm font-medium transition-colors ${
              isActive(to)
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <Icon size={20} strokeWidth={2} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--color-border-light)]">
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[var(--radius-button)] text-sm font-medium text-[var(--color-accent-rose)] hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
