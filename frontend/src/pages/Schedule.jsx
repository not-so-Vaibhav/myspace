import React from 'react';
import { Calendar, Clock, MapPin, User, Info, Wifi, Monitor, GraduationCap, Coffee, Utensils } from 'lucide-react';

const Schedule = () => {
  const timeSlots = [
    { time: "08.45 - 09.40", type: "lecture" },
    { time: "09.40 - 10.35", type: "lecture" },
    { time: "10.35 - 10.50", type: "break", icon: Coffee, label: "SHORT BREAK" },
    { time: "10.50 - 11.45", type: "lecture" },
    { time: "11.45 - 12.40", type: "lecture" },
    { time: "12.40 - 01.40", type: "break", icon: Utensils, label: "LUNCH BREAK" },
    { time: "01.40 - 02.35", type: "lecture" },
    { time: "02.35 - 03.30", type: "lecture" },
    { time: "03.30 - 03.40", type: "break", icon: Coffee, label: "SHORT BREAK" },
    { time: "03.40 - 04.30", type: "lecture" },
  ];

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
            <div className="w-12 h-12 rounded-xl bg-[#1a1b4b] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#1a1b4b]/20">
                <User size={20} />
            </div>
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Class Teacher</p>
                <p className="text-sm font-black text-[#1a1b4b]">Prof. Dr. Atul Thakare</p>
                <p className="text-[10px] font-bold text-[#ef4444]">+91-8767829219</p>
            </div>
        </div>
      </div>

      {/* Main Timetable Card */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-[#1a1b4b]/5 overflow-hidden">
        {/* Banner */}
        <div className="bg-[#1a1b4b] p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/10">
            <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <GraduationCap className="text-white" size={16} />
                </div>
                <div>
                    <h2 className="text-white font-black uppercase tracking-widest text-xs">MIT School of Computing</h2>
                    <p className="text-white/50 text-[9px] font-bold uppercase tracking-widest">Academic Year 2025-26</p>
                </div>
            </div>
            <div className="px-3 py-1 bg-white/10 rounded-lg border border-white/20 backdrop-blur-md">
                <span className="text-white text-[9px] font-black uppercase tracking-widest">W.E.F. 27th Jan 2026</span>
            </div>
        </div>

        {/* Timetable Container */}
        <div className="p-4 sm:p-6 overflow-hidden">
            <table className="w-full border-separate border-spacing-1 table-fixed">
              <thead>
                <tr>
                  <th className="w-20 bg-gray-50 rounded-xl p-2 text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">Time →</th>
                  {timeSlots.map((slot, i) => (
                    <th key={i} className={`p-2 rounded-xl text-[8px] font-black uppercase tracking-widest text-center ${slot.type === 'break' ? 'w-8 bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'}`}>
                      {slot.time.replace(' - ', '-')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Monday */}
                <tr>
                  <td className="bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl p-2 text-center">
                        <span className="text-[10px] font-black text-white uppercase leading-tight">MON <span className="block text-[7px] opacity-70">(ONL)</span></span>
                  </td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">SCIL</p></td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">CN:SJ</p></td>
                  <td rowSpan={6} className="bg-amber-50/40 rounded-xl flex items-center justify-center p-1">
                    <div className="text-[8px] font-black text-amber-600 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>BREAK</div>
                  </td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">OS:ATH</p></td>
                  <td className="bg-[#1a1b4b]/5 rounded-xl p-2 text-center border border-[#1a1b4b]/10 border-dashed"><p className="text-[8px] font-black text-[#1a1b4b] uppercase opacity-40">REMEDIAL</p></td>
                  <td rowSpan={6} className="bg-indigo-50/40 rounded-xl flex items-center justify-center p-1">
                    <div className="text-[8px] font-black text-indigo-600 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>LUNCH</div>
                  </td>
                  <td colSpan={2} className="bg-blue-50/50 border border-blue-100 rounded-xl p-2 text-center">
                    <p className="text-[9px] font-black text-[#1a1b4b]">OE: NISM/NPTEL</p>
                  </td>
                  <td rowSpan={4} className="bg-amber-50/40 rounded-xl flex items-center justify-center p-1">
                    <div className="text-[8px] font-black text-amber-600" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>BREAK</div>
                  </td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">MOOC</p></td>
                </tr>

                {/* Tuesday */}
                <tr>
                  <td className="bg-gray-50 rounded-xl p-2 text-center"><span className="text-[10px] font-black text-[#1a1b4b] uppercase">TUE</span></td>
                  <td colSpan={2} className="bg-amber-100/50 border border-amber-200 rounded-xl p-2 text-[7px] font-black text-amber-700 leading-tight">
                    A: WTL:SMM:N511 | B: CNL:SJ:N513 | C: WTL:AU:N519
                  </td>
                  <td colSpan={2} className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">ENT:MAN:N505</p></td>
                  <td colSpan={2} className="bg-gray-50/50 rounded-xl p-2 text-[7px] text-center text-gray-400 font-bold uppercase leading-tight">
                    FAI1|TOC1|FCC1|CSE1
                  </td>
                  <td className="bg-[#1a1b4b]/5 rounded-xl p-2 text-center border border-[#1a1b4b]/10 border-dashed"><p className="text-[8px] font-black text-[#1a1b4b] uppercase opacity-40">REMEDIAL</p></td>
                </tr>

                {/* Wednesday */}
                <tr>
                  <td className="bg-gray-50 rounded-xl p-2 text-center"><span className="text-[10px] font-black text-[#1a1b4b] uppercase">WED</span></td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">OS:ATH</p></td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">EE:KS</p></td>
                  <td colSpan={2} className="bg-amber-100/50 border border-amber-200 rounded-xl p-2 text-[7px] font-black text-amber-700 leading-tight">
                    A: CNL:SJ:N511 | B: WTL:SAD:N513 | C: WTL:AU:N519
                  </td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">CN:SJ</p></td>
                  <td className="bg-emerald-500 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-white">SCIL</p></td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[8px] font-black text-[#1a1b4b] opacity-40 uppercase">LIB</p></td>
                </tr>

                {/* Thursday */}
                <tr>
                  <td className="bg-gray-50 rounded-xl p-2 text-center"><span className="text-[10px] font-black text-[#1a1b4b] uppercase">THU</span></td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">EE:KS</p></td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">CN:SJ</p></td>
                  <td colSpan={2} className="bg-amber-100/50 border border-amber-200 rounded-xl p-2 text-[7px] font-black text-amber-700 leading-tight">
                    A: WTL:SMM:N511 | B: WTL:SAD:N513 | C: CNL:SPD:N608
                  </td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">OS:ATH</p></td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">OS:ATH</p></td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[8px] font-black text-[#1a1b4b] opacity-40 uppercase">MENTOR</p></td>
                </tr>

                {/* Friday */}
                <tr>
                  <td className="bg-gray-50 rounded-xl p-2 text-center"><span className="text-[10px] font-black text-[#1a1b4b] uppercase">FRI</span></td>
                  <td colSpan={2} className="bg-gray-50/50 rounded-xl p-2 text-[7px] text-center text-gray-400 font-bold uppercase leading-tight">
                    FAI1|TOC1|FCC1|CSE1
                  </td>
                  <td colSpan={2} className="bg-amber-50/40 rounded-xl flex items-center justify-center p-1">
                    <div className="text-[8px] font-black text-amber-600" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>BREAK</div>
                  </td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">CN:SJ</p></td>
                  <td className="bg-[#1a1b4b]/5 rounded-xl p-2 text-center border border-[#1a1b4b]/10 border-dashed"><p className="text-[8px] font-black text-[#1a1b4b] uppercase opacity-40">REMEDIAL</p></td>
                  <td className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[8px] font-black text-[#1a1b4b] opacity-40 uppercase">LIB</p></td>
                  <td colSpan={3} className="bg-emerald-500 rounded-xl p-2 text-center">
                    <p className="text-[8px] font-black text-white uppercase leading-tight">SHD (SISM2) 2:35-4:30</p>
                  </td>
                </tr>

                {/* Saturday */}
                <tr>
                  <td className="bg-[#1a1b4b] rounded-xl p-2 text-center"><span className="text-[10px] font-black text-white uppercase">SAT</span></td>
                  <td colSpan={2} className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">OS:ATH:N505</p></td>
                  <td className="bg-amber-50/40 rounded-xl flex items-center justify-center p-1">
                    <div className="text-[8px] font-black text-amber-600" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>BREAK</div>
                  </td>
                  <td colSpan={2} className="bg-gray-50/50 rounded-xl p-2 text-center"><p className="text-[9px] font-black text-[#1a1b4b]">EE:KS:S605</p></td>
                  <td colSpan={5} className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-2 text-center">
                    <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">PBL II REVIEW</p>
                  </td>
                </tr>
              </tbody>
            </table>
        </div>

        {/* Footer info */}
        <div className="p-8 bg-gray-50/30 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shrink-0">
                    <Info size={18} />
                </div>
                <div>
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Working Saturday Dates</p>
                     <p className="text-[10px] font-bold text-gray-600 leading-tight max-w-[400px]">
                        31st Jan, 14th Feb, 28th Feb, 14th Mar, 28th Mar, 11th Apr, 25th Apr 2026
                     </p>
                </div>
            </div>
            
            <div className="flex gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Labs / Workshops</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Batches</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Online Sessions</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
