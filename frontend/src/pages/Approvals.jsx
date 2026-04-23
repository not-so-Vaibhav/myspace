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
        try {
            // Get current user role
            const { data: pData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            const userRole = pData?.role?.toLowerCase();

            // Fetch leave requests
            const { data: rawRequests, error: reqError } = await supabase
                .from('leave_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (reqError) throw reqError;

            if (rawRequests.length > 0) {
                // Fetch profiles for all unique user_ids in these requests
                const userIds = [...new Set(rawRequests.map(r => r.user_id))];
                const { data: profiles, error: profError } = await supabase
                    .from('profiles')
                    .select('id, role, full_name')
                    .in('id', userIds);

                if (profError) throw profError;

                // Map profiles to requests
                const requestsWithProfiles = rawRequests.map(req => ({
                    ...req,
                    applicant_profile: profiles.find(p => p.id === req.user_id)
                }));

                let filteredData = requestsWithProfiles;
                if (userRole === 'dean') {
                    // Dean only sees HOD leave requests
                    filteredData = requestsWithProfiles.filter(r => r.applicant_profile?.role?.toLowerCase() === 'hod');
                } else if (userRole === 'hod') {
                    // HOD sees everyone except other HODs and Dean
                    filteredData = requestsWithProfiles.filter(r => 
                        r.applicant_profile?.role?.toLowerCase() !== 'hod' && 
                        r.applicant_profile?.role?.toLowerCase() !== 'dean'
                    );
                }
                setRequests(filteredData);
            } else {
                setRequests([]);
            }

        } catch (error) {
            console.error('Error fetching leave requests:', error);
            setToast({ message: 'Failed to sync with vault', type: 'error' });
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

    const role = useAuth().profile?.role?.toLowerCase();
    const dashboardPath = role === 'dean' ? '/dean-dashboard' : role === 'hod' ? '/hod-dashboard' : '/admin-dashboard';

    const filtered = requests.filter(r => filter === 'all' || r.status === filter);

    const counts = {
        all: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    };

    return (
        <div className="p-6 md:p-10 space-y-8 bg-[#fcfdfe] min-h-screen">
            {/* Toast Notifications */}
            {toast && (
                <div className={`fixed top-24 right-8 z-[200] ${toast.type === 'success' ? 'bg-[#1a1b4b]' : 'bg-red-600'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 transition-all animate-in fade-in slide-in-from-right-10 border border-white/10`}>
                    <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                        {toast.type === 'success' ? <Check size={18} strokeWidth={3} /> : <Ban size={18} strokeWidth={3} />}
                    </div>
                    <span className="font-bold text-[12px] uppercase tracking-widest">{toast.message}</span>
                </div>
            )}

            {/* Header Area */}
            <div className="flex flex-col space-y-6">
                <Link to={dashboardPath} className="inline-flex items-center gap-2 text-[12px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-all group w-fit">
                    <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-[#1a1b4b] group-hover:text-white transition-colors">
                        <ArrowLeft size={14} strokeWidth={3} />
                    </div>
                    Back to Terminal
                </Link>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                             {role === 'dean' ? 'Dean' : 'Leave'} Approvals
                             <div className="h-2 w-2 rounded-full bg-[#ef4444] animate-pulse"></div>
                        </h1>
                        <p className="text-gray-400 font-bold text-[12px] tracking-[0.2em] uppercase mt-1">
                            {role === 'dean' ? 'Administrative Authority Hub • Selective Clearance' : 'Departmental Authorization Portal'}
                        </p>
                    </div>
                    
                    <div className="flex p-1.5 bg-gray-100/50 rounded-[1.25rem] border border-gray-100 shadow-inner">
                        {['all', 'pending', 'approved', 'rejected'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${
                                    filter === f
                                        ? 'bg-white text-[#1a1b4b] shadow-md scale-[1.02]'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {f} <span className="opacity-40 ml-1.5">{counts[f]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Application Feed */}
            <div className="grid grid-cols-1 gap-6 max-w-7xl mx-auto">
                {loading ? (
                    <div className="text-center py-40 flex flex-col items-center gap-5">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-50 rounded-full"></div>
                            <div className="w-16 h-16 border-4 border-[#1a1b4b] border-t-transparent rounded-full animate-spin absolute top-0"></div>
                        </div>
                        <p className="text-[12px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Syncing Vault Records...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 text-gray-200">
                             <AlertCircle size={40} />
                        </div>
                        <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest">No matching applications detected</p>
                    </div>
                ) : (
                    filtered.map(req => {
                        const s = statusConfig[req.status];
                        const applicantRole = req.applicant_profile?.role?.toUpperCase() || 'APPLICANT';
                        const days = Math.ceil((new Date(req.end_date) - new Date(req.start_date)) / (1000 * 60 * 60 * 24)) + 1;
                        
                        return (
                            <div key={req.id} className="bg-white rounded-[2.5rem] border border-gray-100 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 overflow-hidden group">
                                <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-50">
                                    {/* Left: Identity Section */}
                                    <div className="p-8 lg:w-72 bg-gradient-to-b from-white to-gray-50/50 flex flex-col items-center text-center justify-center space-y-4">
                                        <div className="relative">
                                            <div className="w-20 h-20 rounded-3xl bg-[#1a1b4b] text-white flex items-center justify-center font-black text-3xl shadow-2xl shadow-[#1a1b4b]/20 group-hover:scale-105 transition-transform duration-500">
                                                {req.full_name?.charAt(0) || 'U'}
                                            </div>
                                            <div className="absolute -bottom-2 -right-2 px-2.5 py-1 bg-white border border-gray-100 rounded-lg text-[12px] font-black text-[#1a1b4b] shadow-sm uppercase tracking-widest">
                                                {applicantRole}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-[#1a1b4b] tracking-tighter leading-tight">{req.full_name}</p>
                                            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[12px] font-black uppercase tracking-widest shadow-sm ${
                                                req.leave_type === 'sick' ? 'bg-red-50 text-red-600' :
                                                req.leave_type === 'on-duty' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                                {req.leave_type} Leave
                                            </span>
                                        </div>
                                    </div>

                                    {/* Center: Details Section */}
                                    <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-red-50 rounded-2xl text-[#ef4444]">
                                                    <Calendar size={18} strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Authorized Period</p>
                                                    <p className="text-sm font-black text-[#1a1b4b] tracking-tight">
                                                        {new Date(req.start_date).toLocaleDateString('en-GB')} → {new Date(req.end_date).toLocaleDateString('en-GB')}
                                                    </p>
                                                    <p className="text-[12px] font-bold text-gray-400 mt-0.5">{days} Total Effective {days > 1 ? 'Days' : 'Day'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-500">
                                                    <MessageSquare size={18} strokeWidth={2.5} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Submission Justification</p>
                                                    <p className="text-[12px] font-bold text-slate-500 leading-relaxed max-w-sm">
                                                        "{req.reason}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status & Actions Section */}
                                        <div className="flex flex-col justify-center items-center md:items-end space-y-6">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-4 py-2 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2 border ${s.bg} ${s.text} border-current/10`}>
                                                    <div className={`w-2 h-2 rounded-full ${s.dot} shadow-lg`} />
                                                    Current Status: {s.label}
                                                </span>
                                            </div>

                                            {req.status === 'pending' && (
                                                <div className="flex gap-3 w-full justify-center md:justify-end">
                                                    <button 
                                                        onClick={() => handleAction(req.id, 'rejected')}
                                                        className="p-4 bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-[1.25rem] transition-all hover:scale-110 active:scale-95"
                                                        title="Reject Request"
                                                    >
                                                        <Ban size={22} strokeWidth={3} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAction(req.id, 'approved')}
                                                        className="px-8 py-4 bg-[#1a1b4b] text-white text-[12px] font-black rounded-[1.25rem] uppercase tracking-widest hover:bg-[#ef4444] transition-all shadow-xl shadow-[#1a1b4b]/20 hover:shadow-[#ef4444]/40 active:scale-95 flex items-center gap-3"
                                                    >
                                                        <Check size={18} strokeWidth={3} /> Authorize Leave
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
