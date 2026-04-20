import { useState, useEffect } from 'react';
import { 
    FilePlus, 
    Send, 
    Upload, 
    X, 
    CheckCircle2, 
    AlertCircle, 
    History, 
    FileText, 
    Download,
    Eye,
    ChevronRight,
    Loader2,
    Briefcase
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const Proposals = () => {
    const { profile, user } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [proposals, setProposals] = useState([]);
    const [toast, setToast] = useState(null);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);

    useEffect(() => {
        if (user) {
            fetchMyProposals();
        }
    }, [user]);

    const fetchMyProposals = async () => {
        setFetching(true);
        const { data, error } = await supabase
            .from('proposals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching proposals:', error);
        } else {
            setProposals(data);
        }
        setFetching(false);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
            setToast({ message: 'File size too large (Max 5MB)', type: 'error' });
            return;
        }
        setFile(selectedFile);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        let fileUrl = null;

        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('proposals')
                .upload(filePath, file);

            if (uploadError) {
                setToast({ message: 'File upload failed', type: 'error' });
                setLoading(false);
                return;
            }

            const { data } = supabase.storage.from('proposals').getPublicUrl(filePath);
            fileUrl = data.publicUrl;
        }

        const { data: newProposal, error } = await supabase
            .from('proposals')
            .insert([{
                user_id: user.id,
                full_name: profile?.full_name,
                title,
                description,
                file_url: fileUrl,
                status: 'pending'
            }])
            .select();

        if (error) {
            setToast({ message: 'Submission failed', type: 'error' });
        } else {
            setToast({ message: 'Proposal submitted to HOD!', type: 'success' });
            setProposals([newProposal[0], ...proposals]);
            setShowModal(false);
            resetForm();
        }
        setLoading(false);
        setTimeout(() => setToast(null), 3000);
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setFile(null);
    };

    const statusConfig = {
        pending: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' },
        approved: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
        rejected: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' }
    };

    return (
        <div className="p-8 sm:p-12 space-y-12 bg-[#fcfdfe] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <Briefcase className="text-[#ef4444]" /> Academic Proposals
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1 italic">Submit & Track Institutional Initiatives</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="group flex items-center gap-3 px-8 py-4 bg-[#1a1b4b] text-white rounded-[2rem] text-[13px] font-black uppercase tracking-widest hover:bg-[#ef4444] transition-all shadow-xl shadow-[#1a1b4b]/10 active:scale-95"
                >
                    <FilePlus size={18} /> Create New Proposal
                </button>
            </div>

            {/* Overview / Banner */}
            <div className="bg-gradient-to-br from-[#1a1b4b] to-[#2d3a8c] rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
                 <div className="relative z-10 max-w-2xl space-y-4">
                    <h2 className="text-3xl font-black tracking-tighter leading-none">Drive Innovation at MIT ADT.</h2>
                    <p className="text-white/60 text-sm font-bold leading-relaxed">Submit your research initiatives, infrastructure plans, or academic collaborations directly for departmental review.</p>
                    <div className="flex gap-4 pt-4">
                        <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                            <p className="text-[12px] font-black uppercase text-white/50 mb-1">Active</p>
                            <p className="text-xl font-black">{proposals.filter(p => p.status === 'pending').length}</p>
                        </div>
                        <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                            <p className="text-[12px] font-black uppercase text-white/50 mb-1">Approved</p>
                            <p className="text-xl font-black text-emerald-400">{proposals.filter(p => p.status === 'approved').length}</p>
                        </div>
                    </div>
                 </div>
                 <History size={240} className="absolute -right-10 -bottom-10 text-white/5 opacity-10 rotate-12" />
            </div>

            {/* Proposal History Table */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-2">
                        <History size={20} className="text-[#ef4444]" /> Recent Submissions
                    </h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest">Proposal Details</th>
                                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-center">Documentation</th>
                                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-right">Submitted On</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {fetching ? (
                                    <tr><td colSpan={4} className="px-8 py-20 text-center flex flex-col items-center gap-4">
                                        <Loader2 className="animate-spin text-[#1a1b4b]" />
                                        <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest">Fetching Archives...</p>
                                    </td></tr>
                                ) : proposals.length === 0 ? (
                                    <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-300 font-bold italic text-sm">No proposals found in your history.</td></tr>
                                ) : (
                                    proposals.map((p) => {
                                        const s = statusConfig[p.status];
                                        return (
                                            <tr key={p.id} className="hover:bg-slate-50/30 transition-all group">
                                                <td className="px-8 py-6">
                                                    <div>
                                                        <p className="text-base font-black text-[#1a1b4b] tracking-tight group-hover:text-[#ef4444] transition-colors">{p.title}</p>
                                                        <p className="text-xs font-bold text-gray-400 line-clamp-1 max-w-md">{p.description}</p>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex justify-center text-center">
                                                        <span className={`px-4 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2 border-2 ${s.bg} ${s.text}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                            {p.status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex justify-center">
                                                        {p.file_url ? (
                                                            <a href={p.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#1a1b4b] hover:text-[#ef4444] transition-colors">
                                                                <FileText size={18} />
                                                                <span className="text-[12px] font-black uppercase tracking-widest">View PDF</span>
                                                            </a>
                                                        ) : (
                                                            <span className="text-[12px] font-black text-gray-300 uppercase italic">No File</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <p className="text-xs font-black text-[#1a1b4b]">{new Date(p.created_at).toLocaleDateString()}</p>
                                                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create Proposal Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-[#1a1b4b]/40 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl animate-in zoom-in-95 border border-white/20 relative">
                        <div className="flex justify-between items-start mb-10">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444]">
                                    <FilePlus size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-[#1a1b4b] uppercase tracking-tighter">Draft Proposal</h2>
                                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">New institutional initiative</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">Proposal Title</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="e.g. AI Laboratory Research Expansion"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-[#ef4444]/30 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">Detail Justification (Text Option)</label>
                                <textarea 
                                    required
                                    placeholder="Explain the objectives, budget, and impact..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold min-h-[150px] focus:bg-white focus:border-[#ef4444]/30 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">Supporting Document (Choose File)</label>
                                <div className="relative group/file">
                                    <input 
                                        type="file" 
                                        onChange={handleFileChange}
                                        className="hidden" 
                                        id="proposal-file"
                                        accept=".pdf,.doc,.docx"
                                    />
                                    <label 
                                        htmlFor="proposal-file"
                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer bg-slate-50 group-hover:bg-slate-100 group-hover:border-[#1a1b4b]/20 transition-all overflow-hidden"
                                    >
                                        {file ? (
                                            <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2">
                                                <CheckCircle2 size={24} className="text-emerald-500 mb-2" />
                                                <p className="text-xs font-black text-[#1a1b4b]">{file.name}</p>
                                                <p className="text-[12px] text-gray-400 font-bold">{(file.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-gray-400">
                                                <Upload size={24} className="mb-2 group-hover/file:text-[#ef4444] transition-colors" />
                                                <p className="text-xs font-black uppercase tracking-widest">Click to upload doc</p>
                                                <p className="text-[12px] font-bold mt-1">PDF or Word (Max 5MB)</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm"
                                >
                                    Discard Draft
                                </button>
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] py-5 bg-[#1a1b4b] text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-[#ef4444] transition-all shadow-2xl shadow-[#1a1b4b]/20 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Submit to HOD'} <Send size={16} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            {toast && (
                <div className={`fixed top-24 right-8 z-[200] ${toast.type === 'success' ? 'bg-[#1a1b4b]' : 'bg-red-600'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-right-10 border border-white/10`}>
                    <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                        {toast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertCircle size={18} />}
                    </div>
                    <span className="font-bold text-xs uppercase tracking-widest">{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default Proposals;
