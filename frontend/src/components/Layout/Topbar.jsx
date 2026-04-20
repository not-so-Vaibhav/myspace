import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, Youtube, Instagram, Facebook, Twitter, Linkedin, HandCoins, UserSquare2, Mail, Medal, Briefcase, Monitor, FileText, Calendar, GraduationCap, FolderOpen } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [index, setIndex] = useState([]); // Searchable items
  const [showResults, setShowResults] = useState(false);

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

  // Global Search Indexer
  useEffect(() => {
    if (!profile) return;
    
    const buildSearchIndex = async () => {
      try {
        const items = [];
        
        // 1. Fetch Courses
        const { data: courses } = await (role === 'student' 
          ? supabase.from('student_enrollments').select('allocation:subject_allocations(subject:subjects(name,code))').eq('student_id', profile.id)
          : supabase.from('subject_allocations').select('subject:subjects(name,code)').eq('faculty_id', profile.id));
        
        (courses || []).forEach(c => {
          const s = c.allocation?.subject || c.subject;
          if (s) items.push({ type: 'Course', label: s.name, sub: s.code, to: role === 'student' ? '/student-courses' : '/faculty-courses' });
        });

        // 2. Fetch Assignments
        const { data: ass } = await supabase.from('assignments').select('title').limit(20);
        (ass || []).forEach(a => items.push({ type: 'Assignment', label: a.title, to: role === 'student' ? '/assignments' : '/faculty-assignments' }));

        // 3. Announcements
        const { data: ann } = await supabase.from('announcements').select('title').eq('status', 'approved').limit(10);
        (ann || []).forEach(a => items.push({ type: 'Announcement', label: a.title, to: '/announcements', icon: Bell }));

        // 4. Request Letters (Available Templates)
        const templates = [
          { label: 'Demand letter for B.Tech sem IV', sub: 'Institutional Fee Service', to: '/request-letter', type: 'Letter', icon: HandCoins },
          { label: 'MIT ADTU ID card', sub: 'Identity & Access', to: '/request-letter', type: 'Letter', icon: UserSquare2 },
          { label: 'MITSOC-No Dues Form', sub: 'Clearance Portal', to: '/request-letter', type: 'Letter', icon: Mail },
          { label: 'Migration Certificate', sub: 'Certification Portal', to: '/request-letter', type: 'Letter', icon: Medal },
          { label: 'Funds Demand', sub: 'Departmental Finance', to: '/request-letter', type: 'Letter', icon: HandCoins },
          { label: 'Research Funds', sub: 'Academic Grants', to: '/request-letter', type: 'Letter', icon: Medal },
          { label: 'Stationery & Furniture', sub: 'Infrastructure Requisition', to: '/request-letter', type: 'Letter', icon: Briefcase },
          { label: 'Digital & Software', sub: 'IT Service Portal', to: '/request-letter', type: 'Letter', icon: Monitor }
        ];
        items.push(...templates);

        // 5. Letter History (User specific)
        const { data: history } = await supabase.from('letter_requests').select('letter_type, status').eq('user_id', profile.id).limit(20);
        (history || []).forEach(h => items.push({ type: 'History', label: h.letter_type, sub: `Status: ${h.status}`, to: '/request-letter', icon: FileText }));

        // 6. Institutional Quick-Links
        items.push(
          { type: 'Service', label: 'Attendance Tracker', sub: 'Daily Engagement Log', to: '/attendance', icon: Calendar },
          { type: 'Service', label: 'Academic Results', sub: 'Performance Metrics', to: '/result', icon: GraduationCap },
          { type: 'Service', label: 'Education Resources', sub: 'Course Materials & Labs', to: '/resources', icon: FolderOpen }
        );

        setIndex(items);
      } catch (err) { console.error('Search indexing error:', err); }
    };

    buildSearchIndex();
  }, [profile, role]);

  // Search Logic
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const filtered = index.filter(item => 
      item.label.toLowerCase().includes(search.toLowerCase()) || 
      item.sub?.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 8);

    setResults(filtered);
    setShowResults(true);
  }, [search, index]);

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => search.trim() && setShowResults(true)}
            placeholder="Search courses, assignments, intelligence..."
            className="w-full pl-14 pr-6 py-3 bg-[#f4f6fa] border-2 border-transparent focus:border-[#1a1b4b]/10 rounded-full text-sm font-bold text-[#1a1b4b] placeholder:text-gray-400 outline-none transition-all shadow-inner"
          />
          
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-20 animate-in slide-in-from-top-2 duration-200">
              <div className="p-3">
                {results.length > 0 ? (
                  results.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        navigate(res.to);
                        setSearch('');
                        setShowResults(false);
                      }}
                      className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all group"
                    >
                      <div className="w-10 h-10 bg-[#f4f6fa] rounded-xl flex items-center justify-center text-[#1a1b4b] group-hover:bg-[#1a1b4b] group-hover:text-white transition-colors">
                        {res.icon ? <res.icon size={16} /> : <Search size={16} />}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 leading-none mb-1">{res.type}</p>
                        <p className="text-sm font-bold text-[#1a1b4b] leading-tight">{res.label}</p>
                        {res.sub && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{res.sub}</p>}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center opacity-30">
                    <Search className="mx-auto mb-2" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest">No matching intel detected</p>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Press ESC to dismiss vector search</p>
              </div>
            </div>
          )}
          {showResults && <div className="fixed inset-0 z-10" onClick={() => setShowResults(false)} />}
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
              <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[12px] font-black flex items-center justify-center rounded-full border-2 border-white animate-pulse">
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
