import { useState, useEffect } from 'react';
import { 
    Clock, 
    Calendar, 
    Filter, 
    ArrowLeft, 
    Download, 
    Search, 
    UserCheck, 
    Timer,
    AlertCircle,
    ChevronDown,
    FileSpreadsheet,
    Zap,
    MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Dummy Attendance Log Data based on the provided image
const dummyLogs = [
    { date: '01-04-2026', inTime: '08:41', outDate: '01-04-2026', outTime: '17:17', onDuty: 'NA', leave: 'NA', shift: 'Primary: ADT...', workHours: '07H 49M', totalHours: '08H 36M', extraHours: '00H 36M' },
    { date: '02-04-2026', inTime: '10:45', outDate: '02-04-2026', outTime: '17:33', onDuty: 'NA', leave: 'ML', shift: 'Primary: ADT...', workHours: '05H 45M', totalHours: '06H 48M', extraHours: '00H 00M' },
    { date: '03-04-2026', inTime: '00:00', outDate: '03-04-2026', outTime: '00:00', onDuty: 'NA', leave: 'Pending', shift: 'Primary: ADT...', workHours: '00H 00M', totalHours: '00H 00M', extraHours: '00H 00M' },
    { date: '04-04-2026', inTime: '00:00', outDate: '04-04-2026', outTime: '00:00', onDuty: 'NA', leave: 'NA', shift: 'Primary: ADT...', workHours: '00H 00M', totalHours: '00H 00M', extraHours: '00H 00M' },
    { date: '05-04-2026', inTime: '00:00', outDate: '05-04-2026', outTime: '00:00', onDuty: 'NA', leave: 'NA', shift: 'Primary: ADT...', workHours: '00H 00M', totalHours: '00H 00M', extraHours: '00H 00M' },
    { date: '06-04-2026', inTime: '08:43', outDate: '06-04-2026', outTime: '18:39', onDuty: 'NA', leave: 'NA', shift: 'Primary: ADT...', workHours: '07H 47M', totalHours: '09H 56M', extraHours: '01H 56M' },
    { date: '07-04-2026', inTime: '08:37', outDate: '07-04-2026', outTime: '18:49', onDuty: 'NA', leave: 'NA', shift: 'Primary: ADT...', workHours: '07H 53M', totalHours: '10H 12M', extraHours: '02H 12M' },
    { date: '08-04-2026', inTime: '08:38', outDate: '08-04-2026', outTime: '19:32', onDuty: 'NA', leave: 'NA', shift: 'Primary: ADT...', workHours: '07H 52M', totalHours: '10H 54M', extraHours: '02H 54M' },
];

const Attendance = () => {
    const { profile } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');

    const stats = {
        avgWorking: '7H 12M',
        onTimePct: '92%',
        totalPresent: '18 Days',
        pendingLeaves: '1'
    };

    return (
        <div className="p-8 sm:p-12 space-y-8 bg-[#f8fafc] min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <Link to="/leave-application" className="inline-flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors mb-4">
                        <ArrowLeft size={14} strokeWidth={3} /> Back to Leave Portal
                    </Link>
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter">My Attendance</h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">Detailed Shift & Presence Log</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-[#1a1b4b]/20 transition-all shadow-sm">
                        <Download size={14} /> Export Report
                    </button>
                    <div className="h-12 w-[2px] bg-slate-200 mx-1 hidden md:block" />
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
                                <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[#1a1b4b] p-7 rounded-[2.5rem] text-white space-y-4 shadow-2xl shadow-[#1a1b4b]/20">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Avg. Work Hours</p>
                        <Timer size={18} className="text-[#ef4444]" />
                    </div>
                    <p className="text-3xl font-black tracking-tighter">{stats.avgWorking}</p>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="w-[70%] h-full bg-[#ef4444]" />
                    </div>
                </div>
                
                <div className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-100 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Punctuality Score</p>
                        <Zap size={18} className="text-amber-500" />
                    </div>
                    <p className="text-3xl font-black text-[#1a1b4b] tracking-tighter">{stats.onTimePct}</p>
                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">+2.4% from last month</p>
                </div>

                <div className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-100 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Present</p>
                        <UserCheck size={18} className="text-emerald-500" />
                    </div>
                    <p className="text-3xl font-black text-[#1a1b4b] tracking-tighter">{stats.totalPresent}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active Days this month</p>
                </div>

                <div className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-100 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Leaves</p>
                        <AlertCircle size={18} className="text-red-500" />
                    </div>
                    <p className="text-3xl font-black text-[#1a1b4b] tracking-tighter">{stats.pendingLeaves}</p>
                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest hover:underline cursor-pointer">View Details</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Find specific date..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-12 pr-4 text-xs font-bold outline-none focus:border-[#1a1b4b]/20 transition-all placeholder:text-gray-300"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-3 bg-slate-100 rounded-xl text-[10px] font-black uppercase text-gray-500 hover:bg-slate-200 transition-all">
                        <Calendar size={14} /> Range <ChevronDown size={14} />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mr-2">Quick Filters:</span>
                    {['All Logs', 'Leaves Only', 'Extra Hours'].map(f => (
                        <button key={f} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                            f === 'All Logs' ? 'bg-[#1a1b4b] text-white border-[#1a1b4b]' : 'bg-white text-gray-400 border-slate-100 hover:border-[#1a1b4b]/20'
                        }`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 overflow-hidden shadow-xl shadow-[#1a1b4b]/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Date Log</th>
                                <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Time (In/Out)</th>
                                <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100 text-center">Leave/OD</th>
                                <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Shift Details</th>
                                <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Summary</th>
                                <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {dummyLogs.map((log, idx) => {
                                const isAbsent = log.inTime === '00:00';
                                const hasLeave = log.leave !== 'NA';
                                const isPending = log.leave === 'Pending';

                                return (
                                    <tr key={idx} className="hover:bg-slate-50/30 transition-all group">
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isAbsent ? 'bg-red-50 text-red-500' : 'bg-[#1a1b4b]/5 text-[#1a1b4b]'}`}>
                                                    <Calendar size={18} />
                                                </div>
                                                <p className="text-sm font-black text-[#1a1b4b] tracking-tighter">{log.date}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="space-y-0.5">
                                                    <p className={`text-xs font-black ${isAbsent ? 'text-gray-300' : 'text-[#1a1b4b]'}`}>{log.inTime}</p>
                                                    <p className="text-[9px] font-black text-gray-300 uppercase">In-Time</p>
                                                </div>
                                                <div className="h-4 w-[1px] bg-slate-200" />
                                                <div className="space-y-0.5">
                                                    <p className={`text-xs font-black ${isAbsent ? 'text-gray-300' : 'text-[#1a1b4b]'}`}>{log.outTime}</p>
                                                    <p className="text-[9px] font-black text-gray-300 uppercase">Out-Time</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                           <div className="flex justify-center">
                                                <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${
                                                    isPending ? 'bg-amber-50 text-amber-500 border-amber-100 animate-pulse' :
                                                    hasLeave ? 'bg-blue-50 text-blue-500 border-blue-100' : 
                                                    isAbsent ? 'bg-red-50 text-red-500 border-red-100' : 'bg-slate-50 text-gray-300 border-slate-100'
                                                }`}>
                                                    {isPending ? 'Pending' : log.leave}
                                                </span>
                                           </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-3">
                                                <MapPin size={14} className="text-[#ef4444]" />
                                                <div className="max-w-[120px]">
                                                    <p className="text-[11px] font-black text-[#1a1b4b] truncate">{log.shift}</p>
                                                    <p className="text-[9px] font-bold text-gray-400">Primary Counter</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between w-32">
                                                    <span className="text-[9px] font-black text-gray-300 uppercase">Work:</span>
                                                    <span className="text-[11px] font-black text-[#1a1b4b]">{log.workHours}</span>
                                                </div>
                                                <div className="flex items-center justify-between w-32">
                                                    <span className="text-[9px] font-black text-gray-300 uppercase">Total:</span>
                                                    <span className="text-[11px] font-black text-[#1a1b4b]">{log.totalHours}</span>
                                                </div>
                                                {log.extraHours !== '00H 00M' && (
                                                    <div className="flex items-center justify-between w-32">
                                                        <span className="text-[9px] font-black text-emerald-400 uppercase">Extra:</span>
                                                        <span className="text-[11px] font-black text-emerald-500">+{log.extraHours}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <button className="p-2 border border-slate-100 rounded-lg text-slate-300 hover:text-[#1a1b4b] hover:bg-slate-50 transition-all">
                                                <FileSpreadsheet size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
