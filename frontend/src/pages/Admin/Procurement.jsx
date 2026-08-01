import { useState, useEffect } from 'react';
import { 
    ShoppingCart, 
    Search, 
    Filter, 
    Plus, 
    CheckCircle2, 
    Clock, 
    XCircle,
    User,
    Calendar,
    ChevronRight,
    TrendingUp,
    Briefcase,
    Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Procurement = () => {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        expenditure: '₹1.2M',
        vendors: 14
    });

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            // Mocking procurement data
            setTimeout(() => {
                const mockOrders = [
                    { id: 'ORD-882', department: 'CS Engineering', item: 'Deep Learning Servers (x4)', requester: 'Dr. Akash', budget: '₹450,000', status: 'Pending', date: '2024-04-18' },
                    { id: 'ORD-881', department: 'Mechanical', item: '3D Printer Filaments', requester: 'Prof. Sharma', budget: '₹15,000', status: 'Approved', date: '2024-04-15' },
                    { id: 'ORD-880', department: 'Administration', item: 'Office Stationery Bulk', requester: 'Mr. Verma', budget: '₹8,500', status: 'Processing', date: '2024-04-10' },
                    { id: 'ORD-879', department: 'Library', item: 'E-Journal Subscriptions', requester: 'Dr. Joshi', budget: '₹120,000', status: 'Approved', date: '2024-04-05' },
                    { id: 'ORD-878', department: 'IT Services', item: 'Enterprise Firewalls', requester: 'Tech Lead', budget: '₹800,000', status: 'Rejected', date: '2024-04-01' },
                ];
                setRequests(mockOrders);
                setStats({
                    pending: mockOrders.filter(o => o.status === 'Pending').length,
                    approved: mockOrders.filter(o => o.status === 'Approved').length,
                    expenditure: '₹1.2M',
                    vendors: 14
                });
                setLoading(false);
            }, 800);
        } catch (error) {
            console.error('Procurement Fetch Error:', error);
            setLoading(false);
        }
    };

    const filteredRequests = requests.filter(req => 
        req.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[#1a1b4b]" size={40} />
            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Accessing Procurement Ledger...</p>
        </div>
    );

    return (
        <div className="p-6 sm:p-8 space-y-8 bg-[#fcfdfe] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <ShoppingCart size={32} className="text-[#ef4444]" /> Procurement
                    </h1>
                    <p className="text-gray-400 font-bold text-[12px] tracking-[0.3em] uppercase mt-1">Vendor Management • Purchase Authorization Queue</p>
                </div>
                
                <div className="flex gap-4">
                    <button className="px-5 py-2.5 bg-white border-2 border-slate-100 rounded-xl flex items-center gap-3 text-[12px] font-black uppercase tracking-widest text-[#1a1b4b] hover:border-[#1a1b4b]/20 transition-all outline-none">
                        <Briefcase size={16} /> Vendors
                    </button>
                    <button className="px-5 py-2.5 bg-[#1a1b4b] text-white rounded-xl flex items-center gap-3 text-[12px] font-black uppercase tracking-widest shadow-xl shadow-[#1a1b4b]/20 hover:bg-[#ef4444] transition-all outline-none">
                        <Plus size={16} /> New Requisition
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'YTD Spending', value: stats.expenditure, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Pending Auth', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Fulfilled', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Active Vendors', value: stats.vendors, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white rounded-[2rem] p-6 border-2 border-slate-50 shadow-sm transition-all group overflow-hidden relative border-l-4">
                         <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} shadow-inner`}>
                                <kpi.icon size={20} />
                            </div>
                         </div>
                         <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{kpi.label}</h3>
                         <p className="text-3xl font-black text-[#1a1b4b] tracking-tighter tabular-nums">{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Requisition Table */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input 
                            type="text" 
                            placeholder="SEARCH BY ORDER ID, ITEM OR DEPT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-[12px] font-black tracking-widest outline-none focus:bg-white focus:border-[#1a1b4b]/20 transition-all uppercase placeholder:text-gray-300"
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button className="flex-1 md:flex-none px-6 py-4 bg-slate-50 text-gray-400 rounded-2xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:text-[#1a1b4b] transition-colors border border-transparent hover:border-slate-200">
                            <Filter size={16} /> Departments
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-10 py-6 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Order & Entity</th>
                                    <th className="px-10 py-6 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Resource Requested</th>
                                    <th className="px-10 py-6 text-center text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Estimate</th>
                                    <th className="px-10 py-6 text-center text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                                    <th className="px-10 py-6 text-right text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-all group">
                                        <td className="px-10 py-8">
                                            <div>
                                                <p className="text-[14px] font-black text-[#1a1b4b] tracking-tight">{req.id}</p>
                                                <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{req.department}</p>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-600">{req.item}</span>
                                                <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                                    <User size={12} /> {req.requester} • <Calendar size={12} /> {req.date}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-center text-sm font-black text-[#1a1b4b]">
                                            {req.budget}
                                        </td>
                                        <td className="px-10 py-8 text-center">
                                            <span className={`px-4 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-widest ${
                                                req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                                                req.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 
                                                req.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <button className="flex items-center justify-end gap-3 hover:translate-x-2 transition-transform cursor-pointer group/action">
                                                <span className="text-[12px] font-black uppercase text-[#1a1b4b] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Review</span>
                                                <div className="p-2.5 bg-gray-50 rounded-xl group-hover/action:bg-[#1a1b4b] group-hover/action:text-white transition-colors">
                                                    <ChevronRight size={18} />
                                                </div>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Procurement;
