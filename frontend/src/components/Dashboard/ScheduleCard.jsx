const allSchedule = {
    Monday: {
        tag: 'Online',
        tagColor: 'bg-pink-500',
        slots: [
            { time: '8:45-9:40', subject: 'SCIL' },
            { time: '9:40-10:35', subject: 'CN : SJ' },
            { time: '10:50-11:45', subject: 'OS : ATH' },
            { time: '11:45-12:40', subject: 'Remedial Lecture' },
            { time: '1:40-2:35', subject: 'OE : NISM / NPTEL' },
            { time: '3:30-4:30', subject: 'MOOC' },
        ],
    },
    Tuesday: {
        slots: [
            { time: '8:45-10:35', subject: 'A: WTL: SMM : N511\nB: CNL: SJ : N513\nC: WTL: AU : N519', highlight: true },
            { time: '10:50-12:40', subject: 'ENT : MAN : N505' },
            { time: '1:40-2:35', subject: 'FAI SS · TOCl MNG\nFCC1 VBO · CSE1 SPD' },
            { time: '3:30-4:30', subject: 'Remedial Lecture' },
        ],
    },
    Wednesday: {
        slots: [
            { time: '8:45-9:40', subject: 'OS : ATH : N505' },
            { time: '9:40-10:35', subject: 'EE : KS : N505' },
            { time: '10:50-12:40', subject: 'A: CNL: SJ : N511\nB: WTL: SAD : N513\nC: WTL: AU : N519', highlight: true },
            { time: '1:40-2:35', subject: 'CN : SJ : N505' },
            { time: '2:35-3:30', subject: 'SCIL : N505', highlight: true },
            { time: '3:30-4:30', subject: 'Library' },
        ],
    },
    Thursday: {
        slots: [
            { time: '8:45-9:40', subject: 'EE : KS : N505' },
            { time: '9:40-10:35', subject: 'CN : SJ : N505' },
            { time: '10:50-12:40', subject: 'A: WTL: SMM : N511\nB: WTL: SAD : N511\nC: CNL: SPD : N608', highlight: true },
            { time: '1:40-2:35', subject: 'OS : ATH : N505' },
            { time: '2:35-3:30', subject: 'OS : ATH : N505' },
            { time: '3:30-4:30', subject: 'Mentor Meeting' },
        ],
    },
    Friday: {
        slots: [
            { time: '8:45-9:40', subject: 'FAI SS · TOCl MNG\nFCC1 VBO · CSE1 SPD' },
            { time: '9:40-10:35', subject: 'CN : SJ : N505' },
            { time: '10:50-12:40', subject: 'Remedial Lecture' },
            { time: '1:40-2:35', subject: 'Library' },
            { time: '2:35-4:30', subject: 'SHD (SISM2)\n2nd & 4th Week\n2:35 PM to 4:30 PM', green: true },
        ],
    },
    Saturday: {
        tag: 'Working',
        tagColor: 'bg-gray-400',
        slots: [
            { time: '8:45-10:35', subject: 'OS : ATH : N505' },
            { time: '10:50-12:40', subject: 'EE : KS : S605' },
            { time: '1:40-4:30', subject: 'PBL II Review' },
        ],
    },
};

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ScheduleCard = () => {
    const today = new Date();
    const todayName = dayNames[today.getDay()];
    // Fall back to Monday if Sunday (no schedule)
    const displayDay = todayName === 'Sunday' ? 'Monday' : todayName;
    const dayData = allSchedule[displayDay] || allSchedule['Monday'];

    return (
        <div className="bg-white rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter">Today's Schedule</h2>
                    <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                        {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
                <span className="px-4 py-1.5 rounded-full bg-[#1a1b4b]/5 text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest">
                    {displayDay}
                </span>
            </div>

            {/* Day + Slots layout */}
            <div className="flex gap-4 items-stretch">
                {/* Day pill */}
                <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center bg-[#1a1b4b] rounded-2xl px-3 py-5 shadow-md">
                    <span className="text-[13px] font-black text-white uppercase tracking-tight text-center leading-tight">
                        {displayDay}
                    </span>
                    {dayData.tag && (
                        <span className={`mt-2 text-[12px] font-black text-white rounded-full px-2.5 py-0.5 ${dayData.tagColor}`}>
                            {dayData.tag}
                        </span>
                    )}
                </div>

                {/* Slots grid — wraps into rows */}
                <div className="flex-1 flex flex-col gap-3">
                    {/* Group slots by "row" — split at time gap (lunch break after 12:40) */}
                    {(() => {
                        const before = dayData.slots.filter(s => !s.time.startsWith('1:') && !s.time.startsWith('2:') && !s.time.startsWith('3:'));
                        const after = dayData.slots.filter(s => s.time.startsWith('1:') || s.time.startsWith('2:') || s.time.startsWith('3:'));

                        const Row = ({ slots }) => (
                            <div className="flex flex-wrap gap-2">
                                {slots.map((slot, j) => (
                                    <div key={j} className="flex flex-col min-w-[80px] flex-1">
                                        <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1">{slot.time}</span>
                                        <div className={`flex-1 rounded-2xl px-3 py-3 flex items-center justify-center text-center min-h-[56px]
                      ${slot.green ? 'bg-green-400' : slot.highlight ? 'bg-yellow-100' : 'bg-[#f4f6fa]'}`}>
                                            <span className={`text-[13px] font-bold leading-tight whitespace-pre-line
                        ${slot.green ? 'text-white' : 'text-[#1a1b4b]'}`}>
                                                {slot.subject}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );

                        return (
                            <>
                                {before.length > 0 && <Row slots={before} />}
                                {after.length > 0 && <Row slots={after} />}
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

export default ScheduleCard;
