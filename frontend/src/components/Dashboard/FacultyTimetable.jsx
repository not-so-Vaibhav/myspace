const TIMETABLE = {
  Monday: [
    { time: '08:45-09:40', text: '23-I (PR)' },
    { time: '10:50-11:45', text: '21' },
    { time: '01:40-02:35', text: '20' }
  ],
  Tuesday: [
    { time: '02:35-03:30', text: '6-II (PR)' }
  ],
  Wednesday: [
    { time: '10:50-11:45', text: '12-I (PR)' },
    { time: '12:45-01:40', text: '12-I (PR)' },
    { time: '02:35-03:30', text: '23' }
  ],
  Thursday: [
    { time: '10:50-11:45', text: '20-I (PR)' },
    { time: '12:45-01:40', text: '20-I (PR)' },
    { time: '01:40-02:35', text: '13-II (PR) / 17-II (PR)', isHighlighted: true }
  ],
  Friday: [
    { time: '08:45-09:40', text: '21-I (PR)' },
    { time: '10:50-11:45', text: '12' },
    { time: '01:40-02:35', text: '24-II (PR)' }
  ]
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const FacultyTimetable = () => {
  const currentDate = new Date();
  const jsDay = currentDate.getDay(); // 0=Sun … 6=Sat
  
  // Default to Monday if weekend
  const activeDay = (jsDay === 0 || jsDay === 6) ? 1 : jsDay;
  const activeDayName = DAY_NAMES[activeDay];
  
  // Format top-left date (e.g., THURSDAY, 26 MARCH)
  const displayDateStr = `${activeDayName.toUpperCase()}, ${currentDate.getDate()} ${MONTHS[currentDate.getMonth()].toUpperCase()}`;
  
  const scheduleData = TIMETABLE[activeDayName] || [];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[var(--color-border-light)] w-full">
      {/* Header section matching the design */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[#1a1b4b] text-xl font-black uppercase tracking-tight mb-0.5">
            TODAY'S SCHEDULE
          </h2>
          <p className="text-gray-400 font-bold text-[13px] tracking-widest uppercase">
            {displayDateStr}
          </p>
        </div>
        
        {/* Top right pill indicator */}
        <div className="bg-gray-50 px-5 py-2.5 rounded-full border border-gray-100 flex items-center shrink-0">
          <span className="text-[#1a1b4b] font-black text-xs uppercase tracking-widest">
            {activeDayName}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 min-h-[140px]">
        {/* Left massive dark blue pill */}
        <div className="hidden lg:flex flex-col items-center justify-center bg-[#1a1b4b] rounded-2xl w-14 shrink-0 py-4 relative overflow-hidden">
          <span className="text-white font-black text-xs uppercase tracking-widest z-10 -rotate-90 origin-center absolute w-[160px] text-center">
            {activeDayName}
          </span>
        </div>

        {/* Right side masonry-style grid for current day's classes */}
        {scheduleData.length > 0 ? (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 auto-rows-max gap-3 pb-1">
            {scheduleData.map((slot, index) => {
              const content = slot.text;
              const isProminent = slot.isHighlighted; 
              
              const blockClasses = isProminent 
                ? "bg-[#fff9c4]"
                : "bg-[#f8f9fa] shadow-[0_0_15px_-5px_rgba(0,0,0,0.05)]";
              
              // We'll replace the commas with newlines if it's the complex one for styling like image
              const isComplexContent = content.includes('/');
              const parts = isComplexContent ? content.split(' / ') : [content];

              return (
                <div key={index} className="flex flex-col gap-2">
                  <span className="text-gray-400 font-bold text-[13px] tracking-wider pl-1 font-[Inter]">
                    {slot.time}
                  </span>
                  <div className={`rounded-2xl p-4 min-h-[80px] h-full flex items-center justify-center transition-all hover:-translate-y-1 ${blockClasses}`}>
                    <div className="text-center font-bold text-[#1a1b4b] text-xs sm:text-[13px] leading-snug max-w-[200px] font-[Inter]">
                      {isComplexContent ? (
                        <div className="flex flex-col gap-1">
                          {parts.map((p, i) => (
                            <span key={i} className="block">{p}</span>
                          ))}
                        </div>
                      ) : (
                        content
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 rounded-2xl bg-[#f8f9fa] flex items-center justify-center p-6 min-h-[140px]">
             <p className="font-bold text-gray-400 uppercase tracking-widest text-xs text-center">No assigned classes today</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyTimetable;
