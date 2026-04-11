import { useState, useEffect } from 'react';
import { 
    Briefcase, 
    Check, 
    X, 
    Clock, 
    Filter, 
    Search, 
    ArrowLeft,
    CheckCircle2,
    Ban,
    Monitor,
    HandCoins,
    Calendar,
    MessageSquare,
    ChevronDown,
    FileText,
    TrendingUp,
    Paperclip,
    ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const FacultyRequisitions = () => {
    const { profile } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('letter_requests')
            .select('*')
            .in('category', ['requisition', 'fund'])
            .order('request_date', { ascending: false });

        if (error) {
            console.error('Error fetching requisitions:', error);
        } else {
            setRequests(data);
        }
        setLoading(false);
    };

    const handleAction = async (id, status) => {
        const { error } = await supabase
            .from('letter_requests')
            .update({ 
                status: status,
                approval_date: status === 'approved' ? new Date().toISOString() : null
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            setToast({ message: 'Error updating requisition status', type: 'error' });
        } else {
            setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
            setToast({ 
                message: `Requisition ${status === 'approved' ? 'Approved' : 'Rejected'}!`, 
                type: status === 'approved' ? 'success' : 'error' 
            });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const filtered = requests.filter(r => {
        const nameMatch = r.student_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const typeMatch = r.letter_type?.toLowerCase().includes(searchQuery.toLowerCase());
        const descMatch = r.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSearch = nameMatch || typeMatch || descMatch;
        const matchesFilter = filter === 'all' || r.status === filter;
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        funds: requests.filter(r => r.category === 'fund').length
    };

    return (
        <div className="p-8 sm:p-12 space-y-10 bg-[#f8fafc] min-h-screen">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-24 right-8 z-[100] ${toast.type === 'success' ? 'bg-[#1a1b4b]' : 'bg-red-600'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 transition-all animate-in fade-in slide-in-from-right-10 border border-white/10`}>
                    <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                        {toast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Ban size={18} />}
                    </div>
                    <span className="font-bold text-xs uppercase tracking-widest">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
                <div className="space-y-4">
                    <Link to="/admin-dashboard" className="inline-flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors">
                        <ArrowLeft size={12} strokeWidth={3} /> Back to Dashboard
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                            <Briefcase className="text-[#ef4444]" /> Faculty Requisitions
                        </h1>
                        <p className="text-gray-400 font-bold text-[10px] tracking-[0.2em] uppercase mt-1">
                            Resource & Budget Approval Control
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 p-1.5 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                    {['all', 'pending', 'approved', 'rejected'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                filter === s
                                    ? 'bg-[#1a1b4b] text-white shadow-lg shadow-[#1a1b4b]/10 scale-105'
                                    : 'text-gray-400 hover:text-[#1a1b4b]'
                            }`}
                        >
                            {s} ({s === 'all' ? stats.total : requests.filter(r => r.status === s).length})
                        </button>
                    ))}
                </div>
            </div>

            {/* List Table and Filters */}
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-xl shadow-[#1a1b4b]/5 overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/20 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="relative w-full md:w-[28rem]">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by faculty, item, or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-14 pr-8 text-sm font-bold focus:outline-none focus:border-[#1a1b4b]/20 transition-all placeholder:text-gray-300"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-white">
                                <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-50">Faculty Member</th>
                                <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-50">Requisition Type</th>
                                <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-50">Request Date</th>
                                <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-50">Status</th>
                                <th className="px-10 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-50">Action Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={5} className="px-10 py-32 text-center text-sm font-bold text-gray-400 italic">Decrypting requisition vault...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-10 py-32 text-center text-sm font-bold text-gray-400 italic">No records matching criteria</td></tr>
                            ) : (
                                filtered.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-all group border-b border-slate-50">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg bg-[#1a1b4b]/5 text-[#1a1b4b]">
                                                    {req.student_name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-[15px] font-black text-[#1a1b4b] tracking-tight">{req.student_name}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Faculty Dept.</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 max-w-xs">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black text-[#ef4444] uppercase tracking-tight">{req.letter_type}</p>
                                                    {req.category === 'fund' && <span className="px-2 py-0.5 bg-blue-500 text-white text-[8px] font-black rounded uppercase">Budget</span>}
                                                </div>
                                                {req.description && (
                                                    <div className="flex gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 italic font-medium text-slate-500 text-[11px] leading-relaxed">
                                                        "{req.description}"
                                                    </div>
                                                )}
                                                {req.attachment_url && (
                                                    <a 
                                                        href={req.attachment_url} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1a1b4b] text-white text-[9px] font-black uppercase rounded-lg hover:bg-[#ef4444] transition-all shadow-lg shadow-[#1a1b4b]/10"
                                                    >
                                                        <Paperclip size={12} /> View Documentation
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-xs font-bold text-slate-400">
                                            {new Date(req.request_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                                req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                                                req.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                                <span className={`w-2 h-2 rounded-full ${req.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                {req.status}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            {req.status === 'pending' ? (
                                                <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                    <button 
                                                        onClick={() => handleAction(req.id, 'rejected')}
                                                        className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-md flex items-center justify-center font-black"
                                                    >
                                                        <X size={20} strokeWidth={3} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAction(req.id, 'approved')}
                                                        className="px-8 bg-[#1a1b4b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-[#1a1b4b]/10 flex items-center gap-2"
                                                    >
                                                        <Check size={16} strokeWidth={3} /> Approve
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleAction(req.id, 'pending')}
                                                    className="inline-flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase hover:text-[#1a1b4b] transition-colors"
                                                >
                                                    <Clock size={12} /> Rollback
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FacultyRequisitions;
