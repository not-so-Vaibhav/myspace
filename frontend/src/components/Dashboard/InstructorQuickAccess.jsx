import { Users, FileText, FolderOpen, CalendarOff, Clock, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const cards = [
  {
    name: 'Std. Attendance',
    subtitle: 'Mark & Track',
    icon: Users,
    iconBg: 'bg-[#1a1b4b]/5',
    to: '/attendance',
    accent: '#1a1b4b',
  },
  {
    name: 'Assignments',
    subtitle: 'Create & Review',
    icon: FileText,
    iconBg: 'bg-[#ef4444]/5',
    to: '/faculty-assignments',
    accent: '#ef4444',
  },
  {
    name: 'Notes & Resources',
    subtitle: 'Upload & Share',
    icon: FolderOpen,
    iconBg: 'bg-emerald-50',
    to: '/faculty-resources',
    accent: '#10b981',
  },
  {
    name: 'Leave Application',
    subtitle: 'Apply & Status',
    icon: CalendarOff,
    iconBg: 'bg-amber-50',
    to: '/request-letter',
    accent: '#f59e0b',
  },
  {
    name: 'My Attendance',
    subtitle: 'View Record',
    icon: Clock,
    iconBg: 'bg-indigo-50',
    to: '/attendance',
    accent: '#6366f1',
  },
  {
    name: 'Professional Profile',
    subtitle: 'Edit & Share',
    icon: UserCircle,
    iconBg: 'bg-pink-50',
    to: '/profile',
    accent: '#ec4899',
  },
];

const InstructorQuickAccess = () => {
  return (
    <section>
      <h2 className="text-[var(--color-text)] font-bold mb-5 uppercase tracking-tighter text-sm opacity-40">
        Quick Access
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, idx) => (
          <Link
            key={idx}
            to={card.to}
            className="bg-white border border-[#1a1b4b]/5 p-6 rounded-[var(--radius-card)] shadow-[var(--shadow-card)] relative cursor-pointer hover:-translate-y-2 transition-transform flex flex-col justify-between h-52 group"
          >
            {/* subtle accent bar on top */}
            <div
              className="absolute top-0 left-6 right-6 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: card.accent }}
            />

            <div className="flex justify-center w-full pt-2">
              <div
                className={`w-16 h-16 rounded-3xl ${card.iconBg} flex items-center justify-center border-t border-white shadow-inner`}
              >
                <card.icon size={26} style={{ color: card.accent }} strokeWidth={2.5} />
              </div>
            </div>

            <div className="mt-auto pl-2">
              <h3 className="font-black text-xl tracking-tight leading-none mb-1 text-[#1a1b4b]">
                {card.name}
              </h3>
              <div className="flex justify-between items-center text-[10px] font-black text-gray-400 tracking-widest uppercase mt-1">
                <span>{card.subtitle}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full opacity-60"
                  style={{ backgroundColor: card.accent }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default InstructorQuickAccess;
