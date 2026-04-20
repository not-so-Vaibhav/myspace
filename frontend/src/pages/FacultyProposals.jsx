import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    ArrowLeft, 
    Check, 
    Ban, 
    Clock, 
    Filter, 
    CheckCircle2, 
    MessageSquare,
    AlertCircle,
    Loader2,
    FileText,
    Eye,
    Briefcase,
    Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const statusConfig = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400', label: 'Pending' },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400', label: 'Approved' },
    rejected: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400', label: 'Rejected' },
};

const FacultyProposals = () => {
    const { user } = useAuth();
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchProposals();
    }, []);

    const fetchProposals = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('proposals')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching proposals:', error);
            setToast({ message: 'Sync failure with proposal vault', type: 'error' });
        } else {
            setProposals(data);
        }
        setLoading(false);
    };

    const handleAction = async (id, status) => {
        const { error } = await supabase
            .from('proposals')
            .update({ status })
            .eq('id', id);

        if (error) {
            setToast({ message: 'Security breach prevented', type: 'error' });
        } else {
            setProposals(prev => prev.map(p => p.id === id ? { ...p, status } : p));
            setToast({ 
                message: `Proposal ${status === 'approved' ? 'Authenticated' : 'Dismissed'}`, 
                type: status === 'approved' ? 'success' : 'error' 
            });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const filtered = proposals.filter(p => filter === 'all' || p.status === filter);

    const counts = {
        all: proposals.length,
        pending: proposals.filter(p => p.status === 'pending').length,
        approved: proposals.filter(p => p.status === 'approved').length,
        rejected: proposals.filter(p => p.status === 'rejected').length,
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
                    <Link to="/hod-dashboard" className="inline-flex items-center gap-1.5 text-[12px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors mb-4">
                        <ArrowLeft size={13} strokeWidth={3} /> Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                         Proposal Review Center
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1 italic">
                        Authorizing Academic & Institutional Initiatives
                    </p>
                </div>
                
                <div className="flex gap-1.5 p-1.5 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                    {['all', 'pending', 'approved', 'rejected'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${
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

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-amber-500/20 relative overflow-hidden group">
                    <Zap className="absolute -right-4 -bottom-4 w-32 h-32 opacity-15 rotate-12 transition-transform group-hover:scale-110" />
                    <p className="text-[12px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Pending Review</p>
                    <p className="text-5xl font-black tracking-tighter">{counts.pending}</p>
                 </div>
                 <div className="bg-gradient-to-br from-emerald-400 to-emerald-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
                    <CheckCircle2 className="absolute -right-4 -bottom-4 w-32 h-32 opacity-15 rotate-12 transition-transform group-hover:scale-110" />
                    <p className="text-[12px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Authorized</p>
                    <p className="text-5xl font-black tracking-tighter">{counts.approved}</p>
                 </div>
                 <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
                    <Briefcase className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-100 rotate-12 transition-transform group-hover:scale-110" />
                    <p className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Queue</p>
                    <p className="text-5xl font-black text-[#1a1b4b] tracking-tighter">{counts.all}</p>
                 </div>
            </div>

            {/* Main List */}
            <div className="space-y-6 max-w-7xl">
                {loading ? (
                    <div className="text-center py-32 flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-[#1a1b4b] animate-spin" />
                        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Syncing Proposal Stream...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                        <AlertCircle size={48} className="text-slate-100 mx-auto mb-4" />
                        <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No proposals detected in this sector</p>
                    </div>
                ) : (
                    filtered.map(p => {
                        const s = statusConfig[p.status];
                        return (
                            <div key={p.id} className="group flex flex-col lg:flex-row items-center justify-between p-10 bg-white rounded-[3rem] border-2 border-slate-50 hover:border-[#1a1b4b]/10 hover:shadow-2xl hover:shadow-[#1a1b4b]/5 transition-all duration-500 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-[#1a1b4b]/5 group-hover:bg-[#ef4444] transition-colors" />
                                
                                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10 w-full">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1a1b4b] to-indigo-600 text-white flex items-center justify-center font-black text-3xl shadow-xl shadow-[#1a1b4b]/20">
                                            {p.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black text-[#1a1b4b] tracking-tighter">{p.full_name}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="px-3 py-1 bg-[#ef4444] text-white rounded-lg text-[12px] font-black uppercase tracking-widest">Faculty Member</span>
                                                <span className="px-3 py-1 bg-slate-100 text-gray-400 rounded-lg text-[12px] font-black uppercase tracking-widest border border-slate-200">Ref: {p.id.slice(0, 8)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 flex-1">
                                        <div className="space-y-2">
                                            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <FileText size={14} className="text-[#ef4444]" /> Proposal Title
                                            </p>
                                            <p className="text-lg font-black text-[#1a1b4b] tracking-tight group-hover:text-[#ef4444] transition-colors">
                                                {p.title}
                                            </p>
                                        </div>
                                        <div className="space-y-2 sm:col-span-2 md:col-span-1">
                                            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <MessageSquare size={14} className="text-[#ef4444]" /> Brief Justification
                                            </p>
                                            <p className="text-xs font-bold text-slate-500 leading-relaxed italic line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
                                                "{p.description}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row items-center gap-5 mt-10 lg:mt-0 w-full lg:w-auto pt-8 lg:pt-0 border-t lg:border-0 border-slate-50">
                                    {p.file_url && (
                                         <a href={p.file_url} target="_blank" rel="noreferrer" className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-[#1a1b4b] hover:text-white transition-all shadow-sm">
                                            <Eye size={20} />
                                         </a>
                                    )}

                                    <span className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-sm border-2 ${s.bg} ${s.text}`}>
                                        <span className={`w-2 h-2 rounded-full ${s.dot} shadow-inner bg-current`} />
                                        {s.label}
                                    </span>
                                    
                                    {p.status === 'pending' && (
                                        <div className="flex gap-3 w-full sm:w-auto">
                                            <button 
                                                onClick={() => handleAction(p.id, 'rejected')}
                                                className="flex-1 sm:flex-none w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-md active:scale-95"
                                            >
                                                <Ban size={22} strokeWidth={3} />
                                            </button>
                                            <button 
                                                onClick={() => handleAction(p.id, 'approved')}
                                                className="flex-[2] sm:flex-none px-8 h-14 bg-[#1a1b4b] text-white text-[13px] font-black rounded-2xl uppercase tracking-[0.2em] hover:bg-emerald-500 transition-all shadow-xl shadow-[#1a1b4b]/10 active:scale-95 flex items-center justify-center gap-3"
                                            >
                                                <Check size={18} strokeWidth={3} /> Authorize Project
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

export default FacultyProposals;
