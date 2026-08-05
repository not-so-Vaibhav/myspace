import { useState, useEffect } from 'react';
import { CalendarDays, Clock, FileText, MapPin, User, ArrowRight, Loader2, Video, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const statusColors = {
  upcoming: { bg: 'bg-blue-50', dot: 'bg-blue-500', text: 'text-blue-700', label: 'Upcoming' },
  ongoing:  { bg: 'bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Live Now' },
  cancelled:{ bg: 'bg-red-50',  dot: 'bg-red-500',   text: 'text-red-700',  label: 'Cancelled' },
};

const DEMO_MEETING_FALLBACK = {
  id: 'meeting-live-101',
  title: 'Discrete Mathematics • Online Lecture (AIA2)',
  status: 'ongoing',
  date: new Date().toISOString().split('T')[0],
  start_time: '10:00 AM',
  end_time: '11:00 AM',
  agenda: 'Group Theory & Algebraic Structures problem-solving session.',
  location: 'MySpace Virtual Video Classroom (Room: dma-lecture-aia2)',
  organized_by: 'Prof. Archana Pakhare (Faculty Convener)'
};

export const MeetingCard = ({ m, className = "" }) => {
  const s = statusColors[m.status || 'ongoing'];
  const roomId = m.room_id || 'enterprise-room-1';

  return (
    <div className={`bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-current/20 ${s.bg} ${s.text}`}>
            <span className={`w-2 h-2 rounded-full ${s.dot} ${m.status === 'ongoing' ? 'animate-ping' : ''}`} />
            {s.label}
          </span>
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Briefing #{m.id ? m.id.toString().slice(-4) : '1001'}
          </span>
        </div>

        <Link
          to={`/meetings?room=${roomId}`}
          className="px-5 py-2.5 rounded-xl bg-[#4B7BFF] hover:bg-[#3b66d6] text-white font-black text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 shrink-0 transition-all"
        >
          <Video className="w-4 h-4" />
          <span>Join Video Room →</span>
        </Link>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
        <div className="flex items-start gap-3 p-4 bg-slate-50/70 rounded-2xl border border-gray-200">
          <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <CalendarDays size={16} className="text-[#1a1b4b]" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Schedule</p>
            <p className="text-sm font-black text-[#1a1b4b] leading-snug">
              {new Date(m.date || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-red-50/50 rounded-2xl border border-red-100">
          <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <Clock size={16} className="text-red-500" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Interval</p>
            <p className="text-sm font-black text-[#1a1b4b] leading-snug">{m.start_time} - {m.end_time}</p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 sm:col-span-2">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 text-indigo-500">
            <FileText size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Agenda / Lecture Notes</p>
            <p className="text-sm font-black text-[#1a1b4b] leading-relaxed uppercase tracking-wide">{m.agenda}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
          <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <MapPin size={16} className="text-emerald-500" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Location / Platform</p>
            <p className="text-sm font-black text-[#1a1b4b] leading-snug">{m.location}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
          <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <User size={16} className="text-purple-500" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Convener / Faculty</p>
            <p className="text-sm font-black text-[#1a1b4b] leading-snug">{m.organized_by}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MeetingSection = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const { data, error } = await supabase
          .from('meetings')
          .select('*')
          .order('date', { ascending: true })
          .gte('date', new Date().toISOString().split('T')[0])
          .limit(1);

        if (!error && data && data.length > 0) {
          setMeetings(data);
        } else {
          setMeetings([DEMO_MEETING_FALLBACK]);
        }
      } catch (err) {
        console.error('Meeting fetch error:', err);
        setMeetings([DEMO_MEETING_FALLBACK]);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  if (loading) return (
    <div className="p-8 bg-slate-50 rounded-[2rem] flex flex-col items-center justify-center gap-3 opacity-70 border border-gray-200">
      <Loader2 className="w-6 h-6 text-[#1a1b4b] animate-spin" />
      <p className="text-xs font-black uppercase tracking-widest text-gray-500">Accessing Live Classroom Feed...</p>
    </div>
  );

  const next = meetings[0] || DEMO_MEETING_FALLBACK;

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-gray-500 font-black uppercase tracking-widest text-xs">
            Live Video Classrooms & Meetings
          </h2>
          <span className="px-2.5 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-black uppercase tracking-widest flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse" /> MySpace Engine
          </span>
        </div>
        <Link
          to="/meetings"
          className="inline-flex items-center gap-1.5 text-xs font-black text-[#1a1b4b] uppercase tracking-widest hover:text-[#4B7BFF] transition-colors"
        >
          <span>Explore All Live Rooms</span>
          <ArrowRight size={14} strokeWidth={3} />
        </Link>
      </div>

      <MeetingCard m={next} />
    </section>
  );
};

export default MeetingSection;
