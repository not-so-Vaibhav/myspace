import { useState, useEffect } from 'react';
import { CalendarDays, Clock, FileText, MapPin, User, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const statusColors = {
  upcoming: { bg: 'bg-blue-50', dot: 'bg-blue-400', text: 'text-blue-600', label: 'Upcoming' },
  ongoing:  { bg: 'bg-green-50', dot: 'bg-green-400', text: 'text-green-600', label: 'Ongoing' },
  cancelled:{ bg: 'bg-red-50',  dot: 'bg-red-400',   text: 'text-red-600',  label: 'Cancelled' },
};

export const MeetingCard = ({ m, className = "" }) => {
  const s = statusColors[m.status || 'upcoming'];
  return (
    <div className={`bg-white border border-[var(--color-border-light)] rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-[#1a1b4b]/5 transition-all flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest ${s.bg} ${s.text}`}>
          <span className={`w-1.5 h-1.5 rounded-sm ${s.dot}`} />
          {s.label}
        </span>
        <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest whitespace-nowrap">
          Briefing #{m.id.toString().slice(-4)}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
        <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <CalendarDays size={14} className="text-[#1a1b4b]" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Schedule</p>
            <p className="text-sm font-bold text-[#1a1b4b] leading-snug">{new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-red-50/30 rounded-2xl border border-red-100/50">
          <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <Clock size={14} className="text-red-500" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Interval</p>
            <p className="text-sm font-bold text-[#1a1b4b] leading-snug">{m.start_time} - {m.end_time}</p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 sm:col-span-2">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-indigo-500">
            <FileText size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Agenda</p>
            <p className="text-sm font-black text-[#1a1b4b] leading-relaxed uppercase tracking-tighter">{m.agenda}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
          <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <MapPin size={14} className="text-emerald-500" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Location</p>
            <p className="text-sm font-bold text-[#1a1b4b] leading-snug">{m.location}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-pink-50/30 rounded-2xl border border-pink-100/50">
          <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-pink-500" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Convener</p>
            <p className="text-sm font-bold text-[#1a1b4b] leading-snug">{m.organized_by}</p>
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

        if (!error && data) setMeetings(data);
      } catch (err) {
        console.error('Meeting fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  if (loading) return (
    <div className="p-8 bg-slate-50 rounded-[2rem] flex flex-col items-center justify-center gap-3 opacity-50">
      <Loader2 className="w-6 h-6 text-[#1a1b4b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Briefing Feed...</p>
    </div>
  );

  const next = meetings[0];

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[var(--color-text)] font-black uppercase tracking-[0.2em] text-[10px] opacity-30">
          Upcoming Meetings
        </h2>
        <Link
          to="/meetings"
          className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#1a1b4b] uppercase tracking-widest hover:text-[#ef4444] transition-colors"
        >
          Explore Protocol <ArrowRight size={13} strokeWidth={3} />
        </Link>
      </div>

      {next ? (
        <MeetingCard m={next} />
      ) : (
        <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
          <Clock size={32} className="mx-auto text-slate-100 mb-3" />
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No meetings currently scheduled</p>
        </div>
      )}
    </section>
  );
};

export default MeetingSection;
