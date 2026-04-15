import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { 
    CalendarCheck, 
    ShieldAlert, 
    ArrowLeft, 
    Loader2, 
    Clock, 
    Zap, 
    History,
    BookOpen,
    List,
    LayoutDashboard,
    Calendar,
    Download,
    MapPin,
    FileSpreadsheet
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudentAttendance } from '../hooks/useStudentAttendance';

// Dummy Daily Log Data for the History Tab
const dummyLogs = [
    { date: '01-04-2026', inTime: '08:41', outDate: '01-04-2026', outTime: '17:17', onDuty: 'NA', leave: 'NA', shift: 'Primary: ADT', workHours: '07H 49M', totalHours: '08H 36M', extraHours: '00H 36M' },
    { date: '02-04-2026', inTime: '10:45', outDate: '02-04-2026', outTime: '17:33', onDuty: 'NA', leave: 'ML', shift: 'Primary: ADT', workHours: '05H 45M', totalHours: '06H 48M', extraHours: '00H 00M' },
    { date: '03-04-2026', inTime: '00:00', outDate: '03-04-2026', outTime: '00:00', onDuty: 'NA', leave: 'Pending', shift: 'Primary: ADT', workHours: '00H 00M', totalHours: '00H 00M', extraHours: '00H 00M' },
    { date: '04-04-2026', inTime: '00:00', outDate: '04-04-2026', outTime: '00:00', onDuty: 'NA', leave: 'NA', shift: 'Primary: ADT', workHours: '00H 00M', totalHours: '00H 00M', extraHours: '00H 00M' },
    { date: '06-04-2026', inTime: '08:43', outDate: '06-04-2026', outTime: '18:39', onDuty: 'NA', leave: 'NA', shift: 'Primary: ADT', workHours: '07H 47M', totalHours: '09H 56M', extraHours: '01H 56M' },
    { date: '07-04-2026', inTime: '08:37', outDate: '07-04-2026', outTime: '18:49', onDuty: 'NA', leave: 'NA', shift: 'Primary: ADT', workHours: '07H 53M', totalHours: '10H 12M', extraHours: '02H 12M' },
];

