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
    Loader2,
    FileText,
    Download,
    Eye,
    Briefcase
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
    const [category, setCategory] = useState('all');
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Leaves
            const { data: leaves, error: leavesError } = await supabase
                .from('leave_requests')
                .select('*');

            // Fetch Proposals
            const { data: proposals, error: proposalsError } = await supabase
                .from('proposals')
                .select('*');

            if (leavesError || proposalsError) throw new Error('Failed to sync archives');

            const merged = [
                ...(leaves || []).map(l => ({ ...l, type: 'Leave' })),
                ...(proposals || []).map(p => ({ ...p, type: 'Proposal' }))
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            setRequests(merged);
        } catch (err) {
            console.error(err);
            setToast({ message: 'Encryption link unstable', type: 'error' });
        }
        setLoading(false);
    };

    const handleAction = async (id, status, type) => {
        const table = type === 'Leave' ? 'leave_requests' : 'proposals';
        const { error } = await supabase
            .from(table)
            .update({ status })
            .eq('id', id);

        if (error) {
            setToast({ message: 'Protocol breach prevented', type: 'error' });
        } else {
            setRequests(prev => prev.map(r => (r.id === id && r.type === type) ? { ...r, status } : r));
            setToast({ 
                message: `${type} ${status === 'approved' ? 'Authorized' : 'Rejected'}`, 
                type: status === 'approved' ? 'success' : 'error' 
            });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const filtered = requests.filter(r => {
        const matchesBatch = filter === 'all' || r.status === filter;
        const matchesCat = category === 'all' || r.type === category;
        return matchesBatch && matchesCat;
    });

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
                <div className={`fixed top-24 right-8 z-[200] ${toast.type === 'success' ? 'bg-[#1a1b4b]' : 'bg-red-600'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-right-10 border border-white/10`}>
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
                         Administrative Center
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
                        Reviewing Leaves & Innovative Proposals
                    </p>
                </div>
                
                <div className="flex gap-4 items-center">
                    <div className="flex gap-1.5 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                        {['all', 'Leave', 'Proposal'].map(c => (
                            <button
                                key={c}
                                onClick={() => setCategory(c)}
                                className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    category === c ? 'bg-white text-[#1a1b4b] shadow-sm' : 'text-gray-400 hover:text-[#1a1b4b]'
                                }`}
                            >
                                {c}s
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-1.5 p-1 bg-[#1a1b4b]/5 rounded-2xl">
                        {['all', 'pending', 'approved', 'rejected'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    filter === f ? 'bg-[#1a1b4b] text-white shadow-lg shadow-[#1a1b4b]/20' : 'text-gray-400 hover:text-[#1a1b4b]'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100/50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <Loader2 size={60} className="text-[#1a1b4b]" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Queue Total</p>
                    <p className="text-3xl font-black text-[#1a1b4b] tracking-tighter">{counts.all}</p>
                </div>
                <div className="bg-amber-50/30 p-6 rounded-[2rem] border-2 border-amber-100/50 shadow-sm relative group">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Active Review</p>
                    <p className="text-3xl font-black text-amber-600 tracking-tighter">{counts.pending}</p>
                </div>
                <div className="bg-emerald-50/30 p-6 rounded-[2rem] border-2 border-emerald-100/50 shadow-sm relative group">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Authenticated</p>
                    <p className="text-3xl font-black text-emerald-600 tracking-tighter">{counts.approved}</p>
                </div>
                <div className="bg-red-50/30 p-6 rounded-[2rem] border-2 border-red-100/50 shadow-sm relative group">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Dismissed</p>
                    <p className="text-3xl font-black text-red-600 tracking-tighter">{counts.rejected}</p>
                </div>
            </div>

            {/* List */}
            <div className="space-y-6 max-w-6xl">
                {loading ? (
                    <div className="text-center py-32 flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-[#1a1b4b] animate-spin" />
                        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Synchronizing Records...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                        <AlertCircle size={48} className="text-slate-100 mx-auto mb-4" />
                        <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No active requests in this sector</p>
                    </div>
                ) : (
                    filtered.map(req => {
                        const s = statusConfig[req.status];
                        const isLeave = req.type === 'Leave';
                        return (
                            <div key={`${req.type}-${req.id}`} className="group flex flex-col lg:flex-row items-center justify-between p-8 bg-white rounded-[2.5rem] border-2 border-slate-50 hover:border-[#1a1b4b]/10 hover:shadow-2xl hover:shadow-[#1a1b4b]/5 transition-all duration-500 relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors ${isLeave ? 'bg-[#1a1b4b]/5 group-hover:bg-[#ef4444]' : 'bg-[#1a1b4b]/5 group-hover:bg-emerald-500'}`} />
                                
                                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 w-full">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl ${
                                            isLeave ? 'bg-[#1a1b4b] text-white shadow-[#1a1b4b]/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'
                                        }`}>
                                            {req.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-xl font-black text-[#1a1b4b] tracking-tighter">{req.full_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                                    isLeave ? 'bg-indigo-50 text-[#1a1b4b] border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>
                                                    {req.type}
                                                </span>
                                                <span className="px-2 py-0.5 bg-slate-50 text-gray-400 rounded text-[8px] font-black uppercase tracking-widest">Ref: {req.id.slice(0, 6)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 flex-1">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                {isLeave ? <Calendar size={12} className="text-[#ef4444]" /> : <FileText size={12} className="text-emerald-500" />} 
                                                {isLeave ? 'Period' : 'Title'}
                                            </p>
                                            <p className="text-sm font-black text-[#1a1b4b]">
                                                {isLeave 
                                                    ? `${new Date(req.start_date).toLocaleDateString()} - ${new Date(req.end_date).toLocaleDateString()}`
                                                    : req.title
                                                }
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Clock size={12} className="text-[#ef4444]" /> Details
                                            </p>
                                            <p className="text-sm font-black text-[#1a1b4b]">
                                                {isLeave 
                                                    ? `${Math.ceil((new Date(req.end_date) - new Date(req.start_date)) / (1000 * 60 * 60 * 24)) + 1} Days (${req.leave_type})`
                                                    : 'Academic Initiative'
                                                }
                                            </p>
                                        </div>
                                        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <MessageSquare size={12} className="text-[#ef4444]" /> Case Remark
                                            </p>
                                            <p className="text-xs font-bold text-slate-500 leading-relaxed italic line-clamp-1 group-hover:line-clamp-none transition-all duration-300">
                                                "{isLeave ? req.reason : req.description}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 lg:mt-0 w-full lg:w-auto pt-6 lg:pt-0 border-t lg:border-0 border-slate-50">
                                    {!isLeave && req.file_url && (
                                         <a href={req.file_url} target="_blank" rel="noreferrer" className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-[#1a1b4b] hover:text-white transition-all shadow-sm">
                                            <Eye size={18} />
                                         </a>
                                    )}

                                    <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${s.bg} ${s.text}`}>
                                        <span className={`w-2 h-2 rounded-full ${s.dot} shadow-inner`} />
                                        {s.label}
                                    </span>
                                    
                                    {req.status === 'pending' && (
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button 
                                                onClick={() => handleAction(req.id, 'rejected', req.type)}
                                                className="flex-1 sm:flex-none w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-md active:scale-95"
                                            >
                                                <Ban size={20} strokeWidth={3} />
                                            </button>
                                            <button 
                                                onClick={() => handleAction(req.id, 'approved', req.type)}
                                                className={`flex-[2] sm:flex-none px-8 h-12 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
                                                    isLeave ? 'bg-[#1a1b4b] hover:bg-[#ef4444] shadow-[#1a1b4b]/10' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
                                                }`}
                                            >
                                                <Check size={16} strokeWidth={3} /> Authorize {req.type === 'Leave' ? 'Absence' : 'Project'}
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
