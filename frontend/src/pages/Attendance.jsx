import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CalendarCheck, ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudentAttendance } from '../hooks/useStudentAttendance';

const Attendance = () => {
  const { profile } = useAuth();
  const [activeSubject, setActiveSubject] = useState(null);
  
  const { loading, subjectData, overallPct } = useStudentAttendance();

  const getBackRoute = () => {
    const role = profile?.role?.toLowerCase() || 'student';
    if (role === 'faculty') return '/faculty-dashboard';
    if (role === 'admin') return '/admin-dashboard';
    return '/student-dashboard';
  };

  const chartData = [
    { name: 'Present', value: overallPct, color: '#1a1b4b' },
    { name: 'Absent', value: 100 - overallPct, color: '#ef4444' },
  ];

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
         <Loader2 className="animate-spin w-8 h-8 text-[#1a1b4b]" />
      </div>
    );
  }

  return (
    <div className="p-8 sm:p-12 space-y-10">
      {/* Header and Back Button */}
      <div className="flex flex-col gap-2 mb-8">
        <Link to={getBackRoute()} className="inline-flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors w-max mb-2">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <div>
          <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
            Attendance Log
          </h1>
          <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
            Real-Time Subject Breakdown
          </p>
        </div>
      </div>

      {subjectData.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
           <CalendarCheck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
           <h3 className="text-lg font-black text-[#1a1b4b]">No Courses Found</h3>
           <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-2">You are not enrolled in any subjects tracking attendance.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: Overall Stats Gauge */}
          <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-[var(--color-border-light)] shadow-sm sticky top-24">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                   <CalendarCheck className="w-5 h-5 text-[#1a1b4b]" />
                 </div>
                 <div>
                    <h2 className="text-[#1a1b4b] font-black text-lg tracking-tight uppercase leading-none">Net Rate</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Current Semester</p>
                 </div>
               </div>
            </div>

            <div className="relative flex flex-col items-center justify-center my-6" style={{ height: '220px' }}>
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="80%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={20}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      itemStyle={{ color: 'var(--color-text)', fontWeight: 'bold' }}
                      contentStyle={{ borderRadius: '1rem', border: 'none', backgroundColor: 'var(--color-surface)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute bottom-12 flex flex-col items-center">
                <span className="text-5xl font-black text-[#1a1b4b] tracking-tighter">{overallPct}%</span>
              </div>
              
              <div className="absolute bottom-0 flex gap-6 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-full">
                {chartData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                    {entry.name}
                  </div>
                ))}
              </div>
            </div>

            <div className={`mt-8 p-4 rounded-2xl flex items-start gap-3 border ${overallPct >= 75 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
               <ShieldAlert className={`w-5 h-5 shrink-0 ${overallPct >= 75 ? 'text-green-500' : 'text-red-500'}`} />
               <div>
                  <p className={`text-xs font-black uppercase tracking-widest mb-1 ${overallPct >= 75 ? 'text-green-700' : 'text-red-700'}`}>
                     {overallPct >= 75 ? 'Good Standing' : 'Critical Warning'}
                  </p>
                  <p className={`text-[10px] font-semibold leading-relaxed ${overallPct >= 75 ? 'text-green-600/80' : 'text-red-600/80'}`}>
                     {overallPct >= 75 
                       ? "You meet the university 75% attendance criteria. Keep up the consistent work across all subjects." 
                       : "You are severely falling behind the required minimum attendance boundary. Immediate improvement required."}
                  </p>
               </div>
            </div>
          </div>

          {/* Right Column: Detailed Breakdowns */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-[var(--color-border-light)] shadow-sm p-8">
             <div className="flex items-center justify-between mb-6">
                 <h3 className="text-[#1a1b4b] font-black text-lg tracking-tight uppercase flex items-center gap-3">
                   <span>Module Logs</span>
                   <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] tracking-widest flex items-center gap-1.5 border border-green-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      Real-Time Sync
                   </span>
                 </h3>
             </div>

             <div className="space-y-5">
                {subjectData.map((s, i) => {
                  const pct = s.total === 0 ? 100 : Math.round((s.present / s.total) * 100);
                  const isLow = pct < 75;
                  const isActive = activeSubject === i;

                  return (
                    <div
                      key={i}
                      onClick={() => setActiveSubject(isActive ? null : i)}
                      className={`group relative rounded-2xl p-5 cursor-pointer transition-all border ${isActive ? 'bg-[#f8f9fc] border-indigo-100 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                             <span className="text-xl font-black text-[#1a1b4b] tracking-tighter">{s.subject}</span>
                             {isLow && <span className="bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">Deficit</span>}
                          </div>
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.full}</span>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-baseline justify-end gap-1 mb-1">
                             <span className={`text-2xl font-black tracking-tighter leading-none ${isLow ? 'text-red-500' : 'text-[#1a1b4b]'}`}>{pct}%</span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{s.present} / {s.total} Sessions</p>
                        </div>
                      </div>

                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${isLow ? 'bg-gradient-to-r from-red-400 to-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-gradient-to-r from-[#1a1b4b] to-indigo-600'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Attendance;
