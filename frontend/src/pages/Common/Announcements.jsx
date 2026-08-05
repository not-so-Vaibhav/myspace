import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Megaphone, Plus, Calendar as CalIcon, Users, Loader2,
  Paperclip, ExternalLink, Trash2, Heart, FileText,
  Clock, CheckCircle, XCircle, Send, Bell, AlertTriangle,
  Settings, Search, Filter, SlidersHorizontal
} from 'lucide-react';
import { format, parseISO, endOfDay } from 'date-fns';
import notificationApi from '../../api/notificationApi';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'];
const isImageUrl = (url) => {
  if (!url) return false;
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  return IMAGE_EXTS.includes(ext);
};
const LIKED_KEY = (userId) => `liked_announcements_${userId}`;

const Announcements = () => {
  const { profile } = useAuth();
  const role = profile?.role?.toLowerCase();
  const isAdmin = role === 'admin';
  const isFacultyLike = ['faculty', 'instructor', 'hod'].includes(role);

  const [announcements, setAnnouncements] = useState([]);
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [likedIds, setLikedIds] = useState(new Set());
  const [deadlineReminders, setDeadlineReminders] = useState([]);
  const [personalReminders, setPersonalReminders] = useState([]);
  const [deadlinesLoading, setDeadlinesLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [preferences, setPreferences] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('active'); // 'active' | 'pending' (admin only)

  const [form, setForm] = useState({
    title: '',
    description: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'),
    target_audience: 'both',
    priority: 'MEDIUM',
    category: 'ANNOUNCEMENT',
    target_scope: 'UNIVERSITY',
    is_pinned: false,
    file: null
  });

  useEffect(() => {
    if (profile?.id) {
      const stored = localStorage.getItem(LIKED_KEY(profile.id));
      if (stored) setLikedIds(new Set(JSON.parse(stored)));
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchAnnouncements();
    if (profile?.id) {
      if (role === 'student') fetchDeadlineReminders();
      fetchPersonalReminders();
    }
    // Mark as read when page is visited
    if (profile?.id) {
      localStorage.setItem(`last_read_notifications_${profile.id}`, new Date().toISOString());
    }
  }, [profile?.id]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      // Fetch approved announcements (visible to all)
      const { data: approved, error: e1 } = await supabase
        .from('announcements')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (e1) throw e1;
      setAnnouncements(approved || []);

      // Fetch pending (admins see all pending; faculty see only their own pending)
      if (isAdmin) {
        const { data: pending, error: e2 } = await supabase
          .from('announcements')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (e2) throw e2;
        setPendingList(pending || []);
      } else if (isFacultyLike) {
        const { data: myPending, error: e3 } = await supabase
          .from('announcements')
          .select('*')
          .eq('status', 'pending')
          .eq('created_by', profile.id)
          .order('created_at', { ascending: false });
        if (e3) throw e3;
        setPendingList(myPending || []);
      }
    } catch (err) {
      setError('Failed to load: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeadlineReminders = async () => {
    setDeadlinesLoading(true);
    try {
      // 1. Get student enrollments
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('allocation_id');

      const allocIds = enrollments?.map(e => e.allocation_id) || [];
      if (allocIds.length === 0) return;

      // 2. Get assignments with deadlines in next 24 hours
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const { data: assignments } = await supabase
        .from('course_materials')
        .select('*, allocation:subject_allocations(subject:subjects(name,code))')
        .in('allocation_id', allocIds)
        .eq('type', 'Assignment')
        .gte('deadline', now.toISOString())
        .lte('deadline', tomorrow.toISOString());

      if (!assignments?.length) {
        setDeadlineReminders([]);
        return;
      }

      // 3. Filter out submitted ones
      const { data: submissions } = await supabase
        .from('student_submissions')
        .select('material_id')
        .eq('student_id', profile.id)
        .in('material_id', assignments.map(a => a.id));

      const submittedIds = new Set(submissions?.map(s => s.material_id) || []);
      const pendingDeadlines = assignments.filter(a => !submittedIds.has(a.id));

      setDeadlineReminders(pendingDeadlines);
    } catch (err) {
      console.error("Error fetching deadline reminders:", err);
    } finally {
      setDeadlinesLoading(false);
    }
  };

  const fetchPersonalReminders = async () => {
    try {
      const { data: events, error } = await supabase
        .from('personal_events')
        .select('*')
        .eq('user_id', profile.id);
      
      if (error) throw error;
      if (!events) return;

      const now = new Date();
      
      const activeReminders = events.filter(e => {
        if (e.reminder === 'none') return false;
        
        const eventStart = new Date(`${e.start_date}T${e.start_time || '00:00'}`);
        if (isNaN(eventStart.getTime())) return false;
        
        let reminderTime;
        const ms = 60 * 60 * 1000;
        if (e.reminder === '1h') reminderTime = new Date(eventStart.getTime() - 1 * ms);
        else if (e.reminder === '2h') reminderTime = new Date(eventStart.getTime() - 2 * ms);
        else if (e.reminder === '4h') reminderTime = new Date(eventStart.getTime() - 4 * ms);
        else if (e.reminder === '12h') reminderTime = new Date(eventStart.getTime() - 12 * ms);
        else if (e.reminder === '1d') reminderTime = new Date(eventStart.getTime() - 24 * ms);
        
        return now >= reminderTime && now < eventStart;
      });
      
      setPersonalReminders(activeReminders.map(rem => ({
        id: rem.id,
        title: rem.title,
        startDate: rem.start_date,
        startTime: rem.start_time,
        reminder: rem.reminder
      })));
    } catch (err) {
      console.error("Error fetching personal reminders:", err);
    }
  };

  const showMsg = (setter, msg) => { setter(msg); setTimeout(() => setter(null), 4000); };

  const toggleLike = (id) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(LIKED_KEY(profile.id), JSON.stringify([...next]));
      return next;
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return;
    setSubmitting(true);
    setError(null);
    try {
      let attachmentUrl = null;
      if (form.file) {
        const ext = form.file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('announcements').upload(fileName, form.file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('announcements').getPublicUrl(fileName);
        attachmentUrl = urlData.publicUrl;
      }

      const statusVal = isAdmin ? 'approved' : 'pending';

      // Route through backend API (uses service role key, bypasses RLS)
      const res = await notificationApi.publishAnnouncement({
        title: form.title,
        description: form.description,
        start_date: form.start_date,
        end_date: form.end_date,
        targetAudience: form.target_audience,
        priority: form.priority || 'MEDIUM',
        category: form.category || 'ANNOUNCEMENT',
        targetScope: form.target_scope || 'UNIVERSITY',
        isPinned: Boolean(form.is_pinned),
        attachmentUrl,
        createdBy: profile.id,
        status: statusVal,
        submittedByName: profile.full_name || profile.email || 'Faculty'
      });

      const data = res?.data;
      if (!data) throw new Error('No data returned from server');

      if (isAdmin) {
        setAnnouncements(prev => [data, ...prev]);
        showMsg(setSuccess, 'Announcement published!');
      } else {
        setPendingList(prev => [data, ...prev]);
        showMsg(setSuccess, 'Request sent to Admin for approval!');
      }

      setForm({
        title: '', description: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'),
        target_audience: 'both',
        priority: 'MEDIUM',
        category: 'ANNOUNCEMENT',
        target_scope: 'UNIVERSITY',
        is_pinned: false,
        file: null
      });
      setShowForm(false);
    } catch (err) {
      showMsg(setError, err.message || 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (ann) => {
    try {
      // Use backend API (service role) to bypass RLS
      await notificationApi.updateAnnouncement(ann.id, { status: 'approved' });
      setPendingList(prev => prev.filter(p => p.id !== ann.id));
      setAnnouncements(prev => [{ ...ann, status: 'approved' }, ...prev]);
      showMsg(setSuccess, `"${ann.title}" approved and published!`);
    } catch (err) {
      // Fallback to direct Supabase if backend method not available
      try {
        const { error } = await supabase
          .from('announcements')
          .update({ status: 'approved' })
          .eq('id', ann.id);
        if (error) throw error;
        setPendingList(prev => prev.filter(p => p.id !== ann.id));
        setAnnouncements(prev => [{ ...ann, status: 'approved' }, ...prev]);
        showMsg(setSuccess, `"${ann.title}" approved and published!`);
      } catch (fallbackErr) {
        showMsg(setError, fallbackErr.message);
      }
    }
  };

  const handleReject = async (ann) => {
    const reason = window.prompt('Optional: Enter a reason for rejection');
    try {
      await notificationApi.updateAnnouncement(ann.id, { status: 'rejected', reject_reason: reason || '' });
      setPendingList(prev => prev.filter(p => p.id !== ann.id));
      showMsg(setSuccess, 'Announcement rejected.');
    } catch (err) {
      // Fallback
      try {
        const { error } = await supabase
          .from('announcements')
          .update({ status: 'rejected', reject_reason: reason || '' })
          .eq('id', ann.id);
        if (error) throw error;
        setPendingList(prev => prev.filter(p => p.id !== ann.id));
        showMsg(setSuccess, 'Announcement rejected.');
      } catch (fallbackErr) {
        showMsg(setError, fallbackErr.message);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showMsg(setSuccess, 'Deleted.');
    } catch (err) {
      showMsg(setError, err.message);
    }
  };

  const matchesFilter = (a) => {
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (a.title || '').toLowerCase().includes(q);
      const matchDesc = (a.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    if (categoryFilter !== 'ALL' && a.category && a.category !== categoryFilter) {
      return false;
    }
    if (priorityFilter !== 'ALL' && a.priority && a.priority !== priorityFilter) {
      return false;
    }
    return true;
  };

  const isActive = (a) => new Date() <= endOfDay(parseISO(a.end_date));
  const filteredAnnouncements = announcements.filter(matchesFilter);
  const activeAnnouncements = filteredAnnouncements.filter(isActive);
  const pastAnnouncements = filteredAnnouncements.filter(a => !isActive(a));
  const savedAnnouncements = filteredAnnouncements.filter(a => likedIds.has(a.id));

  if (loading) return (
    <div className="p-12 flex items-center justify-center min-h-[40vh]">
      <Loader2 className="animate-spin w-8 h-8 text-[#1a1b4b] mr-3" />
      <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Loading...</span>
    </div>
  );

  const AnnouncementCard = ({ ann, past = false }) => {
    const liked = likedIds.has(ann.id);
    const hasImage = isImageUrl(ann.attachment_url);
    const isCritical = ann.priority === 'CRITICAL';
    return (
      <div className={`bg-white rounded-[1.75rem] overflow-hidden shadow-sm border border-gray-100 flex flex-col transition-all hover:shadow-md hover:-translate-y-0.5 ${past ? 'opacity-60 hover:opacity-100' : ''} ${isCritical ? 'border-l-4 border-l-red-500 bg-red-50/10' : ''}`}>
        {hasImage && (
          <div className="relative w-full overflow-hidden" style={{ paddingBottom: '58%' }}>
            <img src={ann.attachment_url} alt={ann.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </div>
        )}
        <div className="p-6 flex flex-col flex-1 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {isCritical && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse">
                <AlertTriangle size={10} /> Critical
              </span>
            )}
            {isActive(ann) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-[12px] font-black uppercase tracking-widest border border-red-100">
                <Megaphone size={10} /> Live
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-400 rounded-lg text-[12px] font-black uppercase tracking-widest border border-gray-100">
              <CalIcon size={10} /> {format(parseISO(ann.start_date), 'MMM dd')} – {format(parseISO(ann.end_date), 'MMM dd, yy')}
            </span>
            {ann.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-black uppercase tracking-widest border border-indigo-100">
                {ann.category}
              </span>
            )}
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[12px] font-black uppercase tracking-widest border border-indigo-100">
                <Users size={10} /> {ann.target_audience}
              </span>
            )}
          </div>
          <div className="flex items-start gap-3">
            <h2 className="text-xl font-black text-[#1a1b4b] leading-tight flex-1">{ann.title}</h2>
            {!isAdmin && (
              <button
                onClick={() => toggleLike(ann.id)}
                className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border transition-all ${
                  liked ? 'bg-red-500 border-red-400 scale-110' : 'bg-white border-gray-200 hover:border-red-300 hover:scale-105'
                }`}
              >
                <Heart size={18} strokeWidth={liked ? 0 : 2} fill={liked ? 'white' : 'none'} className={liked ? 'text-white' : 'text-gray-400'} />
              </button>
            )}
          </div>
          <p className={`text-sm text-gray-500 leading-relaxed font-medium ${past ? 'line-clamp-2' : 'line-clamp-4'}`}>{ann.description}</p>
          {ann.attachment_url && !hasImage && (
            <a href={ann.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#1a1b4b] rounded-xl text-[12px] font-black uppercase tracking-widest transition-colors w-fit">
              <FileText size={13} /> View Document <ExternalLink size={11} />
            </a>
          )}
          {isAdmin && (
            <div className="flex items-center justify-end pt-2 border-t border-gray-50 mt-auto">
              <button onClick={() => handleDelete(ann.id)} className="w-9 h-9 rounded-xl bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const PendingCard = ({ ann }) => {
    const hasImage = isImageUrl(ann.attachment_url);
    
    return (
      <div className="bg-white rounded-[1.75rem] overflow-hidden shadow-sm border border-amber-100 flex flex-col transition-all hover:shadow-md group">
        {/* Status Indicator */}
        <div className="bg-amber-50 px-6 py-2 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[12px] font-black uppercase tracking-widest text-amber-600">Awaiting Approval</span>
          </div>
          {ann.submitted_by_name && (
            <span className="text-[12px] font-bold uppercase tracking-widest text-gray-400">By: {ann.submitted_by_name}</span>
          )}
        </div>

        {/* Image Banner */}
        {hasImage && (
          <div className="relative w-full overflow-hidden" style={{ paddingBottom: '58%' }}>
            <img src={ann.attachment_url} alt={ann.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>
        )}

        {/* Body */}
        <div className="p-6 flex flex-col flex-1 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-400 rounded-lg text-[12px] font-black uppercase tracking-widest border border-gray-100">
              <CalIcon size={10} /> {format(parseISO(ann.start_date), 'MMM dd')} – {format(parseISO(ann.end_date), 'MMM dd, yy')}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[12px] font-black uppercase tracking-widest border border-indigo-100">
              <Users size={10} /> {ann.target_audience}
            </span>
          </div>

          <h2 className="text-xl font-black text-[#1a1b4b] leading-tight">{ann.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed font-medium line-clamp-3">{ann.description}</p>

          {ann.attachment_url && !hasImage && (
            <a href={ann.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#1a1b4b] rounded-xl text-[12px] font-black uppercase tracking-widest transition-colors w-fit">
              <FileText size={13} /> View Document <ExternalLink size={11} />
            </a>
          )}

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex gap-2 pt-4 border-t border-gray-50 mt-auto">
              <button 
                onClick={() => handleApprove(ann)} 
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[12px] font-black uppercase tracking-widest transition-colors shadow-sm"
              >
                <CheckCircle size={14} /> Approve
              </button>
              <button 
                onClick={() => handleReject(ann)} 
                className="flex-[0.5] flex items-center justify-center gap-2 py-2.5 bg-white border border-red-100 text-red-500 hover:bg-red-50 rounded-xl text-[12px] font-black uppercase tracking-widest transition-colors"
              >
                <XCircle size={14} /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 sm:p-10 space-y-8 bg-[#fcfdfe] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
            <Megaphone className="text-[#ef4444]" /> Announcements
          </h1>
          <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
            {isFacultyLike ? 'Submit announcements for admin approval' : 'Important updates and notices'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPrefsModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-[#1a1b4b] rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
          >
            <Settings size={14} /> Preferences
          </button>
          {(isAdmin || isFacultyLike) && !showForm && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-6 py-3 bg-[#1a1b4b] text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-[#2d3a8c] transition-all shadow-md">
              <Plus size={15} /> {isAdmin ? 'Create Announcement' : 'Submit Request'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-bold uppercase tracking-widest">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-bold uppercase tracking-widest">{success}</div>}

      {/* ── Active Live Video Rooms & Online Lectures Banner (Dynamic DB) ──── */}
      {(() => {
        const liveAnnouncements = announcements.filter(a => a.category === 'LIVE_CLASS' || a.category === 'MEETING');
        return (
          <div className="bg-white border border-red-200 rounded-[2rem] p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-widest text-red-600">
                    MySpace Live Engine • {liveAnnouncements.length} {liveAnnouncements.length === 1 ? 'Session' : 'Sessions'} Active
                  </span>
                </div>
                <h2 className="text-base font-black text-[#1a1b4b] uppercase mt-1">
                  Institutional Video Rooms & Online Lectures
                </h2>
                <p className="text-xs font-bold text-gray-500">
                  Direct 1-click room joining for Dean review meetings, HOD briefings, and Faculty subject lectures
                </p>
              </div>
              <Link
                to="/meetings"
                className="px-6 py-3 rounded-2xl bg-[#1a1b4b] hover:bg-[#2d3a8c] text-white font-black text-xs uppercase tracking-widest shadow-md transition-all shrink-0 flex items-center justify-center gap-2"
              >
                <span>Launch Video Studio</span>
              </Link>
            </div>

            {liveAnnouncements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveAnnouncements.map((ann) => (
                  <div key={ann.id} className="p-5 rounded-2xl bg-red-50/50 border border-red-200 flex items-center justify-between gap-4">
                    <div>
                      <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-black uppercase tracking-widest">
                        🔴 {ann.category === 'LIVE_CLASS' ? 'LIVE CLASS' : 'MEETING'} • {ann.priority || 'HIGH'}
                      </span>
                      <h3 className="text-sm font-black text-[#1a1b4b] uppercase mt-2">
                        {ann.title}
                      </h3>
                      <p className="text-xs font-bold text-gray-500 mt-1 line-clamp-2">
                        {ann.description}
                      </p>
                    </div>
                    <Link
                      to="/meetings"
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest shadow-sm shrink-0"
                    >
                      Join Room →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-gray-200 text-center space-y-2">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  No live video sessions are currently broadcasting in the database
                </p>
                <p className="text-xs font-bold text-gray-400">
                  Deans, HODs, and Faculty can schedule or launch a real-time MySpace room from the Meetings console.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Enterprise Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search announcements by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest shrink-0">Priority:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all shrink-0 ${
                  priorityFilter === p
                    ? p === 'CRITICAL'
                      ? 'bg-red-500 text-white'
                      : 'bg-[#1a1b4b] text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-gray-100">
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest shrink-0">Category:</span>
          {['ALL', 'ANNOUNCEMENT', 'ACADEMIC', 'COURSE_REGISTRATION', 'ATTENDANCE', 'EXAM', 'ASSIGNMENT', 'REMINDER'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                categoryFilter === cat ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Admin Tabs */}
      {isAdmin && (
        <div className="flex gap-2 border-b border-gray-100 pb-0">
          <button
            onClick={() => setTab('active')}
            className={`px-5 py-2.5 text-[12px] font-black uppercase tracking-widest rounded-t-xl transition-colors border-b-2 -mb-px ${
              tab === 'active' ? 'border-[#1a1b4b] text-[#1a1b4b] bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Published
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`flex items-center gap-2 px-5 py-2.5 text-[12px] font-black uppercase tracking-widest rounded-t-xl transition-colors border-b-2 -mb-px ${
              tab === 'pending' ? 'border-amber-500 text-amber-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <Bell size={12} />
            Pending Approval
            {pendingList.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[12px] font-black flex items-center justify-center">
                {pendingList.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Faculty submitted notice */}
      {isFacultyLike && pendingList.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-xs font-black text-amber-700 uppercase tracking-widest">
              {pendingList.length} announcement{pendingList.length > 1 ? 's' : ''} awaiting admin approval
            </p>
            <p className="text-[12px] text-amber-600 font-bold mt-0.5">They'll be published once an admin approves them.</p>
          </div>
        </div>
      )}

      {/* Create / Submit Form */}
      {(isAdmin || isFacultyLike) && showForm && (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 max-w-3xl">
          <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight mb-6 border-b border-gray-100 pb-4">
            {isAdmin ? 'New Announcement' : 'Submit Announcement for Approval'}
          </h2>
          {!isAdmin && (
            <div className="mb-5 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2">
              <Send size={14} className="text-amber-500 shrink-0" />
              <p className="text-[12px] font-black text-amber-700 uppercase tracking-widest">This will be sent to admin for review before publishing</p>
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Start Date</label>
                <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]" />
              </div>
              <div>
                <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">End Date</label>
                <input type="date" required value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Announcement Title</label>
              <input type="text" required placeholder="e.g. Lab Cancelled on Friday" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Target Audience</label>
                <div className="flex gap-4">
                  {['student', 'faculty', 'both'].map(aud => (
                    <label key={aud} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="audience" value={aud} checked={form.target_audience === aud} onChange={() => setForm({ ...form, target_audience: aud })} className="w-4 h-4 accent-[#1a1b4b]" />
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">{aud}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Priority</label>
                <div className="flex gap-4">
                  {['MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="priority" value={p} checked={form.priority === p} onChange={() => setForm({ ...form, priority: p })} className="w-4 h-4 accent-[#1a1b4b]" />
                      <span className={`text-xs font-bold uppercase tracking-widest ${p === 'CRITICAL' ? 'text-red-600' : 'text-gray-600'}`}>{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]"
                >
                  <option value="ANNOUNCEMENT">Announcement</option>
                  <option value="ACADEMIC">Academic</option>
                  <option value="EXAM">Exam</option>
                  <option value="REMINDER">Reminder</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Target Scope</label>
                <select
                  value={form.target_scope}
                  onChange={e => setForm({ ...form, target_scope: e.target.value })}
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]"
                >
                  <option value="UNIVERSITY">Entire University</option>
                  <option value="DEPARTMENT">Department</option>
                  <option value="PROGRAM">Program</option>
                  <option value="CLASS">Class</option>
                  <option value="BATCH">Batch</option>
                </select>
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_pinned}
                    onChange={e => setForm({ ...form, is_pinned: e.target.checked })}
                    className="w-4 h-4 accent-[#1a1b4b] rounded"
                  />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Pin Announcement</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Description</label>
              <textarea required rows={4} placeholder="Type the announcement details here..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1b4b] resize-none" />
            </div>
            <div>
              <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Attach Image or Document (Optional)</label>
              <input type="file" accept="image/*,.pdf,.doc,.docx,.ppt,.pptx" onChange={e => setForm({ ...form, file: e.target.files[0] })} className="w-full text-xs font-bold file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-[#1a1b4b] file:text-white cursor-pointer" />
              {form.file && <p className="text-[12px] font-bold text-emerald-600 mt-1">{form.file.name}</p>}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 bg-[#1a1b4b] text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest hover:bg-[#2d3a8c] disabled:opacity-50 transition-colors">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : isAdmin ? <Megaphone size={14} /> : <Send size={14} />}
                {submitting ? 'Submitting...' : isAdmin ? 'Publish Now' : 'Send for Approval'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-black text-[12px] uppercase tracking-widest hover:bg-gray-200">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Admin: Pending Approvals Tab */}
      {isAdmin && tab === 'pending' && (
        <section className="space-y-4">
          {pendingList.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-gray-100">
              <CheckCircle className="w-14 h-14 text-emerald-200 mx-auto mb-4" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">All clear — no pending requests</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingList.map(ann => <PendingCard key={ann.id} ann={ann} />)}
            </div>
          )}
        </section>
      )}

      {/* Published Announcements (visible on Admin "Published" tab + for students/faculty) */}
      {(!isAdmin || tab === 'active') && (
        <>
          {/* Personal Event Reminders Alert */}
          {personalReminders.length > 0 && (
            <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <h2 className="text-[12px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                <Bell size={12} className="animate-pulse" /> Personal Event Reminders
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {personalReminders.map(rem => (
                  <div key={rem.id} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all group">
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
                      <Clock size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[15px] font-black text-[#1a1b4b] leading-tight uppercase tracking-tight">{rem.title}</h3>
                      <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mt-1">
                        Starts at: {format(parseISO(rem.startDate), 'MMM dd')} {rem.startTime}
                      </p>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                         Personal Reminder: {rem.reminder} before
                      </p>
                    </div>
                    <Link 
                      to="/calendar" 
                      className="px-4 py-2 bg-white text-[#1a1b4b] rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-200 hover:bg-[#1a1b4b] hover:text-white transition-all shadow-sm"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
              <div className="h-px bg-gray-100 mt-4" />
            </section>
          )}

          {/* Deadline Reminders section for students */}
          {role === 'student' && deadlineReminders.length > 0 && (
            <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <h2 className="text-[12px] font-black text-[#ef4444] uppercase tracking-widest flex items-center gap-2">
                <Bell size={12} className="animate-bounce" /> Critical Deadline Alerts (Next 24h)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deadlineReminders.map(rem => (
                  <div key={rem.id} className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all group">
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-red-200">
                      <Clock size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[15px] font-black text-[#1a1b4b] leading-tight uppercase tracking-tight">{rem.title}</h3>
                      <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest mt-1">
                        Due: {format(parseISO(rem.deadline), 'MMM dd, hh:mm a')}
                      </p>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        [{rem.allocation?.subject?.code}] {rem.allocation?.subject?.name}
                      </p>
                    </div>
                    <Link 
                      to="/assignments" 
                      className="px-4 py-2 bg-white text-[#1a1b4b] rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-200 hover:bg-[#1a1b4b] hover:text-white transition-all shadow-sm"
                    >
                      Submit
                    </Link>
                  </div>
                ))}
              </div>
              <div className="h-px bg-gray-100 mt-4" />
            </section>
          )}

          {/* Saved section */}
          {!isAdmin && savedAnnouncements.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Heart size={12} className="text-red-500 fill-red-500" /> Saved ({savedAnnouncements.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedAnnouncements.map(ann => <AnnouncementCard key={ann.id} ann={ann} />)}
              </div>
              <div className="h-px bg-gray-100" />
            </section>
          )}

          {/* Faculty pending own */}
          {isFacultyLike && pendingList.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-[12px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <Clock size={12} /> Your Pending Submissions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingList.map(ann => <PendingCard key={ann.id} ann={ann} />)}
              </div>
            </section>
          )}

          {activeAnnouncements.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-gray-100">
              <Megaphone className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No active announcements right now</p>
            </div>
          ) : (
            <section className="space-y-4">
              <h2 className="text-[12px] font-black text-gray-500 uppercase tracking-widest">Active Notices</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeAnnouncements.map(ann => <AnnouncementCard key={ann.id} ann={ann} />)}
              </div>
            </section>
          )}

          {pastAnnouncements.length > 0 && (
            <section className="space-y-4 pt-4">
              <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-3">
                <div className="h-px bg-gray-200 flex-1" /> Past Announcements <div className="h-px bg-gray-200 flex-1" />
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastAnnouncements.map(ann => <AnnouncementCard key={ann.id} ann={ann} past />)}
              </div>
            </section>
          )}
        </>
      )}

      {showPrefsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="p-6 bg-[#1a1b4b] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="text-[#ef4444]" size={20} />
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">Notification Preferences</h3>
                  <p className="text-xs text-indigo-200">Customize how and when you receive ERP alerts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrefsModal(false)}
                className="text-gray-300 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Delivery Channels</h4>
                <label className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wide block">In-App Notifications</span>
                    <span className="text-[11px] text-gray-500">Real-time alerts and badges in topbar</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences ? preferences.in_app_enabled !== false : true}
                    onChange={(e) => setPreferences({ ...(preferences || {}), in_app_enabled: e.target.checked })}
                    className="w-5 h-5 accent-[#1a1b4b] rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wide block">Email Alerts</span>
                    <span className="text-[11px] text-gray-500">Important academic and exam notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences ? preferences.email_enabled !== false : true}
                    onChange={(e) => setPreferences({ ...(preferences || {}), email_enabled: e.target.checked })}
                    className="w-5 h-5 accent-[#1a1b4b] rounded"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Notification Categories</h4>
                {['ACADEMIC', 'EXAMS', 'REMINDERS', 'COURSE_REGISTRATION'].map((cat) => {
                  const enabled = preferences && preferences.categories
                    ? preferences.categories[cat] !== false
                    : true;
                  return (
                    <label key={cat} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">{cat.replace('_', ' ')}</span>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => {
                          const prevCats = preferences?.categories || {};
                          setPreferences({
                            ...(preferences || {}),
                            categories: { ...prevCats, [cat]: e.target.checked }
                          });
                        }}
                        className="w-5 h-5 accent-[#1a1b4b] rounded"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPrefsModal(false)}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await notificationApi.updatePreferences(profile.id, preferences || {});
                    showMsg(setSuccess, 'Preferences saved!');
                  } catch (err) {
                    showMsg(setError, 'Failed to update preferences');
                  }
                  setShowPrefsModal(false);
                }}
                className="px-6 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#2d3a8c] shadow-sm"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
