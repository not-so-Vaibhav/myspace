import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Ban, Clock, Filter } from 'lucide-react';

const allLeaveRequests = [
    { id: 1, name: 'Dr. Jane Smith', type: 'Sick Leave', duration: '2 Days', date: 'Apr 1, 2026', status: 'pending' },
    { id: 2, name: 'Prof. Mark Lee', type: 'Conference', duration: '1 Week', date: 'Mar 28, 2026', status: 'pending' },
    { id: 3, name: 'Dr. Priya Patel', type: 'Personal Leave', duration: '3 Days', date: 'Mar 27, 2026', status: 'pending' },
    { id: 4, name: 'Prof. Amit Sharma', type: 'Medical', duration: '5 Days', date: 'Mar 25, 2026', status: 'pending' },
    { id: 5, name: 'Dr. Kavita Nair', type: 'Workshop', duration: '2 Days', date: 'Mar 24, 2026', status: 'pending' },
    { id: 6, name: 'Prof. Rahul Verma', type: 'Sick Leave', duration: '1 Day', date: 'Mar 22, 2026', status: 'pending' },
    { id: 7, name: 'Dr. Neha Gupta', type: 'Conference', duration: '4 Days', date: 'Mar 20, 2026', status: 'pending' },
    { id: 8, name: 'Prof. Suresh Kumar', type: 'Personal Leave', duration: '2 Days', date: 'Mar 18, 2026', status: 'pending' },
    { id: 9, name: 'Dr. Ananya Rao', type: 'Sick Leave', duration: '1 Day', date: 'Mar 15, 2026', status: 'approved' },
    { id: 10, name: 'Prof. Vikram Singh', type: 'Conference', duration: '3 Days', date: 'Mar 12, 2026', status: 'approved' },
    { id: 11, name: 'Dr. Meena Joshi', type: 'Personal Leave', duration: '2 Days', date: 'Mar 10, 2026', status: 'rejected' },
    { id: 12, name: 'Prof. Deepak Pandey', type: 'Medical', duration: '1 Week', date: 'Mar 8, 2026', status: 'approved' },
];

const statusConfig = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400', label: 'Pending' },
    approved: { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-400', label: 'Approved' },
    rejected: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400', label: 'Rejected' },
};

const Approvals = () => {
    const [requests, setRequests] = useState(allLeaveRequests);
    const [filter, setFilter] = useState('all');
    const [toast, setToast] = useState(null);

    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
    const counts = {
        all: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    };

    const handleAction = (id, action) => {
        const req = requests.find(r => r.id === id);
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
        setToast({ message: `${req.name}'s leave ${action}`, type: action === 'approved' ? 'success' : 'error' });
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="p-8 sm:p-12 space-y-8">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-20 right-6 z-[100] ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3`}
                    style={{ animation: 'slideIn 0.3s ease-out' }}>
                    <span className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                        {toast.type === 'success' ? <Check size={14} strokeWidth={3} /> : <Ban size={14} strokeWidth={3} />}
                    </span>
                    <span className="text-sm font-bold">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div>
                <Link to="/hod-dashboard" className="inline-flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors mb-4">
                    <ArrowLeft size={13} strokeWidth={3} /> Back to Dashboard
                </Link>
                <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">Leave Approvals</h1>
                <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
                    {counts.pending} pending • {counts.approved} approved • {counts.rejected} rejected
                </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'pending', 'approved', 'rejected'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            filter === f
                                ? 'bg-[#1a1b4b] text-white'
                                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {f} ({counts[f]})
                    </button>
                ))}
            </div>

            {/* Requests List */}
            <div className="space-y-3 max-w-4xl">
                {filtered.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                        <Filter size={32} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-gray-400">No {filter} requests</p>
                    </div>
                ) : (
                    filtered.map(req => {
                        const s = statusConfig[req.status];
                        return (
                            <div key={req.id} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-[#1a1b4b]/8 flex items-center justify-center font-black text-[#1a1b4b]">
                                        {req.name.charAt(req.name.indexOf('.') + 2) || req.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#1a1b4b]">{req.name}</p>
                                        <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">
                                            {req.type} • {req.duration} • {req.date}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${s.bg} ${s.text}`}>
                                        <span className={`w-1.5 h-1.5 rounded-sm ${s.dot}`} />
                                        {s.label}
                                    </span>
                                    {req.status === 'pending' && (
                                        <div className="flex gap-2 ml-2">
                                            <button onClick={() => handleAction(req.id, 'rejected')}
                                                className="px-3 py-1.5 bg-[#ef4444] text-white text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-red-600 transition-colors">
                                                Reject
                                            </button>
                                            <button onClick={() => handleAction(req.id, 'approved')}
                                                className="px-3 py-1.5 bg-green-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-green-600 transition-colors">
                                                Approve
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default Approvals;
