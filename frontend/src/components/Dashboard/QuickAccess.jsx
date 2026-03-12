import { CalendarCheck, FileText, Calendar, Folder } from 'lucide-react';

const cards = [
    { name: 'Attendance', bgColor: 'bg-white', borderColor: 'border-[#1a1b4b]/5', iconColor: 'text-[#1a1b4b]', stats: '85% Present' },
    { name: 'Assignments', bgColor: 'bg-white', borderColor: 'border-[#1a1b4b]/5', iconColor: 'text-[#1a1b4b]', stats: '4 Pending' },
    { name: 'Schedule', bgColor: 'bg-white', borderColor: 'border-[#1a1b4b]/5', iconColor: 'text-[#1a1b4b]', stats: '2 Classes Today' },
    { name: 'Resources', bgColor: 'bg-white', borderColor: 'border-[#1a1b4b]/5', iconColor: 'text-[#1a1b4b]', stats: '15 Files' },
];

const QuickAccess = () => {
    return (
        <section>
            <h2 className="text-[var(--color-text)] font-bold mb-5 uppercase tracking-tighter text-sm opacity-40">Quick Access</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <div
                        key={idx}
                        className={`${card.bgColor} ${card.borderColor} border p-6 rounded-[var(--radius-card)] shadow-[var(--shadow-card)] relative cursor-pointer hover:-translate-y-2 transition-transform flex flex-col justify-between h-52`}
                    >
                        <div className="flex justify-center w-full pt-2">
                            <div className="w-16 h-16 rounded-3xl bg-[#f4f6fa] flex items-center justify-center border-t border-white shadow-inner">
                                <CalendarCheck size={26} className={card.iconColor} />
                            </div>
                        </div>
                        <div className="mt-auto pl-2">
                            <h3 className="font-black text-xl tracking-tight leading-none mb-1 text-[#1a1b4b]">{card.name}</h3>
                            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 tracking-widest uppercase mt-1">
                                <span>{card.stats}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default QuickAccess;
