import { useState, useEffect } from 'react';
import { 
    CalendarDays, 
    Clock, 
    FileText, 
    ClipboardCheck, 
    ArrowRight, 
    Calendar,
    AlertCircle,
    CheckCircle2,
    X,
    MessageSquare,
    Send,
    History,
    Search,
    Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const LeaveApplication = () => {
    const { profile, user } = useAuth();
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [requests, setRequests] = useState([]);
    const [toast, setToast] = useState(null);
    
    // Form State
    const [leaveType, setLeaveType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (user) {
            fetchMyRequests();
        }
    }, [user]);

    const fetchMyRequests = async () => {
        setFetching(true);
        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching leaves:', error);
        } else {
            setRequests(data);
        }
        setFetching(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await supabase
            .from('leave_requests')
            .insert([{
                user_id: user.id,
                full_name: profile?.full_name,
                leave_type: leaveType,
                start_date: startDate,
                end_date: endDate,
                reason: reason,
                status: 'pending'
            }])
            .select();

        if (error) {
            setToast({ message: 'Error submitting request', type: 'error' });
        } else {
            setToast({ message: 'Leave application sent to HOD!', type: 'success' });
            setRequests([data[0], ...requests]);
            setShowForm(false);
            resetForm();
        }
        setLoading(false);
        setTimeout(() => setToast(null), 3000);
    };

    const resetForm = () => {
        setLeaveType('');
        setStartDate('');
        setEndDate('');
        setReason('');
    };

    const statusStyles = {
        approved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        pending: 'bg-amber-50 text-amber-600 border-amber-100',
        rejected: 'bg-red-50 text-red-600 border-red-100'
    };

    return (
        <div className="p-8 sm:p-12 space-y-12 bg-[#fcfdfe] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <CalendarDays className="text-[#ef4444]" /> Leave Management
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">Absence & Attendance Hub</p>
                </div>
            </div>

            {/* Portal Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
                {/* Apply Leave Card */}
                <div 
                    onClick={() => setShowForm(true)}
                    className="group relative bg-white rounded-[2.5rem] p-10 border-2 border-slate-100 hover:border-[#1a1b4b]/20 hover:shadow-2xl hover:shadow-[#1a1b4b]/10 transition-all cursor-pointer overflow-hidden shadow-sm"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <FileText size={120} className="text-[#1a1b4b]" />
                    </div>
                    
                    <div className="w-16 h-16 rounded-2xl bg-[#ef4444]/5 flex items-center justify-center text-[#ef4444] mb-8 group-hover:scale-110 transition-transform shadow-inner">
                        <ClipboardCheck size={32} />
                    </div>
                    
                    <div className="space-y-2 relative z-10">
                        <h3 className="text-2xl font-black text-[#1a1b4b] uppercase tracking-tighter">Apply Leave</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Submit a new absence request</p>
                    </div>

                    <div className="mt-8 flex items-center gap-2 text-[#1a1b4b] font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                        Start Application <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                    </div>
                </div>

                {/* View Attendance Card */}
                <Link 
                    to="/attendance"
                    className="group relative bg-white rounded-[2.5rem] p-10 border-2 border-slate-100 hover:border-[#1a1b4b]/20 hover:shadow-2xl hover:shadow-[#1a1b4b]/10 transition-all cursor-pointer overflow-hidden shadow-sm"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <History size={120} className="text-[#1a1b4b]" />
                    </div>
                    
                    <div className="w-16 h-16 rounded-2xl bg-[#1a1b4b]/5 flex items-center justify-center text-[#1a1b4b] mb-8 group-hover:scale-110 transition-transform shadow-inner">
                        <Clock size={32} />
                    </div>
                    
                    <div className="space-y-2 relative z-10">
                        <h3 className="text-2xl font-black text-[#1a1b4b] uppercase tracking-tighter">Attendance History</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Review your presence logs</p>
                    </div>

                    <div className="mt-8 flex items-center gap-2 text-[#1a1b4b] font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                        View Records <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                    </div>
                </Link>
            </div>

            {/* History Section - NEW */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <History className="text-[#ef4444]" size={20} /> Application History
                    </h3>
                    <div className="hidden md:flex items-center gap-2">
                         <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-100 rounded-lg text-[8px] font-black text-gray-400 uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Approved
                         </span>
                         <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-100 rounded-lg text-[8px] font-black text-gray-400 uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Pending
                         </span>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 overflow-hidden shadow-sm min-h-[300px]">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Category & Type</th>
                                    <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Duration Period</th>
                                    <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Status</th>
                                    <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Reason / Remark</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {fetching ? (
                                    <tr><td colSpan={4} className="px-8 py-20 text-center flex flex-col items-center gap-4">
                                        <Loader2 className="animate-spin text-[#1a1b4b]" size={24} />
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Syncing Records...</p>
                                    </td></tr>
                                ) : requests.length === 0 ? (
                                    <tr><td colSpan={4} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase italic">No previous applications detected in the stream</td></tr>
                                ) : (
                                    requests.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div>
                                                    <p className="text-sm font-black text-[#1a1b4b] uppercase tracking-tighter leading-none mb-1">{req.leave_type} Leave</p>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ref: #{req.id.slice(0, 8)}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                                                        <Calendar size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-[#1a1b4b]">{new Date(req.start_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} - {new Date(req.end_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                        <p className="text-[9px] font-bold text-[#ef4444] uppercase tracking-widest">
                                                            {Math.ceil((new Date(req.end_date) - new Date(req.start_date)) / (1000 * 60 * 60 * 24)) + 1} Days
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border-2 text-[9px] font-black uppercase tracking-widest ${statusStyles[req.status]}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        req.status === 'approved' ? 'bg-emerald-500' : req.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                                                    }`} />
                                                    {req.status}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2 group-hover:-translate-x-2 transition-transform">
                                                    <p className="text-[11px] font-bold text-slate-500 italic max-w-[200px] truncate leading-relaxed">"{req.reason}"</p>
                                                    <MessageSquare size={12} className="text-slate-300" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Leave Application Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-[#1a1b4b]/40 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 border border-white/20">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444]">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter">New Application</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fill in leave details</p>
                                </div>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Leave Type</label>
                                <select 
                                    required
                                    value={leaveType}
                                    onChange={(e) => setLeaveType(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-[#ef4444]/30 outline-none transition-all appearance-none"
                                >
                                    <option value="">Select Category</option>
                                    <option value="sick">Sick Leave</option>
                                    <option value="casual">Casual Leave</option>
                                    <option value="on-duty">On-Duty (OD)</option>
                                    <option value="medical">Medical Emergency</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">From Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-[#ef4444]/30 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">To Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-[#ef4444]/30 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason for Absence</label>
                                <textarea 
                                    required
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Briefly explain the reason for your leave..."
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold min-h-[100px] focus:bg-white focus:border-[#ef4444]/30 outline-none transition-all"
                                />
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all font-black"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] py-4 bg-[#1a1b4b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#ef4444] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? 'Submitting...' : 'Send Application'} <Send size={14} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-24 right-8 z-[200] ${toast.type === 'success' ? 'bg-[#1a1b4b]' : 'bg-red-600'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 transition-all animate-in fade-in slide-in-from-right-10 border border-white/10`}>
                    <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                        {toast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertCircle size={18} />}
                    </div>
                    <span className="font-bold text-xs uppercase tracking-widest">{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default LeaveApplication;
