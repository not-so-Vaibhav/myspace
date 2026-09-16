import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    ArrowLeft, 
    Search, 
    Mail, 
    Phone, 
    FilePlus, 
    ChevronDown, 
    CheckCircle2, 
    Send,
    Users,
    BookOpen,
    Tag,
    Building,
    Shield,
    Loader2,
    Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { fetchAllFacultySubjectTags } from '../../services/facultySubjectService';

const FacultyList = () => {
    const { profile } = useAuth();
    const [mainTab, setMainTab] = useState('directory'); // 'directory' or 'request'
    
    // Directory state
    const [facultyMembers, setFacultyMembers] = useState([]);
    const [tagsMap, setTagsMap] = useState({});
    const [loadingDirectory, setLoadingDirectory] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState('ALL');

    // Request form state
    const [requestType, setRequestType] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const requestOptions = [
        { id: 'loan', label: 'Loan Request', desc: 'Financial assistance application' },
        { id: 'transfer', label: 'Department Transfer', desc: 'Change of academic department' },
        { id: 'separation', label: 'Separation (Resignation)', desc: 'Voluntary separation process' }
    ];

    useEffect(() => {
        loadFacultyDirectory();
    }, []);

    const loadFacultyDirectory = async () => {
        setLoadingDirectory(true);
        try {
            const [profilesRes, allTagsMap] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('*')
                    .in('role', ['faculty', 'hod', 'instructor', 'teacher'])
                    .order('full_name', { ascending: true }),
                fetchAllFacultySubjectTags()
            ]);

            setFacultyMembers(profilesRes.data || []);
            setTagsMap(allTagsMap || {});
        } catch (err) {
            console.error('Error loading faculty directory:', err);
        } finally {
            setLoadingDirectory(false);
        }
    };

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

    // Collect all unique subject tags across all faculty for filter dropdown
    const allUniqueTags = Array.from(
        new Set(
            Object.values(tagsMap)
                .flat()
                .map(t => t.subject?.code || t.code)
                .filter(Boolean)
        )
    );

    // Search and filter logic
    const filteredFaculty = facultyMembers.filter(fac => {
        const facTags = tagsMap[fac.id] || [];
        const q = searchQuery.toLowerCase().trim();

        const matchesQuery = !q || 
            fac.full_name?.toLowerCase().includes(q) ||
            fac.email?.toLowerCase().includes(q) ||
            fac.department?.toLowerCase().includes(q) ||
            facTags.some(t => {
                const sub = t.subject || {};
                return (
                    sub.name?.toLowerCase().includes(q) ||
                    sub.code?.toLowerCase().includes(q) ||
                    t.name?.toLowerCase().includes(q) ||
                    t.code?.toLowerCase().includes(q)
                );
            });

        const matchesTagFilter = selectedTagFilter === 'ALL' || facTags.some(t => {
            const code = t.subject?.code || t.code;
            return code === selectedTagFilter;
        });

        return matchesQuery && matchesTagFilter;
    });

    return (
        <div className="p-8 sm:p-12 space-y-10 max-w-[1300px] mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <Link to={backLink} className="inline-flex items-center gap-1.5 text-[13px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors mb-4 group">
                        <ArrowLeft size={13} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter">Faculty Management</h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
                        Academic Faculty Directory, Subject Specializations & Employment Services
                    </p>
                </div>

                {/* Main View Tabs */}
                <div className="flex p-1.5 bg-gray-100/80 rounded-2xl border border-gray-200/50 w-fit">
                    <button
                        onClick={() => setMainTab('directory')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            mainTab === 'directory'
                                ? 'bg-white text-[#1a1b4b] shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <Users size={16} /> Faculty Directory
                    </button>
                    <button
                        onClick={() => setMainTab('request')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            mainTab === 'request'
                                ? 'bg-white text-[#1a1b4b] shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <FilePlus size={16} /> Employment Request
                    </button>
                </div>
            </div>

            {/* Success Toast */}
            {successMsg && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 rounded-r-3xl flex items-center gap-4 shadow-xl shadow-emerald-100/50 animate-in slide-in-from-right duration-300">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-emerald-800 font-black text-sm uppercase tracking-tight">Deployment Success</p>
                        <p className="text-emerald-600 text-[13px] font-bold uppercase tracking-widest mt-0.5">{successMsg}</p>
                    </div>
                </div>
            )}

            {mainTab === 'directory' ? (
                /* ─── TAB 1: FACULTY DIRECTORY & SEARCH WITH SUBJECT TAGS ─── */
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Search & Filter Controls */}
                    <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input
                                type="text"
                                placeholder="Search by faculty name, email, department, or subject tag (e.g. CSE332, Photography)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-none rounded-2xl text-xs font-bold text-[#1a1b4b] focus:ring-2 focus:ring-indigo-100 outline-none placeholder:text-gray-300"
                            />
                        </div>

                        {allUniqueTags.length > 0 && (
                            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                                <Filter size={16} className="text-gray-400 ml-2" />
                                <select
                                    value={selectedTagFilter}
                                    onChange={(e) => setSelectedTagFilter(e.target.value)}
                                    className="px-4 py-3.5 bg-gray-50 rounded-2xl border-none text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                                >
                                    <option value="ALL">All Subject Tags ({allUniqueTags.length})</option>
                                    {allUniqueTags.map(code => (
                                        <option key={code} value={code}>Tag: {code}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Faculty Cards Grid */}
                    {loadingDirectory ? (
                        <div className="p-20 text-center space-y-3">
                            <Loader2 size={32} className="animate-spin text-indigo-500 mx-auto" />
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                Loading Faculty Directory & Subject Tags...
                            </p>
                        </div>
                    ) : filteredFaculty.length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] p-16 text-center border border-gray-100 space-y-3">
                            <Users className="w-12 h-12 text-gray-200 mx-auto" strokeWidth={1.5} />
                            <p className="text-sm font-black text-[#1a1b4b] uppercase tracking-wider">
                                No Faculty Found
                            </p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-sm mx-auto">
                                No faculty members match your current search query or subject tag filter.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredFaculty.map(fac => {
                                const tags = tagsMap[fac.id] || [];
                                const isHod = fac.role?.toLowerCase() === 'hod';

                                return (
                                    <div
                                        key={fac.id}
                                        className="bg-white rounded-[2.5rem] border border-gray-100 hover:border-indigo-200 p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                                    >
                                        <div>
                                            {/* Top info */}
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a1b4b] to-[#2d3a8c] text-white flex items-center justify-center font-black text-lg shadow-md group-hover:scale-105 transition-transform">
                                                        {fac.full_name?.charAt(0).toUpperCase() || 'F'}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-black text-[#1a1b4b] uppercase tracking-tight">
                                                            {fac.full_name}
                                                        </h3>
                                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                                            <Building size={12} className="text-gray-300" />
                                                            {fac.department || 'Computer Science & Eng'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                                                    isHod
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                }`}>
                                                    {fac.role?.toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Contact Info */}
                                            <div className="py-3 border-y border-gray-50 space-y-1.5 text-xs text-gray-500 font-semibold">
                                                {fac.email && (
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Mail size={13} className="text-gray-300 shrink-0" />
                                                        <span className="truncate">{fac.email}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-[11px] text-gray-400 uppercase tracking-widest font-mono">
                                                    <Shield size={13} className="text-gray-300 shrink-0" />
                                                    <span>UID: {fac.id.substring(0, 8)}</span>
                                                </div>
                                            </div>

                                            {/* Teaching Subject Tags */}
                                            <div className="mt-4 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                        <BookOpen size={11} className="text-indigo-500" />
                                                        Subject Tags ({tags.length})
                                                    </span>
                                                </div>

                                                {tags.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                                                        {tags.map(t => {
                                                            const sub = t.subject || {};
                                                            const code = sub.code || 'CODE';
                                                            const name = sub.name || 'Subject';
                                                            return (
                                                                <span
                                                                    key={t.id || t.subject_id}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                                                                    title={`${code}: ${name} (${sub.type || 'Theory'})`}
                                                                >
                                                                    <Tag size={9} className="text-indigo-400 shrink-0" />
                                                                    <span className="font-mono">{code}</span>
                                                                    <span className="text-indigo-600 truncate max-w-[120px]">{name}</span>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] font-bold text-gray-300 italic uppercase tracking-widest">
                                                        No Subject Tags Added
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* ─── TAB 2: INITIATE EMPLOYMENT REQUEST (PRESERVED) ─── */
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] p-10 border border-[#1a1b4b]/5 shadow-2xl shadow-gray-100 flex flex-col h-full max-w-3xl mx-auto">
                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-gray-50">
                            <div className="w-12 h-12 bg-[#1a1b4b] text-white rounded-2xl flex items-center justify-center shadow-lg">
                                <FilePlus size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter">Initiate Employment Request</h2>
                                <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Select request type from the registry below</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-10 flex-1">
                            {/* Custom Dropdown */}
                            <div className="relative">
                                <label className="block text-[13px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Type of Request</label>
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
                                                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{option.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
                                <p className="text-[12px] font-black text-indigo-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Mail size={12} strokeWidth={3} /> Processing Intel
                                </p>
                                <p className="text-[13px] font-bold text-indigo-600/70 leading-relaxed uppercase">
                                    Requests submitted here are routed directly to the Dean and HR vector for digital verification. Expected processing timeframe: 3-5 Academic Days.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={!requestType || isSubmitting}
                                className="w-full py-6 bg-[#1a1b4b] text-white rounded-[1.5rem] text-[13px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-30 flex items-center justify-center gap-3 overflow-hidden group relative"
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
            )}
        </div>
    );
};

export default FacultyList;
