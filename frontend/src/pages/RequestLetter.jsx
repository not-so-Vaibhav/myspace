import { useState, useEffect } from 'react';
import { 
    FileText, 
    PlusCircle, 
    CheckCircle2, 
    Clock, 
    ChevronDown, 
    Send,
    Download,
    History,
    HandCoins,
    UserSquare2,
    Mail,
    Medal,
    AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const requestTypes = [
    { 
        id: 'demand_letter', 
        title: 'Demand letter for B.Tech sem IV', 
        icon: HandCoins, 
        iconBg: 'bg-blue-50 text-blue-500',
        description: 'Official fee demand letter for the current semester and year.',
    },
    { 
        id: 'id_card', 
        title: 'MIT ADTU ID card', 
        icon: UserSquare2, 
        iconBg: 'bg-indigo-50 text-[#1a1b4b]',
        description: 'Official university identification card for campus access.',
    },
    { 
        id: 'no_dues', 
        title: 'MITSOC-No Dues Form', 
        icon: Mail, 
        iconBg: 'bg-rose-50 text-[#f72585]',
        description: 'Clearance form required for semester completion.',
    },
    { 
        id: 'migration', 
        title: 'Migration Certificate', 
        icon: Medal, 
        iconBg: 'bg-amber-50 text-[#ff9f1c]',
        description: 'Formal certificate for migration to other institutions.',
    },
];

const otherLetters = [
    'Disciplinary Action Letter',
    'Hostel Gate Pass',
    'Transport I-Card',
    'Fee Intimation Slip',
    'Fee Collection Slip',
    'Separation / Suspension Letter',
    'Character Certificate',
    'Bonafide Letter',
    'Admission Letter',
    'Admission Call Letter'
];

const RequestLetter = () => {
    const { profile, user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedOther, setSelectedOther] = useState('---Select One---');
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (user) {
            fetchRequests();
        }
    }, [user]);

    const fetchRequests = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('letter_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('request_date', { ascending: false });

        if (error) {
            console.error('Error fetching requests:', error);
        } else {
            setRequests(data);
        }
        setLoading(false);
    };

    const handleSendRequest = async (type) => {
        if (!user || submitting) return;
        
        setSubmitting(true);
        const { data, error } = await supabase
            .from('letter_requests')
            .insert([
                {
                    user_id: user.id,
                    student_name: profile?.full_name || 'Unknown Student',
                    letter_type: type,
                    status: 'pending'
                }
            ])
            .select();

        if (error) {
            console.error('Error sending request:', error);
            setToast({ message: 'Error sending request. Please try again.', type: 'error' });
        } else {
            setRequests([data[0], ...requests]);
            setToast({ message: `Request for ${type} sent to Admin!`, type: 'success' });
            if (type === selectedOther) setSelectedOther('---Select One---');
        }
        setSubmitting(false);
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="p-8 sm:p-12 space-y-10 bg-[#f8fafc] min-h-screen">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-24 right-8 z-[100] ${toast.type === 'success' ? 'bg-[#1a1b4b]' : 'bg-red-600'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 transition-all animate-in fade-in slide-in-from-right-10 border border-white/10`}>
                    <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                        {toast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertCircle size={18} />}
                    </div>
                    <span className="font-bold text-xs uppercase tracking-widest">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
                <div className="space-y-2 text-left">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#ef4444]/10 rounded-xl">
                            <FileText className="text-[#ef4444]" size={22} />
                        </div>
                        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">Request Documents</h1>
                    </div>
                    <p className="text-gray-400 font-bold text-[10px] tracking-[0.2em] uppercase ml-12">Institutional Service Portal</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="bg-white px-5 py-3 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-4">
                        <History className="text-[#ef4444]" size={16} />
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Status</p>
                            <p className="text-sm font-black text-[#1a1b4b] tracking-tight">
                                {loading ? '...' : requests.filter(r => r.status === 'pending').length} Active
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Request Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {requestTypes.map((item) => {
                    const isPending = requests.some(r => r.letter_type === item.title && r.status === 'pending');
                    return (
                        <div key={item.id} className="bg-white rounded-3xl border-2 border-slate-100 p-6 flex flex-col items-center hover:shadow-xl hover:shadow-[#1a1b4b]/5 hover:border-[#ef4444]/20 transition-all duration-300 group ring-4 ring-transparent hover:ring-[#1a1b4b]/5">
                            <div className="relative mb-5 mt-2">
                                <div className={`w-14 h-14 rounded-2xl ${item.iconBg} flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300`}>
                                    <item.icon size={26} strokeWidth={2.5} />
                                </div>
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow shadow-[#ef4444]/20 border border-slate-100">
                                <PlusCircle size={12} className="text-[#ef4444]" />
                                </div>
                            </div>

                            <div className="flex-1 min-h-[60px] flex flex-col justify-center items-center px-2">
                                <h3 className="text-sm font-black text-[#1a1b4b] tracking-tight leading-tight text-center">{item.title}</h3>
                            </div>
                            
                            <div className="mt-2 text-center">
                                <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1 italic">
                                    Status: {isPending ? 'Pending Approval' : 'Ready to Request'}
                                </p>
                                <button className="flex items-center gap-1 mx-auto text-[9px] font-black text-cyan-500 uppercase tracking-widest hover:text-[#ef4444] transition-colors mb-5">
                                    More Info <ChevronDown size={12} />
                                </button>
                            </div>

                            <div className="w-full grid grid-cols-2 gap-2 mt-auto">
                                <button 
                                    onClick={() => handleSendRequest(item.title)}
                                    disabled={submitting || isPending}
                                    className={`py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 ${
                                        isPending 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-[#1a1b4b] text-white hover:bg-[#ef4444] shadow-[#1a1b4b]/10'
                                    }`}
                                >
                                    <Send size={10} /> {isPending ? 'Sent' : 'Send'}
                                </button>
                                <button className="bg-slate-50 text-slate-400 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Other Requests & History Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                    <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-sm space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444]">
                                <PlusCircle size={20} />
                            </div>
                            <h3 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tighter">Other Documents</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Available Letter Types</label>
                                <select 
                                    value={selectedOther}
                                    onChange={(e) => setSelectedOther(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold appearance-none focus:bg-white focus:border-[#ef4444]/30 transition-all text-[#1a1b4b] outline-none"
                                >
                                    <option>---Select One---</option>
                                    {otherLetters.map((l, i) => (
                                        <option key={i} value={l}>{l}</option>
                                    ))}
                                </select>
                                <div className="absolute right-5 top-[38px] pointer-events-none text-gray-400">
                                    <ChevronDown size={14} />
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => selectedOther !== '---Select One---' && handleSendRequest(selectedOther)}
                                disabled={submitting || selectedOther === '---Select One---'}
                                className="w-full bg-[#1a1b4b] text-white py-4.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#1a1b4b]/10 hover:bg-[#ef4444] transition-all disabled:opacity-20 flex items-center justify-center gap-2 group"
                            >
                                <Send size={12} className="group-hover:translate-x-1 transition-transform" />
                                Send Request
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden h-full min-h-[400px]">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                                <Clock className="text-[#ef4444]" size={18} /> Recent History
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-white">
                                        <th className="px-8 py-4 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Document Requested</th>
                                        <th className="px-8 py-4 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Request Date</th>
                                        <th className="px-8 py-4 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Status</th>
                                        <th className="px-8 py-4 text-right text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan={4} className="px-8 py-10 text-center text-[10px] font-bold text-gray-400">Loading history...</td></tr>
                                    ) : requests.length === 0 ? (
                                        <tr><td colSpan={4} className="px-8 py-10 text-center text-[10px] font-bold text-gray-400">No requests found</td></tr>
                                    ) : (
                                        requests.map((req) => (
                                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <p className="text-xs font-black text-[#1a1b4b] tracking-tight">{req.letter_type}</p>
                                                    {req.status === 'approved' && <p className="text-[8px] text-emerald-500 font-black uppercase mt-0.5">Approved & Ready</p>}
                                                </td>
                                                <td className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase">
                                                    {new Date(req.request_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                                        req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                                                        req.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                        <span className={`w-1 h-1 rounded-full ${
                                                            req.status === 'approved' ? 'bg-emerald-500' : 
                                                            req.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                                                        }`} />
                                                        {req.status}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    {req.status === 'approved' ? (
                                                        <button 
                                                            onClick={() => window.print()}
                                                            className="bg-[#1a1b4b] text-white w-8 h-8 rounded-lg hover:bg-[#ef4444] transition-all flex items-center justify-center mx-auto lg:ml-auto"
                                                        >
                                                            <Download size={12} />
                                                        </button>
                                                    ) : req.status === 'pending' ? (
                                                        <button 
                                                            onClick={async () => {
                                                                await supabase.from('letter_requests').delete().eq('id', req.id);
                                                                setRequests(requests.filter(r => r.id !== req.id));
                                                            }}
                                                            className="text-[8px] font-black text-gray-300 uppercase hover:text-red-500 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    ) : (
                                                        <span className="text-[8px] font-black text-gray-200 cursor-not-allowed">N/A</span>
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
            </div>
        </div>
    );
};

export default RequestLetter;
