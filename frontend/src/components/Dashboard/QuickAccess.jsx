import { CalendarCheck, FileText, Calendar, Folder } from 'lucide-react';

const cards = [
    { name: 'Attendance', color: 'bg-gradient-to-br from-[#5376FF] to-[#405AE6]', icon: CalendarCheck, stats: '85% Present' },
    { name: 'Assignments', color: 'bg-gradient-to-br from-[#FFC250] to-[#E5A535]', icon: FileText, stats: '4 Pending' },
    { name: 'Schedule', color: 'bg-gradient-to-br from-[#FF6A9C] to-[#E65685]', icon: Calendar, stats: '2 Classes Today' },
    { name: 'Resources', color: 'bg-gradient-to-br from-[#8C6DFD] to-[#6A4CD7]', icon: Folder, stats: '15 Files' },
];

const QuickAccess = () => {
    return (
        <section>
            <h2 className="text-[var(--color-text)] font-semibold mb-5 uppercase tracking-wider text-sm">Quick Access</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <div
                        key={idx}
                        className={`${card.color} text-white p-6 inset-0 rounded-[1.5rem] shadow-md relative cursor-pointer hover:-translate-y-1 transition-transform flex flex-col justify-between h-52`}
                    >
                        <div className="flex justify-center w-full pt-2">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border-[1.5px] border-white/20 backdrop-blur-md shadow-sm">
                                <card.icon size={26} className="text-white drop-shadow-sm" />
                            </div>
                        </div>
                        <div className="mt-auto">
                            <h3 className="font-medium text-lg tracking-wide">{card.name}</h3>
                            <div className="flex justify-between items-center text-sm font-medium text-white/80 mt-1">
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