const Attendance = () => {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'log'
    const { loading, subjectData, overallPct } = useStudentAttendance();

    const chartData = [
        { name: 'Present', value: overallPct, color: '#1a1b4b' },
        { name: 'Absent', value: 100 - overallPct, color: '#ef4444' },
    ];

    if (loading) {
        return (
            <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="animate-spin w-10 h-10 text-[#1a1b4b]" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Compiling Dual-View Attendance...</p>
            </div>
        );
    }

    return (
        <div className="p-8 sm:p-12 space-y-10 bg-[#fcfdfe] min-h-screen font-sans">
            {/* Header & Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                <div>
                    <Link to="/leave-application" className="inline-flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors w-max mb-3">
                        <ArrowLeft size={14} /> Back to Leave Portal
                    </Link>
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter">Attendance Vault</h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1 italic">Real-Time Sync & Historical Analysis</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1.5 bg-slate-100/50 rounded-2xl border-2 border-slate-50 shadow-sm self-start">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                            activeTab === 'overview' ? 'bg-[#1a1b4b] text-white shadow-lg' : 'text-gray-400 hover:text-[#1a1b4b]'
                        }`}
                    >
                        <LayoutDashboard size={14} /> Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('log')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                            activeTab === 'log' ? 'bg-[#1a1b4b] text-white shadow-lg' : 'text-gray-400 hover:text-[#1a1b4b]'
                        }`}
                    >
                        <History size={14} /> Detailed Log
                    </button>
                </div>
            </div>

            {activeTab === 'overview' ? (
                /* SUBJECT OVERVIEW VIEW */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start animate-in fade-in slide-in-from-bottom-5">
                    {/* Left Column: Metrics Gauge */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
                            <Zap className="absolute -right-4 -top-4 w-32 h-32 text-[#1a1b4b] opacity-5 rotate-12" />
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-[#1a1b4b] font-black text-xl tracking-tighter uppercase">Net Rate</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Semester Performance</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#1a1b4b]">
                                    <Clock size={24} />
                                </div>
                            </div>
                            <div className="relative flex flex-col items-center justify-center mb-8" style={{ height: '240px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData} cx="50%" cy="80%" startAngle={180} endAngle={0} innerRadius={85} outerRadius={125} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={20}>
                                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute bottom-12 flex flex-col items-center">
                                    <span className="text-5xl font-black text-[#1a1b4b] tracking-tighter">{overallPct}%</span>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Presence</p>
                                </div>
                            </div>
                            <div className={`p-6 rounded-2xl flex items-start gap-4 border-2 ${overallPct >= 75 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                <ShieldAlert className={`w-6 h-6 shrink-0 ${overallPct >= 75 ? 'text-emerald-500' : 'text-red-500'}`} />
                                <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${overallPct >= 75 ? 'text-emerald-700' : 'text-red-700'}`}>{overallPct >= 75 ? 'Good Standing' : 'Critical Deficit'}</p>
                                    <p className={`text-[9px] font-bold leading-relaxed ${overallPct >= 75 ? 'text-emerald-600/80' : 'text-red-600/80'}`}>
                                        {overallPct >= 75 ? "Your status is secured above the 75% boundary." : "You are below the minimum attendance requirement."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Right Column: Module Breakdown */}
                    <div className="lg:col-span-2 bg-white rounded-[3rem] border-2 border-slate-100 shadow-sm p-10">
                        <h3 className="text-[#1a1b4b] font-black text-xl tracking-tighter uppercase flex items-center gap-4 mb-10">
                            <BookOpen className="text-[#ef4444]" /> Module Analytics
                        </h3>
                        <div className="space-y-6">
                            {subjectData.map((s, i) => {
                                const pct = s.total === 0 ? 100 : Math.round((s.present / s.total) * 100);
                                return (
                                    <div key={i} className={`rounded-[2rem] p-8 border-2 transition-all ${pct < 75 ? 'bg-red-50/20 border-red-50' : 'bg-slate-50/30 border-slate-50 hover:bg-white'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl font-black text-[#1a1b4b] tracking-tighter">{s.subject}</span>
                                                    {pct < 75 && <span className="bg-red-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">Critical</span>}
                                                </div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{s.full}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-3xl font-black text-[#1a1b4b] leading-none mb-1">{pct}%</p>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{s.present} / {s.total} Sessions</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                            <div className={`h-full rounded-full transition-all duration-1000 ${pct < 75 ? 'bg-[#ef4444]' : 'bg-[#1a1b4b]'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                /* DETAILED HISTORICAL LOG VIEW */
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5">
                    {/* Log Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-100 flex items-center gap-6 shadow-sm">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#1a1b4b]"><Timer size={24} /></div>
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Avg. Work Hours</p><p className="text-2xl font-black text-[#1a1b4b]">7H 42M</p></div>
                        </div>
                        <div className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-100 flex items-center gap-6 shadow-sm">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500"><Zap size={24} /></div>
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Punctuality</p><p className="text-2xl font-black text-[#1a1b4b]">94% On-Time</p></div>
                        </div>
                        <div className="bg-[#1a1b4b] p-7 rounded-[2.5rem] flex items-center gap-6 text-white shadow-xl shadow-[#1a1b4b]/20">
                            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white"><Calendar size={24} /></div>
                            <div><p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Next Shift</p><p className="text-2xl font-black">Tomorrow 08:30</p></div>
                        </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="bg-white rounded-[3rem] border-2 border-slate-100 overflow-hidden shadow-xl shadow-[#1a1b4b]/5">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date & Log</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Leave/OD</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Shift Details</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Work Summary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {dummyLogs.map((log, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/30 transition-all group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col"><p className="text-sm font-black text-[#1a1b4b]">{log.date}</p><p className="text-[9px] font-black text-gray-300 uppercase">{log.inTime} - {log.outTime}</p></div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-center">
                                                    <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${
                                                        log.leave === 'ML' ? 'bg-red-50 text-red-500 border-red-100' : 
                                                        log.leave === 'Pending' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-slate-50 text-gray-300 border-slate-100'
                                                    }`}>{log.leave}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3 text-slate-500">
                                                    <MapPin size={14} className="text-[#ef4444]" />
                                                    <div><p className="text-[11px] font-black text-[#1a1b4b]">{log.shift}</p><p className="text-[9px] font-bold uppercase tracking-widest text-gray-300">Biometric Verified</p></div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <p className="text-[11px] font-black text-[#1a1b4b]">Work: {log.workHours}</p>
                                                <p className="text-[9px] font-black text-emerald-500 uppercase">Extra: {log.extraHours}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;

const Timer = ({ size }) => <Clock size={size} />;
