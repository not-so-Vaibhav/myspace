import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { meetings, MeetingCard } from '../components/Dashboard/MeetingSection';

const AllMeetings = () => (
  <div className="p-8 sm:p-12 space-y-8">
    {/* Back + heading */}
    <div>
      <Link
        to="/faculty-dashboard"
        className="inline-flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors mb-4"
      >
        <ArrowLeft size={13} strokeWidth={3} /> Back to Dashboard
      </Link>
      <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
        All Meetings
      </h1>
      <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
        {meetings.length} meeting{meetings.length !== 1 ? 's' : ''} scheduled
      </p>
    </div>

    {/* All meeting cards */}
    <div className="space-y-4 max-w-3xl">
      {meetings.map((m) => (
        <MeetingCard key={m.id} m={m} />
      ))}
    </div>
  </div>
);

export default AllMeetings;
