import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Mail, Phone, FilePlus, ChevronDown, CheckCircle2, History, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FacultyList = () => {
    const { profile } = useAuth();
    const [requestType, setRequestType] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const requestOptions = [
        { id: 'loan', label: 'Loan Request', desc: 'Financial assistance application' },
        { id: 'transfer', label: 'Department Transfer', desc: 'Change of academic department' },
        { id: 'separation', label: 'Separation (Resignation)', desc: 'Voluntary separation process' }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!requestType) return;
        
        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            setSuccessMsg(`Your ${requestType} request has been logged successfully!`);
            setRequestType('');
            setTimeout(() => setSuccessMsg(''), 5000);
        }, 1500);
    };

    const backLink = profile?.role === 'admin' ? '/admin-dashboard' :
                     profile?.role === 'hod' ? '/hod-dashboard' : '/faculty-dashboard';

    return (
        <div className="p-8 sm:p-12 space-y-12 max-w-[1200px] mx-auto min-h-screen">
            {/* Header */}
            <div className="animate-in fade-in slide-in-from-top-4 duration-700">
                <Link to={backLink} className="inline-flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors mb-6 group">
                    <ArrowLeft size={13} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
                </Link>
                <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter">Faculty Management</h1>
                <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-2"> Administrative Workspace & Employment Requests </p>
            </div>

            {/* Success Toast */}
            {successMsg && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 rounded-r-3xl flex items-center gap-4 shadow-xl shadow-emerald-100/50 animate-in slide-in-from-right duration-300">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-emerald-800 font-black text-sm uppercase tracking-tight">Deployment Success</p>
                        <p className="text-emerald-600 text-[11px] font-bold uppercase tracking-widest mt-0.5">{successMsg}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* Request Creation Panel */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-[2.5rem] p-10 border border-[#1a1b4b]/5 shadow-2xl shadow-gray-100 flex flex-col h-full">
                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-gray-50">
                            <div className="w-12 h-12 bg-[#1a1b4b] text-white rounded-2xl flex items-center justify-center shadow-lg">
                                <FilePlus size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter">Initiate Employment Request</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select request type from the registry below</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-10 flex-1">
                            {/* Custom Dropdown */}
                            <div className="relative">
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Type of Request</label>
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`w-full p-6 text-left bg-gray-50 rounded-[1.5rem] border ${isDropdownOpen ? 'border-[#1a1b4b] ring-4 ring-[#1a1b4b]/5' : 'border-gray-100'} transition-all flex items-center justify-between group`}
                                >
                                    <span className={`text-sm font-bold ${requestType ? 'text-[#1a1b4b]' : 'text-gray-400'}`}>
                                        {requestType ? requestOptions.find(o => o.id === requestType)?.label : 'Browse Request Registry...'}
                                    </span>
                                    <ChevronDown className={`text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-[#1a1b4b]' : ''}`} />
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-100 rounded-[1.5rem] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        {requestOptions.map(option => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => {
                                                    setRequestType(option.id);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="w-full p-6 text-left hover:bg-gray-50 flex items-center gap-4 transition-colors border-b border-gray-50 last:border-0"
                                            >
                                                <div className={`w-3 h-3 rounded-full ${requestType === option.id ? 'bg-[#1a1b4b]' : 'bg-gray-200'}`} />
                                                <div>
                                                    <p className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">{option.label}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{option.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
                                <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Mail size={12} strokeWidth={3} /> Processing Intel
                                </p>
                                <p className="text-[11px] font-bold text-indigo-600/70 leading-relaxed uppercase">
                                    Requests submitted here are routed directly to the Dean and HR vector for digital verification. Expected processing timeframe: 3-5 Academic Days.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={!requestType || isSubmitting}
                                className="w-full py-6 bg-[#1a1b4b] text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-30 flex items-center justify-center gap-3 overflow-hidden group relative"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send size={18} strokeWidth={3} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        Log Request
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="space-y-8">
                    <div className="bg-[#1a1b4b] rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-100 h-full flex flex-col">
                        <History className="mb-6 opacity-40 shrink-0" size={32} />
                        <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight mb-4">Request <br />Archives</h3>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed mb-auto">
                            No active employment requests found in your current vector. <br /><br />All historical loan, transfer, and separation data is securely encrypted.
                        </p>
                        
                        <div className="mt-10 p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> System Integrity
                            </p>
                            <p className="text-[10px] font-black tracking-tight leading-tight uppercase">ISO/IEC 27001 Identity Protocol Active</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FacultyList;
