import { Search, Bell, HelpCircle, Globe, Menu, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Topbar = ({ onMenuClick }) => {
  const { profile } = useAuth();
  const role = profile?.role?.toLowerCase();
  const displayRole = role === 'instructor' ? 'INSTRUCTOR' : role === 'admin' ? 'ADMIN' : 'STUDENT';

  return (
    <header className="h-16 bg-white border-b border-[var(--color-border-light)] flex items-center justify-between px-4 sm:px-6 fixed top-0 left-0 lg:left-64 right-0 z-10">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onMenuClick} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] rounded-[var(--radius-button)] lg:hidden" aria-label="Menu">
          <Menu size={20} />
        </button>
        <div className="relative w-80 max-w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" size={18} />
          <input
            type="text"
            placeholder="Search courses..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface-muted)] border-0 rounded-[var(--radius-button)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none transition-shadow"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button type="button" className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] rounded-[var(--radius-button)]" aria-label="Notifications">
          <Bell size={20} />
          <span className="sr-only">Notifications</span>
        </button>
        <button type="button" className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] rounded-[var(--radius-button)] hidden sm:block" aria-label="Help">
          <HelpCircle size={20} />
        </button>
        <button type="button" className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] rounded-[var(--radius-button)] hidden sm:block" aria-label="Language">
          <Globe size={20} />
        </button>

        <div className="flex items-center gap-3 pl-2 border-l border-[var(--color-border-light)]">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-[var(--color-text)]">{profile?.full_name || 'User'}</p>
            <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">{displayRole}</p>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-border-light)]">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-[var(--color-primary)]">
                {(profile?.full_name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <button type="button" className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-[var(--radius-button)]" aria-label="Add">
            <Plus size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
