import { CalendarCheck, FileText, Calendar, Folder } from 'lucide-react';
import { Link } from 'react-router-dom';

const cards = [
    { name: 'Attendance', icon: CalendarCheck, stats: '85% Present', to: '/leave-application', accent: '#1a1b4b', bg: 'bg-indigo-50' },
    { name: 'Assignments', icon: FileText, stats: '4 Pending', to: '/assignments', accent: '#ef4444', bg: 'bg-red-50' },
    { name: 'Schedule', icon: Calendar, stats: '2 Classes Today', to: '/schedule', accent: '#f59e0b', bg: 'bg-amber-50' },
    { name: 'Resources', icon: Folder, stats: '15 Files', to: '/resources', accent: '#10b981', bg: 'bg-emerald-50' },
];

const QuickAccess = () => {
    return (
        <section>
            <h2 className="text-[var(--color-text)] font-bold mb-5 uppercase tracking-tighter text-sm opacity-40">Quick Access</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <Link
                            key={idx}
                            to={card.to}
                            className="bg-white border border-[#1a1b4b]/5 p-6 shadow-[var(--shadow-card)] relative cursor-pointer hover:-translate-y-2 transition-all flex flex-col justify-between h-52 group rounded-2xl hover:shadow-xl"
                        >
                            <div className="flex justify-center w-full pt-2">
                                <div className={`w-16 h-16 ${card.bg} flex items-center justify-center rounded-2xl shadow-inner group-hover:scale-110 transition-transform`}>
                                    <Icon size={26} style={{ color: card.accent }} />
                                </div>
                            </div>
                            <div className="mt-auto pl-2">
                                <h3 className="font-black text-xl tracking-tight leading-none mb-1 text-[#1a1b4b]">{card.name}</h3>
                                <div className="flex justify-between items-center text-[12px] font-black text-gray-400 tracking-widest uppercase mt-1">
                                    <span>{card.stats}</span>
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#1a1b4b]">→</span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
};

export default QuickAccess;
