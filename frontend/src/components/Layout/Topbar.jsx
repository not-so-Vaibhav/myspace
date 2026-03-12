import { Search, Bell, Menu, Youtube, Instagram, Facebook, Twitter, Linkedin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Topbar = ({ onMenuClick }) => {
  const { profile } = useAuth();
  const role = profile?.role?.toLowerCase();
  const displayRole = role === 'instructor' ? 'INSTRUCTOR' : role === 'admin' ? 'ADMIN' : 'STUDENT';

  return (
    <header className="h-20 bg-white border-b border-[var(--color-border-light)] flex items-center justify-between px-6 sm:px-10 fixed top-0 left-0 lg:left-64 right-0 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onMenuClick} className="p-3 text-[#1a1b4b] hover:bg-[#f4f6fa] rounded-full lg:hidden" aria-label="Menu">
          <Menu size={24} strokeWidth={2.5} />
        </button>
        <div className="relative w-96 max-w-full hidden sm:block">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} strokeWidth={2.5} />
          <input
            type="text"
            placeholder="Search here..."
            className="w-full pl-14 pr-6 py-3 bg-[#f4f6fa] border-2 border-transparent focus:border-[#1a1b4b]/10 rounded-full text-sm font-bold text-[#1a1b4b] placeholder:text-gray-400 outline-none transition-all shadow-inner"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 pr-4 border-r border-[#f4f6fa]">
          <button type="button" className="p-3 text-gray-400 hover:text-[#1a1b4b] hover:bg-[#f4f6fa] rounded-full transition-all" aria-label="Notifications">
            <Bell size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex items-center gap-4 pl-2">
          <div className="hidden lg:flex items-center gap-2 mr-2">
            {[
              { Icon: Youtube },
              { Icon: Instagram },
              { Icon: Facebook },
              { Icon: Twitter },
              { Icon: Linkedin }
            ].map(({ Icon }, i) => (
              <a key={i} href="#" className={`w-8 h-8 rounded-full bg-[#f4f6fa] flex items-center justify-center transition-all hover:bg-[#1a1b4b] hover:text-white text-[#1a1b4b] shadow-sm border border-transparent active:scale-90`}>
                <Icon size={14} strokeWidth={2.5} />
              </a>
            ))}
          </div>
          <div className="w-11 h-11 rounded-full overflow-hidden bg-[#1a1b4b]/5 flex items-center justify-center border-2 border-[#f4f6fa] shadow-sm">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-black text-[#1a1b4b]">
                {(profile?.full_name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
