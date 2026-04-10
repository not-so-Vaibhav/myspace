import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, Youtube, Instagram, Facebook, Twitter, Linkedin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const XLogo = ({ size = 14 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor"
  >
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153ZM17.61 20.644h2.039L6.486 3.24H4.298L17.61 20.644Z" />
  </svg>
);

const Topbar = ({ onMenuClick }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role?.toLowerCase();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    
    const fetchNotificationCount = async () => {
      try {
        const lastRead = localStorage.getItem(`last_read_announcements_${profile.id}`) || new Date(0).toISOString();
        
        let count = 0;

        // 1. Get count of new approved announcements based on role
        let query = supabase
          .from('announcements')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gt('created_at', lastRead);

        if (role === 'admin') {
          // Admin sees everything, no extra filter
        } else if (['faculty', 'instructor', 'hod'].includes(role)) {
          query = query.in('target_audience', ['faculty', 'both']);
        } else if (role === 'student') {
          query = query.in('target_audience', ['student', 'both']);
        }

        const { count: approvedCount, error: e1 } = await query;
        if (!e1) count += (approvedCount || 0);

        // 2. If admin, check for pending approvals
        if (role === 'admin') {
          const { count: pendingCount, error: e2 } = await supabase
            .from('announcements')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending');
          if (!e2) count += (pendingCount || 0);
        }

        setUnreadCount(count);
      } catch (err) {
        console.error('Notification fetch error:', err);
      }
    };

    fetchNotificationCount();
    // Poll every 60 seconds for new announcements
    const interval = setInterval(fetchNotificationCount, 60000);
    return () => clearInterval(interval);
  }, [profile, role]);

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
          <button 
            type="button" 
            onClick={() => navigate('/announcements')}
            className="p-3 text-gray-400 hover:text-[#1a1b4b] hover:bg-[#f4f6fa] rounded-full transition-all relative" 
            aria-label="Notifications"
          >
            <Bell size={20} strokeWidth={2.5} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-4 pl-2">
          <div className="hidden lg:flex items-center gap-2 mr-2">
            {[
              { Icon: Youtube, href: 'https://www.youtube.com/c/MITADTUniversityPune' },
              { Icon: Instagram, href: 'https://www.instagram.com/mitadtuniversity/?hl=en' },
              { Icon: Facebook, href: 'https://www.facebook.com/mitadtuniversity/' },
              { Icon: XLogo, href: 'https://x.com/mitadtpune' },
              { Icon: Linkedin, href: 'https://www.linkedin.com/school/mit-adtuniversity/posts/?feedView=all' }
            ].map(({ Icon, href }, i) => (
              <a 
                key={i} 
                href={href} 
                target="_blank" 
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-[#f4f6fa] flex items-center justify-center transition-all hover:bg-[#1a1b4b] hover:text-white text-[#1a1b4b] shadow-sm border border-transparent active:scale-90"
              >
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
