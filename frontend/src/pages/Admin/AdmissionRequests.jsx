import { useState, useEffect } from 'react';
import { 
    UserPlus, 
    Search, 
    Filter, 
    Download, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    FileText,
    Mail,
    Phone,
    MapPin,
    GraduationCap,
    Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AdmissionRequests = () => {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchAdmissions();
    }, []);

    const fetchAdmissions = async () => {
        setLoading(true);
        try {
            // Mocking Indian student admission data
            setTimeout(() => {
                const mockStudents = [
                    { id: 'ADM-2024-001', name: 'Arjun Mehra', course: 'B.Tech CS', email: 'arjun.mehra@gmail.com', phone: '+91 98765 43210', scores: '92%', city: 'New Delhi', status: 'Pending', date: '2024-04-12' },
                    { id: 'ADM-2024-002', name: 'Priya Sharma', course: 'B.Arch', email: 'priya.s@yahoo.com', phone: '+91 98234 56789', scores: '88%', city: 'Mumbai', status: 'Approved', date: '2024-04-10' },
                    { id: 'ADM-2024-003', name: 'Rohan Deshmukh', course: 'B.Tech Mechanical', email: 'rohan.d@rediffmail.com', phone: '+91 91234 12345', scores: '85%', city: 'Pune', status: 'Processing', date: '2024-04-08' },
                    { id: 'ADM-2024-004', name: 'Ananya Iyer', course: 'B.Sc Physics', email: 'ananya.iyer@proton.me', phone: '+91 97654 09876', scores: '95%', city: 'Chennai', status: 'Approved', date: '2024-04-05' },
                    { id: 'ADM-2024-005', name: 'Vikram Singh', course: 'B.Com Honors', email: 'v.singh@outlook.com', phone: '+91 99887 76655', scores: '78%', city: 'Chandigarh', status: 'Rejected', date: '2024-04-01' },
                    { id: 'ADM-2024-006', name: 'Sanya Malhotra', course: 'M.Tech AI', email: 'sanya.m@icloud.com', phone: '+91 96543 21098', scores: '90%', city: 'Bangalore', status: 'Pending', date: '2024-03-28' },
                ];
                setRequests(mockStudents);
                setLoading(false);
            }, 800);
        } catch (error) {
            console.error('Admission Fetch Error:', error);
            setLoading(false);
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch = req.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             req.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || req.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    if (loading) return (
        <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[#1a1b4b]" size={40} />
            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Accessing Enrollment Databases...</p>
        </div>
    );

    return (
        <div className="p-6 sm:p-8 space-y-8 bg-[#fcfdfe] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <UserPlus size={32} className="text-[#ef4444]" /> Admission Requests
                    </h1>
                    <p className="text-gray-400 font-bold text-[12px] tracking-[0.3em] uppercase mt-1">Institutional Enrollment Management • Intake 2024-25</p>
                </div>
                
                <div className="flex gap-4">
                    <button className="px-5 py-2.5 bg-white border-2 border-slate-100 rounded-xl flex items-center gap-3 text-[12px] font-black uppercase tracking-widest text-[#1a1b4b] hover:border-[#1a1b4b]/20 transition-all outline-none">
                        <Download size={16} /> Export JSON
                    </button>
                    <button className="px-5 py-2.5 bg-[#1a1b4b] text-white rounded-xl flex items-center gap-3 text-[12px] font-black uppercase tracking-widest shadow-xl shadow-[#1a1b4b]/20 hover:bg-[#ef4444] transition-all outline-none">
                        <FileText size={16} /> Merit List
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Fresh Requests', value: requests.filter(r => r.status === 'Pending').length, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Authorized', value: requests.filter(r => r.status === 'Approved').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Total Volume', value: requests.length, color: 'text-[#1a1b4b]', bg: 'bg-slate-50' },
                    { label: 'Avg Merit Score', value: '89.4%', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border-2 border-slate-50 flex items-center justify-between group">
                        <div>
                            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className={`text-2xl font-black ${stat.color} tracking-tighter mt-1`}>{stat.value}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                            < GraduationCap size={20} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-5 rounded-3xl border-2 border-slate-50 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                        type="text" 
                        placeholder="SEARCH BY NAME, EMAIL OR ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-14 pr-6 text-[12px] font-black tracking-widest outline-none focus:bg-white focus:border-[#1a1b4b]/20 transition-all uppercase placeholder:text-gray-300"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {['all', 'pending', 'approved', 'rejected'].map(status => (
                        <button 
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-5 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest border transition-all ${
                                statusFilter === status 
                                ? 'bg-[#1a1b4b] text-white border-[#1a1b4b] shadow-lg' 
                                : 'bg-white text-gray-400 border-slate-100 hover:border-gray-200'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Applicant Identity</th>
                                <th className="px-8 py-5 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Academic Background</th>
                                <th className="px-8 py-5 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Contact Vector</th>
                                <th className="px-8 py-5 text-center text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Intake Status</th>
                                <th className="px-8 py-5 text-right text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredRequests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50/50 transition-all group">
                                    <td className="px-8 py-6">
                                        <div>
                                            <p className="text-[14px] font-black text-[#1a1b4b] tracking-tight">{req.name}</p>
                                            <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest mt-0.5">{req.id}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-slate-600">{req.course}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[12px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md uppercase tracking-widest">Merit: {req.scores}</span>
                                                <span className="text-[12px] font-black text-gray-300 uppercase flex items-center gap-1"><MapPin size={10} /> {req.city}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="space-y-1">
                                            <p className="text-[12px] font-bold text-gray-400 flex items-center gap-2"><Mail size={14} className="text-[#1a1b4b]" /> {req.email}</p>
                                            <p className="text-[12px] font-bold text-gray-400 flex items-center gap-2"><Phone size={14} className="text-[#1a1b4b]" /> {req.phone}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-widest ${
                                            req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                                            req.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 
                                            req.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                        }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button title="Approve" className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                                                <CheckCircle2 size={16} />
                                            </button>
                                            <button title="Reject" className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
                                                <XCircle size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdmissionRequests;
