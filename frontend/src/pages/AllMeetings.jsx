import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Info } from 'lucide-react';
import { MeetingCard } from '../components/Dashboard/MeetingSection';
import { supabase } from '../lib/supabase';

const AllMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllMeetings = async () => {
      try {
        const { data, error } = await supabase
          .from('meetings')
          .select('*')
          .order('date', { ascending: false });

        if (!error && data) setMeetings(data);
      } catch (err) {
        console.error('All meetings fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllMeetings();
  }, []);

  return (
    <div className="p-8 sm:p-12 space-y-8 bg-[#fcfdfe] min-h-screen">
      {/* Back + heading */}
      <div className="animate-in fade-in slide-in-from-left-4 duration-500">
        <Link
          to="/faculty-dashboard"
          className="inline-flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors mb-4"
        >
          <ArrowLeft size={13} strokeWidth={3} /> Dashboard Overview
        </Link>
        <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter">
          Institutional Protocol
        </h1>
        <p className="text-gray-400 font-bold text-[11px] tracking-widest uppercase mt-1 opacity-60">
          History & Schedule of Departmental Briefings
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="w-12 h-12 text-[#1a1b4b] animate-spin opacity-20" />
          <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">Accessing Briefing Vault...</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {meetings.length > 0 ? (
            meetings.map((m) => (
              <MeetingCard key={m.id} m={m} className="animate-in fade-in slide-in-from-bottom-2 duration-300" />
            ))
          ) : (
            <div className="p-20 border-2 border-dashed border-slate-100 rounded-[3rem] text-center opacity-40">
              <Info size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest">No meeting records discovered</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AllMeetings;
