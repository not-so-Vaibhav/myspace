import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    ArrowLeft, 
    Check, 
    Ban, 
    Clock, 
    Filter, 
    CheckCircle2, 
    Calendar, 
    User, 
    MessageSquare,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const statusConfig = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400', label: 'Pending' },
    approved: { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-400', label: 'Approved' },
    rejected: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400', label: 'Rejected' },
};

const Approvals = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching leave requests:', error);
            setToast({ message: 'Failed to sync with vault', type: 'error' });
        } else {
            setRequests(data);
        }
        setLoading(false);
    };

    const handleAction = async (id, status) => {
        const { error } = await supabase
            .from('leave_requests')
            .update({ status })
            .eq('id', id);

        if (error) {
            setToast({ message: 'Security protocol error', type: 'error' });
        } else {
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
            setToast({ 
                message: `Application ${status === 'approved' ? 'Approved' : 'Rejected'}`, 
                type: status === 'approved' ? 'success' : 'error' 
            });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const filtered = requests.filter(r => filter === 'all' || r.status === filter);

    const counts = {
        all: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    };

    return (
        <div className="p-8 sm:p-12 space-y-10 bg-[#fcfdfe] min-h-screen">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-24 right-8 z-[200] ${toast.type === 'success' ? 'bg-[#1a1b4b]' : 'bg-red-600'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 transition-all animate-in fade-in slide-in-from-right-10 border border-white/10`}>
                    <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                        {toast.type === 'success' ? <Check size={18} strokeWidth={3} /> : <Ban size={18} strokeWidth={3} />}
                    </div>
                    <span className="font-bold text-xs uppercase tracking-widest">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
                <div>
                    <Link to="/hod-dashboard" className="inline-flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors mb-4">
                        <ArrowLeft size={13} strokeWidth={3} /> Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                         Leave Approvals
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1 italic">
                        Authorized HOD Control Interface
                    </p>
                </div>
                
                <div className="flex gap-2 p-1.5 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                    {['all', 'pending', 'approved', 'rejected'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                filter === f
                                    ? 'bg-[#1a1b4b] text-white shadow-lg shadow-[#1a1b4b]/10 scale-105'
                                    : 'text-gray-400 hover:text-[#1a1b4b]'
                            }`}
                        >
                            {f} ({counts[f]})
                        </button>
                    ))}
                </div>
            </div>

            {/* Main List */}
            <div className="space-y-6 max-w-6xl">
                {loading ? (
                    <div className="text-center py-32 flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-[#1a1b4b] animate-spin" />
                        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Syncing departmental records...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                        <AlertCircle size={48} className="text-slate-100 mx-auto mb-4" />
                        <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No pending applications found</p>
                    </div>
                ) : (
                    filtered.map(req => {
                        const s = statusConfig[req.status];
                        return (
                            <div key={req.id} className="group flex flex-col lg:flex-row items-center justify-between p-8 bg-white rounded-[2.5rem] border-2 border-slate-50 hover:border-[#1a1b4b]/10 hover:shadow-2xl hover:shadow-[#1a1b4b]/5 transition-all duration-500 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1a1b4b]/5 group-hover:bg-[#ef4444] transition-colors" />
                                
                                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 w-full">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-2xl bg-[#1a1b4b] text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-[#1a1b4b]/20">
                                            {req.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-xl font-black text-[#1a1b4b] tracking-tighter">{req.full_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-black uppercase tracking-widest text-gray-500">Applicant</span>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                                    req.leave_type === 'sick' ? 'bg-red-50 text-red-600' :
                                                    req.leave_type === 'on-duty' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                    {req.leave_type} Leave
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 flex-1">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Calendar size={12} className="text-[#ef4444]" /> Period
                                            </p>
                                            <p className="text-sm font-black text-[#1a1b4b]">
                                                {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Clock size={12} className="text-[#ef4444]" /> Duration
                                            </p>
                                            <p className="text-sm font-black text-[#1a1b4b]">
                                                {Math.ceil((new Date(req.end_date) - new Date(req.start_date)) / (1000 * 60 * 60 * 24)) + 1} Days
                                            </p>
                                        </div>
                                        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <MessageSquare size={12} className="text-[#ef4444]" /> Case Justification
                                            </p>
                                            <p className="text-xs font-bold text-slate-500 leading-relaxed italic line-clamp-1 group-hover:line-clamp-none transition-all duration-300">
                                                "{req.reason}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 lg:mt-0 w-full lg:w-auto pt-6 lg:pt-0 border-t lg:border-0 border-slate-50">
                                    <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${s.bg} ${s.text}`}>
                                        <span className={`w-2 h-2 rounded-full ${s.dot} shadow-inner`} />
                                        {s.label}
                                    </span>
                                    
                                    {req.status === 'pending' && (
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button 
                                                onClick={() => handleAction(req.id, 'rejected')}
                                                className="flex-1 sm:flex-none w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-md active:scale-95"
                                            >
                                                <Ban size={20} strokeWidth={3} />
                                            </button>
                                            <button 
                                                onClick={() => handleAction(req.id, 'approved')}
                                                className="flex-[2] sm:flex-none px-8 h-12 bg-[#1a1b4b] text-white text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-[#1a1b4b]/10 active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <Check size={16} strokeWidth={3} /> Authorize Leave
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Approvals;
