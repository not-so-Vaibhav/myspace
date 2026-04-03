import { CalendarDays, Clock, FileText, MapPin, User, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const meetings = [
  {
    id: 1,
    date: 'Monday, 31 Mar 2026',
    timing: '10:00 AM – 11:30 AM',
    agenda: 'Mid-Semester Review & Academic Progress Discussion',
    location: 'Conference Room 3, Admin Block',
    organizedBy: 'Dr. Meera Joshi (HoD, Computer Dept.)',
    status: 'upcoming',
  },
  {
    id: 2,
    date: 'Wednesday, 2 Apr 2026',
    timing: '02:00 PM – 03:00 PM',
    agenda: 'Research Paper Submission Deadline Briefing',
    location: 'Seminar Hall – B, 2nd Floor',
    organizedBy: 'Prof. Rakesh Sharma (Research Cell)',
    status: 'upcoming',
  },
  {
    id: 3,
    date: 'Friday, 4 Apr 2026',
    timing: '11:00 AM – 12:00 PM',
    agenda: 'Internal Quality Assurance Cell (IQAC) Monthly Meet',
    location: 'Board Room, Admin Block',
    organizedBy: 'Dr. Sunil Patil (IQAC Coordinator)',
    status: 'upcoming',
  },
];

export const statusColors = {
  upcoming: { bg: 'bg-blue-50', dot: 'bg-blue-400', text: 'text-blue-600', label: 'Upcoming' },
  ongoing:  { bg: 'bg-green-50', dot: 'bg-green-400', text: 'text-green-600', label: 'Ongoing' },
  cancelled:{ bg: 'bg-red-50',  dot: 'bg-red-400',   text: 'text-red-600',  label: 'Cancelled' },
};

export const MeetingCard = ({ m, className = "" }) => {
  const s = statusColors[m.status];
  return (
    <div className={`bg-white border border-[var(--color-border-light)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${s.bg} ${s.text}`}>
          <span className={`w-1.5 h-1.5 rounded-sm ${s.dot}`} />
          {s.label}
        </span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
          Meeting #{m.id}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 content-center">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#1a1b4b]/8 flex items-center justify-center flex-shrink-0">
            <CalendarDays size={15} className="text-[#1a1b4b]" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-none mb-0.5">Date</p>
            <p className="text-sm font-bold text-[#1a1b4b] leading-snug">{m.date}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Clock size={15} className="text-orange-500" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-none mb-0.5">Timing</p>
            <p className="text-sm font-bold text-[#1a1b4b] leading-snug">{m.timing}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 sm:col-span-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <FileText size={15} className="text-purple-500" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-none mb-0.5">Agenda</p>
            <p className="text-sm font-bold text-[#1a1b4b] leading-snug">{m.agenda}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <MapPin size={15} className="text-green-500" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-none mb-0.5">Location</p>
            <p className="text-sm font-bold text-[#1a1b4b] leading-snug">{m.location}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
            <User size={15} className="text-pink-500" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-none mb-0.5">Organized By</p>
            <p className="text-sm font-bold text-[#1a1b4b] leading-snug">{m.organizedBy}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard widget — only the earliest (first) meeting
const MeetingSection = () => {
  const next = meetings[0];

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[var(--color-text)] font-bold uppercase tracking-tighter text-sm opacity-40">
          Upcoming Meetings
        </h2>
        <Link
          to="/meetings"
          className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#1a1b4b] uppercase tracking-widest hover:opacity-70 transition-opacity"
        >
          See All <ArrowRight size={13} strokeWidth={3} />
        </Link>
      </div>

      <MeetingCard m={next} />
    </section>
  );
};

export default MeetingSection;
