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
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400', label: 'Pending' },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400', label: 'Approved' },
    rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400', label: 'Rejected' },
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
            setToast({ message: 'Error fetching proposals', type: 'error' });
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
            setToast({ message: 'Error updating proposal status', type: 'error' });
        } else {
            setProposals(prev => prev.map(p => p.id === id ? { ...p, status } : p));
            setToast({ 
                message: `Proposal ${status === 'approved' ? 'Approved' : 'Rejected'}`, 
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
        <div className="p-6 md:p-8 space-y-6 bg-gray-50 min-h-screen">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4`}>
                    {toast.type === 'success' ? <Check size={18} /> : <Ban size={18} />}
                    <span className="font-medium text-[12px] uppercase tracking-wide">{toast.message}</span>
                </div>
            )}

            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
                <div>
                    <Link to="/hod-dashboard" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-[#1a1b4b] transition-colors mb-2">
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                    <h1 className="text-2xl font-bold text-[#1a1b4b] flex items-center gap-2">
                         Proposal Review Center
                    </h1>
                    <p className="text-gray-500 font-medium text-[12px] mt-1">
                        Authorizing Academic & Institutional Initiatives
                    </p>
                </div>
                
                <div className="flex gap-1 p-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto w-full md:w-auto mt-4 md:mt-0">
                    {['all', 'pending', 'approved', 'rejected'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-md text-[12px] font-semibold capitalize whitespace-nowrap transition-colors ${
                                filter === f
                                    ? 'bg-[#1a1b4b] text-white shadow'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-[#1a1b4b]'
                            }`}
                        >
                            {f} <span className="ml-1 opacity-70">({counts[f]})</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 flex flex-col justify-between shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[12px] font-semibold text-amber-700 uppercase tracking-widest">Pending</p>
                        <Zap className="w-5 h-5 text-amber-400" />
                    </div>
                    <p className="text-3xl font-bold text-amber-900">{counts.pending}</p>
                 </div>
                 <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 flex flex-col justify-between shadow-sm relative overflow-hidden">
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-[12px] font-semibold text-emerald-700 uppercase tracking-widest">Authorized</p>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-3xl font-bold text-emerald-900">{counts.approved}</p>
                 </div>
                 <div className="bg-white p-5 rounded-xl border border-gray-200 flex flex-col justify-between shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest">Total Queue</p>
                        <Briefcase className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-3xl font-bold text-[#1a1b4b]">{counts.all}</p>
                 </div>
            </div>

            {/* Main List */}
            <div className="space-y-4 max-w-6xl">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-xl border border-gray-200">
                        <Loader2 className="w-8 h-8 text-[#1a1b4b] animate-spin" />
                        <p className="text-[12px] font-medium text-gray-500">Loading proposals...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
                        <AlertCircle className="w-10 h-10 text-gray-300 mb-3" />
                        <p className="text-[12px] font-medium text-gray-500">No proposals found</p>
                    </div>
                ) : (
                    filtered.map(p => {
                        const s = statusConfig[p.status] || statusConfig.pending;
                        return (
                            <div key={p.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all gap-5">
                                
                                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-8 flex-1">
                                    <div className="flex items-center gap-4 min-w-[200px]">
                                        <div className="w-12 h-12 rounded-full bg-[#1a1b4b]/10 text-[#1a1b4b] flex items-center justify-center font-bold text-lg">
                                            {p.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{p.full_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[12px] text-gray-500">Ref: {p.id.slice(0, 8)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full text-[12px] md:text-sm">
                                        <div className="space-y-1">
                                            <p className="text-[12px] font-medium text-gray-500 flex items-center gap-1.5">
                                                <FileText size={14} className="text-gray-400" /> Title
                                            </p>
                                            <p className="font-semibold text-gray-900 line-clamp-2">
                                                {p.title}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[12px] font-medium text-gray-500 flex items-center gap-1.5">
                                                <MessageSquare size={14} className="text-gray-400" /> Justification
                                            </p>
                                            <p className="text-gray-600 line-clamp-2 italic">
                                                "{p.description}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-0 border-gray-100 justify-end">
                                    {p.file_url && (
                                         <a href={p.file_url} target="_blank" rel="noreferrer" title="View Document" className="w-9 h-9 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center transition-colors border border-gray-200">
                                            <Eye size={16} />
                                         </a>
                                    )}

                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border ${s.bg} ${s.text} ${s.border}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                        {s.label}
                                    </span>
                                    
                                    {p.status === 'pending' && (
                                        <div className="flex items-center gap-2 ml-2">
                                            <button 
                                                onClick={() => handleAction(p.id, 'rejected')}
                                                title="Reject"
                                                className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all border border-red-100 hover:border-transparent"
                                            >
                                                <Ban size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleAction(p.id, 'approved')}
                                                className="px-4 h-9 bg-[#1a1b4b] text-white text-[12px] font-semibold rounded-lg hover:bg-[#2d3a8c] transition-all flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <Check size={14} /> Authorize
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

