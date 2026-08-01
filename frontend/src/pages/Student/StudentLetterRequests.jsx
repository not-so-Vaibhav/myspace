import { useState, useEffect } from 'react';
import { 
    FileText, 
    Check, 
    X, 
    Clock, 
    Filter, 
    Search, 
    ArrowLeft,
    CheckCircle2,
    Ban,
    User,
    Calendar,
    Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const StudentLetterRequests = () => {
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
            .order('request_date', { ascending: false });

        if (error) {
            console.error('Error fetching requests:', error);
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
            setToast({ message: 'Error updating request status', type: 'error' });
        } else {
            setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
            setToast({ 
                message: `Letter request ${status === 'approved' ? 'Approved' : 'Rejected'}!`, 
                type: status === 'approved' ? 'success' : 'error' 
            });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const filtered = requests.filter(r => {
        const matchesSearch = r.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             r.letter_type.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' || r.status === filter;
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length
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
                    <Link to="/admin-dashboard" className="inline-flex items-center gap-1.5 text-[12px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors">
                        <ArrowLeft size={12} strokeWidth={3} /> Back to Dashboard
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                            <FileText className="text-[#ef4444]" /> Student Letter Requests
                        </h1>
                        <p className="text-gray-400 font-bold text-[12px] tracking-[0.2em] uppercase mt-1">
                            Document Approval Control Center
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 p-1 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                    {['all', 'pending', 'approved', 'rejected'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-5 py-2 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${
                                filter === s
                                    ? 'bg-[#1a1b4b] text-white shadow-lg shadow-[#1a1b4b]/10'
                                    : 'text-gray-400 hover:text-[#1a1b4b]'
                            }`}
                        >
                            {s} ({s === 'all' ? stats.total : stats[s]})
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex items-center gap-4 group hover:border-[#1a1b4b]/20 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#1a1b4b] group-hover:text-white transition-all">
                        <FileText size={20} />
                    </div>
                    <div>
                        <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total</p>
                        <p className="text-2xl font-black text-[#1a1b4b] tracking-tighter">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Pending</p>
                        <p className="text-2xl font-black text-amber-600 tracking-tighter">{stats.pending}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Approved</p>
                        <p className="text-2xl font-black text-emerald-600 tracking-tighter">{stats.approved}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex items-center gap-4 group hover:border-red-200 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                        <Ban size={20} />
                    </div>
                    <div>
                        <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Rejected</p>
                        <p className="text-2xl font-black text-red-600 tracking-tighter">{stats.rejected}</p>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-xl shadow-[#1a1b4b]/5 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search by student or letter type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]/10 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white">
                                <th className="px-8 py-5 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-50">Student Details</th>
                                <th className="px-8 py-5 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-50">Document Type</th>
                                <th className="px-8 py-5 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-50">Request Date</th>
                                <th className="px-8 py-5 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-50">Status</th>
                                <th className="px-8 py-5 text-right text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-50">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={5} className="px-8 py-20 text-center text-sm font-bold text-gray-400">Loading requests...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-8 py-20 text-center text-sm font-bold text-gray-400">No requests matching criteria</td></tr>
                            ) : (
                                filtered.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-[#1a1b4b]/5 text-[#1a1b4b] flex items-center justify-center font-black">
                                                    {req.student_name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-[#1a1b4b] tracking-tight">{req.student_name}</p>
                                                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">B.Tech Sem IV</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-xs font-black text-[#ef4444] uppercase tracking-tight">{req.letter_type}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-500">{new Date(req.request_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                <span className="text-[12px] text-gray-300 font-bold">{new Date(req.request_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-widest ${
                                                req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                                                req.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    req.status === 'approved' ? 'bg-emerald-500' : 
                                                    req.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                                                }`} />
                                                {req.status}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {req.status === 'pending' ? (
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleAction(req.id, 'rejected')}
                                                        className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <X size={16} strokeWidth={3} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAction(req.id, 'approved')}
                                                        className="px-5 py-2.5 bg-[#1a1b4b] text-white text-[12px] font-black rounded-xl uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-[#1a1b4b]/10 flex items-center gap-2"
                                                    >
                                                        <Check size={14} strokeWidth={3} /> Approve
                                                    </button>
                                                </div>
                                            ) : req.status === 'approved' ? (
                                                <button className="text-[12px] font-black text-gray-400 uppercase flex items-center gap-1 ml-auto">
                                                    <Download size={14} /> Issued
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => handleAction(req.id, 'pending')}
                                                    className="text-[12px] font-black text-blue-500 uppercase hover:underline"
                                                >
                                                    Reconsider
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

export default StudentLetterRequests;
