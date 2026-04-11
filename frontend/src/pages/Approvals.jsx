import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Ban, Clock, Filter, CheckCircle2 } from 'lucide-react';

const allRequests = [
    // Leave Requests
    { id: 1, name: 'Dr. Jane Smith', category: 'Leave', type: 'Sick Leave', duration: '2 Days', date: 'Apr 1, 2026', status: 'pending' },
    { id: 2, name: 'Prof. Mark Lee', category: 'Leave', type: 'Conference', duration: '1 Week', date: 'Mar 28, 2026', status: 'pending' },
    { id: 3, name: 'Dr. Priya Patel', category: 'Leave', type: 'Personal Leave', duration: '3 Days', date: 'Mar 27, 2026', status: 'pending' },
    
    // Letter Requests (New)
    { id: 101, name: 'Vaibhav Bariyar', category: 'Letter', type: 'Bonafide Letter', duration: '1 Copy', date: 'Apr 11, 2026', status: 'pending' },
    { id: 102, name: 'Rahul Sharma', category: 'Letter', type: 'Migration Certificate', duration: 'Original', date: 'Apr 11, 2026', status: 'pending' },
    { id: 103, name: 'Aditya Gupta', category: 'Letter', type: 'ID Card Replacement', duration: 'New Card', date: 'Apr 10, 2026', status: 'pending' },
    { id: 104, name: 'Sneha Patil', category: 'Letter', type: 'No Dues Form', duration: 'Sem IV', date: 'Apr 09, 2026', status: 'approved' },
];

const statusConfig = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400', label: 'Pending' },
    approved: { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-400', label: 'Approved' },
    rejected: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400', label: 'Rejected' },
};

const Approvals = () => {
    const [requests, setRequests] = useState(allRequests);
    const [filter, setFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [toast, setToast] = useState(null);

    const filtered = requests.filter(r => {
        const matchesStatus = filter === 'all' || r.status === filter;
        const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
        return matchesStatus && matchesCategory;
    });

    const counts = {
        all: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    };

    const handleAction = (id, action) => {
        const req = requests.find(r => r.id === id);
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
        setToast({ message: `${req.name}'s ${req.category.toLowerCase()} ${action}`, type: action === 'approved' ? 'success' : 'error' });
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="p-8 sm:p-12 space-y-8 bg-[#fcfdfe] min-h-screen">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-20 right-6 z-[100] ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 transition-all animate-in fade-in slide-in-from-right-10`}>
                    <span className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                        {toast.type === 'success' ? <Check size={16} strokeWidth={3} /> : <Ban size={16} strokeWidth={3} />}
                    </span>
                    <span className="text-sm font-bold uppercase tracking-wider">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <Link to="/hod-dashboard" className="inline-flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors mb-4">
                        <ArrowLeft size={13} strokeWidth={3} /> Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter">Approval Center</h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
                        Management for Faculty Leaves & Student Letters
                    </p>
                </div>
                
                <div className="flex gap-2 p-1 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    {['all', 'Leave', 'Letter'].map(c => (
                        <button
                            key={c}
                            onClick={() => setCategoryFilter(c)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                categoryFilter === c
                                    ? 'bg-[#ef4444] text-white shadow-lg shadow-red-500/20'
                                    : 'text-gray-400 hover:text-[#1a1b4b]'
                            }`}
                        >
                            {c === 'all' ? 'All Roles' : `${c}s`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['all', 'pending', 'approved', 'rejected'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`p-6 rounded-[2rem] border transition-all text-left group ${
                            filter === f
                                ? 'bg-[#1a1b4b] border-[#1a1b4b] text-white shadow-xl shadow-[#1a1b4b]/20 scale-[1.02]'
                                : 'bg-white border-gray-100 text-gray-400 hover:border-[#1a1b4b]/30'
                        }`}
                    >
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${filter === f ? 'text-white/50' : 'text-gray-400'}`}>
                            {f}
                        </p>
                        <p className="text-2xl font-black tracking-tighter">
                            {counts[f]} <span className="text-xs uppercase font-bold tracking-widest opacity-50 ml-1">Requests</span>
                        </p>
                    </button>
                ))}
            </div>

            {/* Requests List */}
            <div className="space-y-4 max-w-5xl">
                {filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border border-gray-100 shadow-inner">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Filter size={24} className="text-gray-300" />
                        </div>
                        <p className="text-lg font-black text-[#1a1b4b] uppercase tracking-tighter">No items found</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    filtered.map(req => {
                        const s = statusConfig[req.status];
                        return (
                            <div key={req.id} className="group flex flex-col sm:flex-row items-center justify-between p-6 bg-white rounded-[2rem] border border-gray-100 hover:shadow-2xl hover:shadow-[#1a1b4b]/10 transition-all duration-500">
                                <div className="flex items-center gap-6 w-full sm:w-auto">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${
                                        req.category === 'Letter' ? 'bg-cyan-50 text-cyan-500' : 'bg-[#1a1b4b]/5 text-[#1a1b4b]'
                                    }`}>
                                        {req.name.charAt(0)}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <p className="text-lg font-black text-[#1a1b4b] tracking-tight">{req.name}</p>
                                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                                req.category === 'Letter' ? 'bg-cyan-500 text-white' : 'bg-[#1a1b4b] text-white'
                                            }`}>
                                                {req.category}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <p className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                                                <CheckCircle2 size={12} strokeWidth={3} className="text-emerald-500" />
                                                {req.type}
                                            </p>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{req.date}</p>
                                            <p className="text-[11px] font-black text-[#ef4444] uppercase tracking-widest">{req.duration}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 mt-6 sm:mt-0 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-0 border-gray-50">
                                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${s.bg} ${s.text}`}>
                                        <span className={`w-2 h-2 rounded-full ${s.dot} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                                        {s.label}
                                    </span>
                                    
                                    {req.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleAction(req.id, 'rejected')}
                                                className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                            >
                                                <Ban size={18} strokeWidth={3} />
                                            </button>
                                            <button 
                                                onClick={() => handleAction(req.id, 'approved')}
                                                className="px-6 py-2 bg-emerald-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                                            >
                                                <Check size={14} strokeWidth={3} /> Approve
                                            </button>
                                        </div>
                                    )}

                                    {req.status === 'approved' && req.category === 'Letter' && (
                                        <button className="px-4 py-2 bg-[#1a1b4b] text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-[#ef4444] transition-all">
                                            Issue PDF
                                        </button>
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
