import { useState, useEffect, useRef } from 'react';
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
    AlertCircle,
    Monitor,
    Briefcase,
    DraftingCompass,
    FileUp,
    MessageSquare,
    Paperclip,
    X,
    FileBox
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Student Specific Requests
const studentRequestTypes = [
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

// Faculty Specific Requests
const facultyRequestTypes = [
    { 
        id: 'funds_demand', 
        title: 'Funds Demand', 
        icon: HandCoins, 
        iconBg: 'bg-blue-50 text-blue-500',
        description: 'Request for departmental or activity funds with documentation.',
        category: 'fund'
    },
    { 
        id: 'research_funds', 
        title: 'Research Funds', 
        icon: Medal, 
        iconBg: 'bg-amber-50 text-[#ff9f1c]',
        description: 'Grant requests and requirements for academic research projects.',
        category: 'fund'
    },
    { 
        id: 'stationery_furniture', 
        title: 'Stationery & Furniture', 
        icon: Briefcase, 
        iconBg: 'bg-indigo-50 text-[#1a1b4b]',
        description: 'Demand for physical office supplies and infrastructure.',
        category: 'requisition'
    },
    { 
        id: 'digital_software', 
        title: 'Digital & Software', 
        icon: Monitor, 
        iconBg: 'bg-cyan-50 text-cyan-500',
        description: 'Requests for software licenses, digital tools, and IT hardware.',
        category: 'requisition'
    },
];

const RequestLetter = () => {
    const { profile, user } = useAuth();
    const isFaculty = profile?.role === 'faculty';
    const requestTypes = isFaculty ? facultyRequestTypes : studentRequestTypes;

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [description, setDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [activeRequest, setActiveRequest] = useState(null);
    const [toast, setToast] = useState(null);
    const fileInputRef = useRef(null);

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

    const handleFileUpload = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('requisitions')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('requisitions')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const handleSendRequest = async (item) => {
        if (!user || submitting) return;
        
        // Modal trigger for faculty if they haven't started filling details
        if (isFaculty && !activeRequest) {
            setActiveRequest(item);
            return;
        }

        setSubmitting(true);
        try {
            let attachmentUrl = null;
            if (selectedFile) {
                attachmentUrl = await handleFileUpload(selectedFile);
            }

            const { data, error } = await supabase
                .from('letter_requests')
                .insert([
                    {
                        user_id: user.id,
                        student_name: profile?.full_name || 'System User',
                        letter_type: item.title,
                        status: 'pending',
                        description: description,
                        attachment_url: attachmentUrl,
                        category: isFaculty ? (item.category || 'requisition') : 'letter'
                    }
                ])
                .select();

            if (error) throw error;

            setRequests([data[0], ...requests]);
            setToast({ message: `Request for ${item.title} sent successfully!`, type: 'success' });
            resetForm();
        } catch (error) {
            console.error('Submission error:', error);
            setToast({ message: 'Error processing requisition. Please try again.', type: 'error' });
        } finally {
            setSubmitting(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    const resetForm = () => {
        setDescription('');
        setSelectedFile(null);
        setActiveRequest(null);
    };

    return (
        <div className="p-8 sm:p-12 space-y-8 bg-[#f8fafc] min-h-screen">
            {/* Modal for Description & Optional File */}
            {activeRequest && (
                <div className="fixed inset-0 bg-[#1a1b4b]/40 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-12 h-12 rounded-xl ${activeRequest.iconBg} flex items-center justify-center`}>
                                <activeRequest.icon size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter">{activeRequest.title}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Provide Details & Documentation</p>
                            </div>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <MessageSquare size={12} className="text-[#ef4444]" /> 
                                    Justification / Description
                                </label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Please describe your demand in detail..."
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold min-h-[100px] focus:bg-white focus:border-[#ef4444]/30 outline-none transition-all placeholder:text-gray-300 ring-4 ring-transparent focus:ring-[#ef4444]/5"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Paperclip size={12} className="text-[#ef4444]" /> 
                                    Attachments (Optional)
                                </label>
                                
                                {!selectedFile ? (
                                    <button 
                                        onClick={() => fileInputRef.current.click()}
                                        className="w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 hover:border-[#1a1b4b]/20 transition-all group"
                                    >
                                        <FileUp size={24} className="text-slate-300 group-hover:text-[#1a1b4b] group-hover:-translate-y-1 transition-all" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Click to upload documents</p>
                                    </button>
                                ) : (
                                    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#1a1b4b] text-white flex items-center justify-center">
                                                <FileBox size={16} />
                                            </div>
                                            <div className="max-w-[150px]">
                                                <p className="text-[11px] font-black text-[#1a1b4b] truncate">{selectedFile.name}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedFile(null)}
                                            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={(e) => setSelectedFile(e.target.files[0])}
                                />
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={resetForm}
                                    className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => handleSendRequest(activeRequest)}
                                    disabled={!description || submitting}
                                    className="flex-[2] py-4 bg-[#1a1b4b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#ef4444] transition-all shadow-lg shadow-[#1a1b4b]/10 disabled:opacity-30 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : <Send size={14} />} 
                                    {submitting ? 'Sending...' : 'Send Requisition'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                <div className="space-y-1 text-left">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#ef4444]/10 rounded-xl text-[#ef4444]">
                            {isFaculty ? <Briefcase size={22} /> : <FileText size={22} />}
                        </div>
                        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
                            {isFaculty ? 'Submit Requisition' : 'Request Documents'}
                        </h1>
                    </div>
                    <p className="text-gray-400 font-bold text-[10px] tracking-[0.2em] uppercase ml-12">
                        {isFaculty ? 'Resources & Funds Service Portal' : 'Institutional Service Portal'}
                    </p>
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

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {requestTypes.map((item) => {
                    const isPending = requests.some(r => r.letter_type === item.title && r.status === 'pending');
                    return (
                        <div key={item.id} className="bg-white rounded-3xl border-2 border-slate-100 p-6 flex flex-col items-center hover:shadow-xl hover:shadow-[#1a1b4b]/5 hover:border-[#ef4444]/20 transition-all duration-300 group hover:ring-[#1a1b4b]/5">
                            <div className="relative mb-5 mt-2">
                                <div className={`w-14 h-14 rounded-2xl ${item.iconBg} flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300`}>
                                    <item.icon size={26} strokeWidth={2.5} />
                                </div>
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow shadow-[#ef4444]/20 border border-slate-100">
                                <PlusCircle size={12} className="text-[#ef4444]" />
                                </div>
                            </div>

                            <div className="flex-1 min-h-[60px] flex flex-col justify-center items-center px-4">
                                <h3 className="text-sm font-black text-[#1a1b4b] tracking-tight leading-tight text-center">{item.title}</h3>
                                {isFaculty && item.category === 'fund' && (
                                    <span className="mt-1 px-2 py-0.5 bg-blue-50 text-blue-500 text-[8px] font-black uppercase rounded tracking-widest">Institutional Grant</span>
                                )}
                            </div>
                            
                            <div className="mt-2 text-center w-full px-2">
                                <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1 italic">
                                    {isFaculty ? (isPending ? 'Approval in Progress' : 'Available for Submission') : (isPending ? 'Pending Approval' : 'Ready to Request')}
                                </p>
                                <div className="relative group/tip">
                                    <button className="flex items-center gap-1 mx-auto text-[9px] font-black text-cyan-500 uppercase tracking-widest hover:text-[#ef4444] transition-colors mb-5">
                                        Requirements <ChevronDown size={12} />
                                    </button>
                                    <div className="hidden group-hover/tip:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-[#1a1b4b] text-white text-[9px] font-bold rounded-xl w-40 z-20 shadow-xl leading-relaxed">
                                        {item.description}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full grid grid-cols-2 gap-2 mt-auto">
                                <button 
                                    onClick={() => handleSendRequest(item)}
                                    disabled={submitting || isPending}
                                    className={`py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 ${
                                        isPending 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-[#1a1b4b] text-white hover:bg-[#ef4444] shadow-[#1a1b4b]/10'
                                    }`}
                                >
                                    <Send size={10} /> {isPending ? 'Sent' : (isFaculty ? 'Submit' : 'Send')}
                                </button>
                                <button className="bg-slate-50 text-slate-400 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* History Section */}
            <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <History className="text-[#ef4444]" size={18} /> {isFaculty ? 'Requisition History' : 'Recent History'}
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white">
                                <th className="px-8 py-4 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">{isFaculty ? 'Type & Details' : 'Document Requested'}</th>
                                <th className="px-8 py-4 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Date</th>
                                <th className="px-8 py-4 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Status</th>
                                <th className="px-8 py-4 text-right text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={4} className="px-8 py-10 text-center text-[10px] font-bold text-gray-400">Loading history...</td></tr>
                            ) : requests.length === 0 ? (
                                <tr><td colSpan={4} className="px-8 py-10 text-center text-[10px] font-bold text-gray-400">No records found</td></tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-black text-[#1a1b4b] tracking-tight">{req.letter_type}</p>
                                                    {req.attachment_url && (
                                                        <Paperclip size={10} className="text-[#ef4444]" />
                                                    )}
                                                </div>
                                                {req.description && (
                                                    <p className="text-[9px] text-gray-400 font-bold truncate max-w-sm">{req.description}</p>
                                                )}
                                            </div>
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
                                                <div className="flex justify-end gap-2">
                                                    {req.attachment_url && (
                                                        <a href={req.attachment_url} target="_blank" rel="noreferrer" className="p-2 border border-slate-200 text-slate-400 hover:text-[#1a1b4b] rounded-lg">
                                                            <Paperclip size={12} />
                                                        </a>
                                                    )}
                                                    <button onClick={() => window.print()} className="bg-[#1a1b4b] text-white p-2 rounded-lg hover:bg-[#ef4444]">
                                                        <Download size={12} />
                                                    </button>
                                                </div>
                                            ) : req.status === 'pending' ? (
                                                <button 
                                                    onClick={async () => {
                                                        const { error } = await supabase.from('letter_requests').delete().eq('id', req.id);
                                                        if (!error) setRequests(requests.filter(r => r.id !== req.id));
                                                    }}
                                                    className="text-[8px] font-black text-gray-300 uppercase hover:text-red-500"
                                                >
                                                    Cancel
                                                </button>
                                            ) : (
                                                <button className="text-[8px] font-black text-gray-300 uppercase italic">Archived</button>
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

export default RequestLetter;
