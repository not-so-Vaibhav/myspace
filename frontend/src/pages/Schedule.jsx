import React from 'react';

const Schedule = () => {
  return (
    <div className="p-8 sm:p-12 space-y-8 bg-[#fcfdfe] min-h-screen">
      <div>
        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
          Weekly Schedule
        </h1>
        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
          SY 1 · Computer Science & Engineering · Sem-IV
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-2 sm:p-6 overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Header Rows */}
          <div className="border border-gray-800 flex flex-col mb-4 bg-white/50">
            <div className="grid grid-cols-2 border-b border-gray-800">
              <div className="p-2 font-bold text-center border-r border-gray-800 text-sm">MIT SCHOOL OF COMPUTING</div>
              <div className="p-2 font-bold text-center text-sm">DEPARTMENTAL TIME TABLE</div>
            </div>
            <div className="border-b border-gray-800 text-center font-bold text-red-600 py-1 text-sm bg-red-50/50">
              Computer Science & Engineering
            </div>
            <div className="grid grid-cols-3 border-b border-gray-800 bg-[#e6f0fa] text-[13px] font-bold">
              <div className="p-2 border-r border-gray-800">Class : SY 1</div>
              <div className="p-2 border-r border-gray-800 text-center">Academic Year : 2025-26, Sem - IV</div>
              <div className="p-2 text-right">W.E.F. 27th January 2026</div>
            </div>
            <div className="bg-black text-white text-center py-2 text-[13px] font-bold">
              Name of the Class Teacher : Prof. Dr. Atul Thakare (+91-8767829219) atul.thakare@mituniversity.edu.in
            </div>
          </div>

          <table className="w-full text-center border-collapse text-[11px] sm:text-xs border border-gray-800">
            <thead className="font-bold">
              <tr>
                <th className="border border-gray-800 p-2 font-bold bg-gray-50">Day ↓ Time →</th>
                <th className="border border-gray-800 p-2 font-bold bg-gray-50">08.45 - 09.40</th>
                <th className="border border-gray-800 p-2 font-bold bg-gray-50">09.40 - 10.35</th>
                <th className="border border-gray-800 p-2 font-bold bg-gray-50 whitespace-pre">10.35 -<br/>10.50</th>
                <th className="border border-gray-800 p-2 font-bold bg-gray-50">10.50 - 11.45</th>
                <th className="border border-gray-800 p-2 font-bold bg-gray-50">11.45 - 12.40</th>
                <th className="border border-gray-800 p-2 font-bold bg-gray-50 whitespace-pre">12.40 -<br/>01.40</th>
                <th className="border border-gray-800 p-2 font-bold bg-gray-50">01.40 - 02.35</th>
                <th className="border border-gray-800 p-2 font-bold bg-gray-50">02.35 - 03.30</th>
                <th className="border border-gray-800 p-2 font-bold bg-gray-50 whitespace-pre">03.30 -<br/>03.40</th>
                <th className="border border-gray-800 p-2 font-bold bg-gray-50">03.40 - 04.30</th>
              </tr>
            </thead>
            <tbody>
              {/* Monday */}
              <tr>
                <td className="border border-gray-800 p-2 bg-[#ff00ff] text-black font-bold h-20">Monday<br/>(Online)</td>
                <td className="border border-gray-800 p-2">SCIL</td>
                <td className="border border-gray-800 p-2">CN : SJ</td>
                <td rowSpan={6} className="border-y border-x border-gray-800 font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Short Break</td>
                <td className="border border-gray-800 p-2">OS : ATH</td>
                <td className="border border-gray-800 p-2 whitespace-nowrap">Remedial Lecture</td>
                <td rowSpan={6} className="border-y border-x border-gray-800 font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Lunch Break</td>
                <td colSpan={2} className="border border-gray-800 p-2">OE : NISM/NPTEL</td>
                <td rowSpan={4} className="border-y border-x border-gray-800 font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Short Break</td>
                <td className="border border-gray-800 p-2">MOOC</td>
              </tr>
              {/* Tuesday */}
              <tr>
                <td className="border border-gray-800 p-2 font-bold h-24">Tuesday</td>
                <td colSpan={2} className="border border-gray-800 p-2 bg-yellow-300 font-bold text-left pl-6 leading-tight whitespace-nowrap">
                  A : WTL : SMM : N511<br/>
                  B : CNL : SJ : N513<br/>
                  C : WTL : AU : N519
                </td>
                <td colSpan={2} className="border border-gray-800 p-2">ENT : MAN : N505</td>
                <td colSpan={2} className="border border-gray-800 p-2 text-[10px] leading-tight text-center">
                  FAI1: SS: N507<br/>
                  TOC1: MNG: N505<br/>
                  FCC1: VBO: N506<br/>
                  CSE1: SPD: N510
                </td>
                <td className="border border-gray-800 p-2 whitespace-nowrap">Remedial Lecture</td>
              </tr>
              {/* Wednesday */}
              <tr>
                <td className="border border-gray-800 p-2 font-bold h-24">Wednesday</td>
                <td className="border border-gray-800 p-2">OS : ATH :<br/>N505</td>
                <td className="border border-gray-800 p-2">EE : KS :<br/>N505</td>
                <td colSpan={2} className="border border-gray-800 p-2 bg-yellow-300 font-bold text-left pl-6 leading-tight whitespace-nowrap">
                  A : CNL : SJ : N511<br/>
                  B : WTL : SAD : N513<br/>
                  C : WTL : AU : N519
                </td>
                <td className="border border-gray-800 p-2">CN : SJ :<br/>N505</td>
                <td className="border border-gray-800 p-2 bg-[#00ff00] font-bold text-black">SCIL<br/>N505</td>
                <td className="border border-gray-800 p-2">Library</td>
              </tr>
              {/* Thursday */}
              <tr>
                <td className="border border-gray-800 p-2 font-bold h-24">Thursday</td>
                <td className="border border-gray-800 p-2">EE : KS :<br/>N505</td>
                <td className="border border-gray-800 p-2">CN : SJ :<br/>N505</td>
                <td colSpan={2} className="border border-gray-800 p-2 bg-yellow-300 font-bold text-left pl-6 leading-tight whitespace-nowrap">
                  A : WTL : SMM : N511<br/>
                  B : WTL : SAD : N513<br/>
                  C : CNL : SPD : N608
                </td>
                <td className="border border-gray-800 p-2">OS : ATH :<br/>N505</td>
                <td className="border border-gray-800 p-2">OS : ATH :<br/>N505</td>
                <td className="border border-gray-800 p-2">Mentor Meeting</td>
              </tr>
              {/* Friday */}
              <tr>
                <td className="border border-gray-800 p-2 font-bold h-24">Friday</td>
                <td colSpan={2} className="border border-gray-800 p-2 text-[10px] leading-tight text-center">
                  FAI1: SS: N507<br/>
                  TOC1: MNG: N505<br/>
                  FCC1: VBO: N506<br/>
                  CSE1: SPD: N510
                </td>
                <td className="border border-gray-800 p-2">CN : SJ :<br/>N505</td>
                <td className="border border-gray-800 p-2 whitespace-nowrap">Remedial Lecture</td>
                <td className="border border-gray-800 p-2">Library</td>
                <td colSpan={3} className="border border-gray-800 p-2 bg-[#00ff00] text-black font-bold leading-tight">
                  SHD (SISM2)<br/>(2nd & 4th Week)<br/>2.35 PM to 4.30 PM
                </td>
              </tr>
              {/* Saturday */}
              <tr>
                <td className="border border-gray-800 p-2 font-bold h-20 leading-tight">Saturday<br/>(Working)</td>
                <td colSpan={2} className="border border-gray-800 p-2 font-bold">OS : ATH : N505</td>
                <td colSpan={2} className="border border-gray-800 p-2 font-bold">EE : KS : S605</td>
                <td colSpan={4} className="border border-gray-800 p-2 font-bold bg-gray-100/50">PBL II Review</td>
              </tr>
            </tbody>
          </table>
          <div className="text-[10px] font-bold text-gray-500 mt-2">
            Working Saturday : 31st Jan, 14th Feb, 28th Feb, 14th Mar, 28th Mar, 11th Apr, 25th Apr 2026
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
