import React from 'react';
import { Calendar, Clock, MapPin, User, Info, Wifi, Monitor, GraduationCap, Coffee, Utensils } from 'lucide-react';

const Schedule = () => {
  const headers = [
    { time: "08.45-09.40", type: "slot" },
    { time: "09.40-10.35", type: "slot" },
    { time: "10.35-10.50", type: "break", label: "BREAK" },
    { time: "10.50-11.45", type: "slot" },
    { time: "11.45-12.40", type: "slot" },
    { time: "12.40-01.40", type: "break", label: "LUNCH" },
    { time: "01.40-02.35", type: "slot" },
    { time: "02.35-03.30", type: "slot" },
    { time: "03.30-03.40", type: "break", label: "BREAK" },
    { time: "03.40-04.30", type: "slot" },
  ];

  const TimetableItem = ({ children, colSpan = 1, className = "" }) => (
    <div 
        className={`rounded-xl p-2 flex flex-col justify-center items-center text-center transition-all ${className}`}
        style={{ gridColumn: `span ${colSpan}` }}
    >
        {children}
    </div>
  );

  return (
    <div className="p-8 sm:p-12 space-y-10 bg-[#fcfdfe] min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#ef4444]/10 rounded-xl">
              <Calendar className="text-[#ef4444]" size={24} />
            </div>
            <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
              Departmental Timetable
            </h1>
          </div>
          <p className="text-gray-400 font-bold text-xs tracking-widest uppercase ml-11">
            SY 1 · Computer Science & Engineering · Sem-IV
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1a1b4b] flex items-center justify-center text-white shrink-0">
                <User size={20} />
            </div>
            <div>
                <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Class Teacher</p>
                <p className="text-sm font-black text-[#1a1b4b]">Prof. Dr. Atul Thakare</p>
                <p className="text-[12px] font-bold text-[#ef4444]">+91-8767829219</p>
            </div>
        </div>
      </div>

      {/* Grid-based Timetable */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-[#1a1b4b]/5 overflow-hidden p-6 sm:p-10">
        
        {/* Banner */}
        <div className="bg-[#1a1b4b] p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <GraduationCap className="text-white" size={16} />
                </div>
                <div>
                    <h2 className="text-white font-black uppercase tracking-widest text-xs">MIT SCHOOL OF COMPUTING</h2>
                    <p className="text-white/50 text-[12px] font-bold uppercase tracking-widest">Academic Year 2025-26 · Sem-IV</p>
                </div>
            </div>
            <div className="px-3 py-1 bg-white/10 rounded-lg border border-white/20">
                <span className="text-white text-[12px] font-black uppercase tracking-widest">W.E.F. 27th Jan 2026</span>
            </div>
        </div>

        {/* Timetable Contents */}
        <div className="grid grid-cols-[80px_repeat(10,1fr)] gap-1.5 min-w-[1000px]">
          {/* Header Row */}
          <div className="bg-gray-50 rounded-xl p-2 flex items-center justify-center text-[12px] font-black text-gray-400 uppercase tracking-widest">DAYS</div>
          {headers.map((h, i) => (
            <div key={i} 
                 className={`rounded-xl p-2 text-center text-[12px] font-black uppercase tracking-widest ${h.type === 'break' ? 'text-amber-600/80' : 'bg-gray-50 text-gray-400'}`}
                 style={h.type === 'break' ? { backgroundColor: 'oklch(0.987 0.022 95.277)' } : {}}
            >
              {h.time}
            </div>
          ))}

          {/* Monday Row */}
          <div className="bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl p-3 flex flex-col items-center justify-center text-center">
             <span className="text-[12px] font-black text-white uppercase leading-tight">MON</span>
             <span className="text-[12px] font-black text-white/50 uppercase leading-tight">(ONL)</span>
          </div>
          <TimetableItem className="bg-gray-50/50"><span className="text-[12px] font-black text-[#1a1b4b]">SCIL</span></TimetableItem>
          <TimetableItem className="bg-gray-50/50"><span className="text-[12px] font-black text-[#1a1b4b]">CN : SJ</span></TimetableItem>
          {/* Column 4 - Break Pillar */}
          <div className="row-span-6 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'oklch(0.987 0.022 95.277)' }}>
            <span className="text-[12px] font-black text-amber-600/60 uppercase tracking-[0.3em]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>SHORT BREAK</span>
          </div>
          <TimetableItem className="bg-gray-50/50"><span className="text-[12px] font-black text-[#1a1b4b]">OS : ATH</span></TimetableItem>
          <TimetableItem className="bg-[#1a1b4b]/5 border border-[#1a1b4b]/10 border-dashed"><span className="text-[12px] font-black text-[#1a1b4b] opacity-40 uppercase">REMEDIAL LECTURE</span></TimetableItem>
          {/* Column 7 - Lunch Pillar */}
          <div className="row-span-6 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'oklch(0.987 0.022 95.277)' }}>
            <span className="text-[12px] font-black text-amber-600/60 uppercase tracking-[0.4em]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>LUNCH BREAK</span>
          </div>
          <TimetableItem colSpan={2} className="bg-blue-50/50 border border-blue-100"><span className="text-[12px] font-black text-blue-600 uppercase">OE : NISM/NPTEL</span></TimetableItem>
          {/* Column 10 - Break Pillar (Mon-Thu) */}
          <div className="row-span-4 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'oklch(0.987 0.022 95.277)' }}>
            <span className="text-[12px] font-black text-amber-600/60 uppercase tracking-[0.3em]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>SHORT BREAK</span>
          </div>
          <TimetableItem className="bg-gray-50/50"><span className="text-[12px] font-black text-[#1a1b4b]">MOOC</span></TimetableItem>

          {/* Tuesday Row */}
          <div className="bg-gray-50 rounded-xl p-2 flex items-center justify-center text-[12px] font-black text-[#1a1b4b] uppercase">TUE</div>
          <TimetableItem colSpan={2} className="bg-indigo-50/60 border border-indigo-100/50">
             <div className="text-[12px] font-black text-indigo-600 leading-tight space-y-0.5">
                <div className="flex justify-between w-full"><span>A: WTL</span><span>N511</span></div>
                <div className="flex justify-between w-full opacity-60"><span>B: CNL</span><span>N513</span></div>
                <div className="flex justify-between w-full opacity-60"><span>C: WTL</span><span>N519</span></div>
             </div>
          </TimetableItem>
          <TimetableItem colSpan={2} className="bg-gray-50/50">
            <span className="text-[12px] font-black text-[#1a1b4b]">ENT : MAN</span>
            <span className="text-[12px] font-bold text-gray-400">N505</span>
          </TimetableItem>
          <TimetableItem className="bg-gray-50/50">
             <div className="text-[12px] font-bold text-gray-400 uppercase leading-none text-center">
                FAI1:N507 | TOC1:N505<br/>FCC1:N506 | CSE1:N510
             </div>
          </TimetableItem>
          <TimetableItem className="bg-[#1a1b4b]/5 border border-[#1a1b4b]/10 border-dashed"><span className="text-[12px] font-black text-[#1a1b4b] opacity-40 uppercase">REMEDIAL</span></TimetableItem>
          <TimetableItem className="bg-[#1a1b4b]/5 border border-[#1a1b4b]/10 border-dashed"><span className="text-[12px] font-black text-[#1a1b4b] opacity-40 uppercase">REMEDIAL LECTURE</span></TimetableItem>

          {/* Wednesday Row */}
          <div className="bg-gray-50 rounded-xl p-2 flex items-center justify-center text-[12px] font-black text-[#1a1b4b] uppercase">WED</div>
          <TimetableItem className="bg-gray-50/50">
            <span className="text-[12px] font-black text-[#1a1b4b]">OS : ATH</span>
            <span className="text-[12px] font-bold text-gray-400">N505</span>
          </TimetableItem>
          <TimetableItem className="bg-gray-50/50">
            <span className="text-[12px] font-black text-[#1a1b4b]">EE : KS</span>
            <span className="text-[12px] font-bold text-gray-400">N505</span>
          </TimetableItem>
          <TimetableItem colSpan={2} className="bg-indigo-50/60 border border-indigo-100/50">
             <div className="text-[12px] font-black text-indigo-600 leading-tight space-y-0.5">
                <div className="flex justify-between w-full"><span>A: CNL</span><span>N511</span></div>
                <div className="flex justify-between w-full opacity-60"><span>B: WTL</span><span>N513</span></div>
                <div className="flex justify-between w-full opacity-60"><span>C: WTL</span><span>N519</span></div>
             </div>
          </TimetableItem>
          <TimetableItem className="bg-gray-50/50">
            <span className="text-[12px] font-black text-[#1a1b4b]">CN : SJ</span>
            <span className="text-[12px] font-bold text-gray-400">N505</span>
          </TimetableItem>
          <TimetableItem className="bg-emerald-500 shadow-lg shadow-emerald-500/20">
            <span className="text-[12px] font-black text-white">SCIL</span>
            <span className="text-[12px] font-bold text-white/50">N505</span>
          </TimetableItem>
          <TimetableItem className="bg-gray-50/50 opacity-40"><span className="text-[12px] font-black text-[#1a1b4b] uppercase">LIBRARY</span></TimetableItem>

          {/* Thursday Row */}
          <div className="bg-gray-50 rounded-xl p-2 flex items-center justify-center text-[12px] font-black text-[#1a1b4b] uppercase">THU</div>
          <TimetableItem className="bg-gray-50/50">
            <span className="text-[12px] font-black text-[#1a1b4b]">EE : KS</span>
            <span className="text-[12px] font-bold text-gray-400">N505</span>
          </TimetableItem>
          <TimetableItem className="bg-gray-50/50">
            <span className="text-[12px] font-black text-[#1a1b4b]">CN : SJ</span>
            <span className="text-[12px] font-bold text-gray-400">N505</span>
          </TimetableItem>
          <TimetableItem colSpan={2} className="bg-indigo-50/60 border border-indigo-100/50">
             <div className="text-[12px] font-black text-indigo-600 leading-tight space-y-0.5">
                <div className="flex justify-between w-full"><span>A: WTL</span><span>N511</span></div>
                <div className="flex justify-between w-full opacity-60"><span>B: WTL</span><span>N513</span></div>
                <div className="flex justify-between w-full opacity-60"><span>C: CNL</span><span>N608</span></div>
             </div>
          </TimetableItem>
          <TimetableItem className="bg-gray-50/50">
            <span className="text-[12px] font-black text-[#1a1b4b]">OS : ATH</span>
            <span className="text-[12px] font-bold text-gray-400">N505</span>
          </TimetableItem>
          <TimetableItem className="bg-gray-50/50">
            <span className="text-[12px] font-black text-[#1a1b4b]">OS : ATH</span>
            <span className="text-[12px] font-bold text-gray-400">N505</span>
          </TimetableItem>
          <TimetableItem className="bg-gray-50/50 opacity-40"><span className="text-[12px] font-black text-[#1a1b4b] uppercase">MENTOR MEETING</span></TimetableItem>

          {/* Friday Row */}
          <div className="bg-gray-50 rounded-xl p-2 flex items-center justify-center text-[12px] font-black text-[#1a1b4b] uppercase">FRI</div>
          <TimetableItem colSpan={2} className="bg-gray-50/50">
             <div className="text-[12px] font-bold text-gray-400 uppercase leading-none text-center">
                FAI1:N507 | TOC1:N505<br/>FCC1:N506 | CSE1:N510
             </div>
          </TimetableItem>
          <TimetableItem className="bg-gray-50/50">
            <span className="text-[12px] font-black text-[#1a1b4b]">CN : SJ</span>
            <span className="text-[12px] font-bold text-gray-400">N505</span>
          </TimetableItem>
          <TimetableItem className="bg-[#1a1b4b]/5 border border-[#1a1b4b]/10 border-dashed"><span className="text-[12px] font-black text-[#1a1b4b] opacity-40 uppercase">REMEDIAL LECTURE</span></TimetableItem>
          <TimetableItem className="bg-gray-50/50 opacity-40"><span className="text-[12px] font-black text-[#1a1b4b] uppercase">LIBRARY</span></TimetableItem>
          <TimetableItem colSpan={3} className="bg-emerald-500 shadow-lg shadow-emerald-500/20">
             <div className="flex flex-col items-center">
                <span className="text-[12px] font-black text-white uppercase leading-tight text-center">SHD (SISM2) · 2:35 PM to 4:30 PM</span>
                <span className="text-[12px] font-bold text-white opacity-50 uppercase tracking-widest mt-1">(2nd & 4th Week)</span>
             </div>
          </TimetableItem>

          {/* Saturday Row */}
          <div className="bg-[#1a1b4b] rounded-xl p-2 flex flex-col items-center justify-center text-center">
             <span className="text-[12px] font-black text-white uppercase leading-tight">SAT</span>
             <span className="text-[12px] font-black text-white/50 uppercase leading-none mt-0.5">(WORK)</span>
          </div>
          <TimetableItem colSpan={2} className="bg-gray-50/50 border border-gray-100">
            <span className="text-[12px] font-black text-[#1a1b4b]">OS : ATH</span>
            <span className="text-[12px] font-bold text-gray-400 uppercase">Room N505</span>
          </TimetableItem>
          <TimetableItem colSpan={2} className="bg-gray-50/50 border border-gray-100">
            <span className="text-[12px] font-black text-[#1a1b4b]">EE : KS</span>
            <span className="text-[12px] font-bold text-gray-400 uppercase">Room S605</span>
          </TimetableItem>
          <TimetableItem colSpan={4} className="bg-indigo-50 border border-indigo-100 shadow-sm">
             <span className="text-[13px] font-black text-indigo-600 uppercase tracking-[0.4em]">PBL II REVIEW SESSION</span>
             <span className="text-[12px] font-bold text-indigo-400 uppercase mt-1">01.40 PM to 04.30 PM</span>
          </TimetableItem>
        </div>

        {/* Legend / Info Footer */}
        <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 bg-amber-50/50 px-5 py-3 rounded-2xl border border-amber-100">
                <Info size={18} className="text-amber-500 shrink-0" />
                <p className="text-[12px] font-bold text-amber-700 leading-tight">
                    Working Saturdays: 31st Jan, 14th Feb, 28th Feb, 14th Mar, 28th Mar, 11th Apr, 25th Apr.
                </p>
            </div>
            
            <div className="flex gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Labs / Practical</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400"></div>
                    <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Batch Sessions</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                    <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Online / Hybrid</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
