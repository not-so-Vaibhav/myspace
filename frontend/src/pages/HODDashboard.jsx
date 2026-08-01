import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileUser, Clock, Plus, X, ArrowRight, Check, Ban, Loader2, AlertCircle, BookX } from 'lucide-react';
import { MeetingCard, statusColors } from '../components/Dashboard/MeetingSection';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useBacklogSummary } from '../hooks/useAcademicProgression';

// Toast notification component
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? 'bg-[#1a1b4b]' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    const icon = type === 'success' ? <Check size={16} strokeWidth={3} /> : <Ban size={16} strokeWidth={3} />;

    return (
        <div className={`fixed top-24 right-8 z-[150] ${bgColor} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-right-10 border border-white/10`}>
            <span className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">{icon}</span>
            <span className="text-xs font-black uppercase tracking-widest">{message}</span>
        </div>
    );
};

const HODDashboard = () => {
    const { profile, user } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [meetingsList, setMeetingsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [facultyStats, setFacultyStats] = useState({ active: 0, total: 0 });
    const [toast, setToast] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    // ── Backlog data from new academic_progression schema ──
    const { backlogs: pendingBacklogs, totalPending: totalBacklogs } = useBacklogSummary();
    const [newMeet, setNewMeet] = useState({
        date: '', start_time: '', end_time: '', agenda: '', location: '', organized_by: ''
    });

    useEffect(() => {
        if (user) {
            fetchInitialData();
        }
    }, [user]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Fetch Pending Leaves
            const { data: leaves, error: leavesError } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            // Fetch Faculty Stats
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, role');

            // Fetch Meetings
            const { data: meetings, error: meetingsError } = await supabase
                .from('meetings')
                .select('*')
                .order('created_at', { ascending: false });

            if (!leavesError) setLeaveRequests(leaves);
            if (!profilesError) {
                const total = profiles.length;
                const faculty = profiles.filter(p => p.role === 'faculty' || p.role === 'hod').length;
                setFacultyStats({ active: faculty, total: total });
            }
            if (!meetingsError) setMeetingsList(meetings || []);

        } catch (err) {
            console.error('Core sync failed:', err);
        }
        setLoading(false);
    };

    const handleAction = async (id, status) => {
        setProcessingId(id);
        const { error } = await supabase
            .from('leave_requests')
            .update({ status })
            .eq('id', id);

        if (error) {
            setToast({ message: 'Security protocol error', type: 'error' });
        } else {
            setToast({ 
                message: `Application ${status === 'approved' ? 'Approved' : 'Rejected'}`, 
                type: status === 'approved' ? 'success' : 'error' 
            });
            // Remove from local list to reflect approval
            setLeaveRequests(prev => prev.filter(r => r.id !== id));
        }
        setProcessingId(null);
    };

    const handleChange = (e) => setNewMeet({ ...newMeet, [e.target.name]: e.target.value });

    const handleCreateMeet = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase
            .from('meetings')
            .insert([{
                ...newMeet,
                created_by: user.id,
                status: 'upcoming'
            }])
            .select();

        if (error) {
            setToast({ message: 'Meeting protocol failed', type: 'error' });
            console.error('Meeting error:', error);
        } else {
            setMeetingsList([data[0], ...meetingsList]);
            setShowModal(false);
            setNewMeet({ date: '', start_time: '', end_time: '', agenda: '', location: '', organized_by: '' });
            setToast({ message: 'Meeting scheduled successfully', type: 'success' });
        }
    };

    const pendingCount = leaveRequests.length;
    const nextMeeting = meetingsList[0];

    return (
        <div className="p-8 sm:p-12 space-y-10 bg-[#fcfdfe] min-h-screen">
            {/* Toast Notification */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
                <div>
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter">
                        HOD Command Center
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1 italic">
                        Real-Time Department Operations Review
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <Loader2 className="w-12 h-12 text-[#1a1b4b] animate-spin" />
                    <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Syncing with Central Vault...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Left Side: Stats + Leave Approvals */}
                    <div className="space-y-8">
                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Link to="/faculty" className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-[#1a1b4b]/20 hover:shadow-2xl hover:shadow-[#1a1b4b]/5 transition-all cursor-pointer group relative overflow-hidden">
                                <FileUser className="absolute -right-4 -top-4 w-24 h-24 text-indigo-500 opacity-5 rotate-12" />
                                <div className="flex justify-between items-start mb-6">
                                    <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest group-hover:text-[#1a1b4b] transition-colors leading-none">Total Faculty</span>
                                    <FileUser className="w-6 h-6 text-indigo-500" />
                                </div>
                                <div className="text-4xl font-black text-[#1a1b4b] tracking-tighter">{facultyStats.active}</div>
                                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-1">Across Department</p>
                            </Link>

                            <Link to="/approvals" className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-[#ef4444]/20 hover:shadow-2xl hover:shadow-[#ef4444]/5 transition-all cursor-pointer group relative overflow-hidden">
                                <Clock className="absolute -right-4 -top-4 w-24 h-24 text-amber-500 opacity-5 rotate-12" />
                                <div className="flex justify-between items-start mb-6">
                                    <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest group-hover:text-[#1a1b4b] transition-colors leading-none">Pending Approvals</span>
                                    <Clock className="w-6 h-6 text-amber-500" />
                                </div>
                                <div className="text-4xl font-black text-[#1a1b4b] tracking-tighter">{pendingCount}</div>
                                <p className="text-[12px] font-bold text-amber-600 uppercase tracking-widest mt-1">Action Required</p>
                            </Link>

                            {/* NEW: Backlog stat card from academic_progression schema */}
                            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-red-200 hover:shadow-2xl hover:shadow-red-500/5 transition-all relative overflow-hidden group">
                                <BookX className="absolute -right-4 -top-4 w-24 h-24 text-red-400 opacity-5 rotate-12" />
                                <div className="flex justify-between items-start mb-6">
                                    <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest group-hover:text-[#1a1b4b] transition-colors leading-none">Active Backlogs</span>
                                    <BookX className="w-6 h-6 text-red-400" />
                                </div>
                                <div className={`text-4xl font-black tracking-tighter ${totalBacklogs > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {totalBacklogs}
                                </div>
                                <p className={`text-[12px] font-bold uppercase tracking-widest mt-1 ${totalBacklogs > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {totalBacklogs > 0 ? 'Pending Clearance' : 'All Cleared'}
                                </p>
                            </div>
                        </div>

                        {/* Leave Approvals List */}
                        <div className="bg-white rounded-[3rem] p-10 border-2 border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-[#1a1b4b] uppercase tracking-tighter">Live Queue</h2>
                                <Link to="/approvals" className="text-[12px] font-black text-[#ef4444] uppercase tracking-widest hover:underline flex items-center gap-2 transition-all">
                                    Explore Vault <ArrowRight size={14} />
                                </Link>
                            </div>
                            
                            <div className="space-y-4">
                                {leaveRequests.length === 0 ? (
                                    <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-[2rem]">
                                        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                                            <Check size={28} className="text-emerald-500" strokeWidth={3} />
                                        </div>
                                        <p className="text-xs font-black text-[#1a1b4b] uppercase tracking-tighter">Zero Pendency</p>
                                        <p className="text-[12px] text-gray-300 font-bold uppercase tracking-widest mt-1">All applications processed</p>
                                    </div>
                                ) : (
                                    leaveRequests.slice(0, 4).map((req) => (
                                        <div key={req.id} className="flex justify-between items-center p-6 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-[#1a1b4b]/5 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-[#1a1b4b] text-white flex items-center justify-center font-black text-lg">
                                                    {req.full_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-[#1a1b4b] uppercase tracking-tighter text-sm">{req.full_name}</p>
                                                    <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{req.leave_type} • {new Date(req.start_date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAction(req.id, 'rejected')}
                                                    disabled={processingId === req.id}
                                                    className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                >
                                                    <Ban size={16} strokeWidth={3} />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, 'approved')}
                                                    disabled={processingId === req.id}
                                                    className="px-5 bg-[#1a1b4b] text-white text-[12px] font-black rounded-xl uppercase tracking-widest hover:bg-[#ef4444] transition-all shadow-lg active:scale-95"
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {leaveRequests.length > 4 && (
                                    <Link to="/approvals" className="block text-center text-[12px] font-black text-blue-500 uppercase tracking-widest hover:underline pt-4">
                                        + See {leaveRequests.length - 4} more pending requests
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* NEW: Pending Backlogs Panel */}
                    {pendingBacklogs.length > 0 && (
                        <div className="bg-white rounded-[3rem] p-10 border-2 border-red-50 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                                    <BookX className="text-red-400" size={22} /> Backlog Watch
                                </h2>
                                <span className="text-[12px] font-black text-red-400 bg-red-50 px-3 py-1 rounded-full uppercase tracking-widest">
                                    {totalBacklogs} Pending
                                </span>
                            </div>
                            <div className="space-y-3">
                                {pendingBacklogs.slice(0, 6).map(b => (
                                    <div key={b.backlog_id} className="flex items-center justify-between p-4 bg-red-50/40 rounded-2xl border border-red-100">
                                        <div>
                                            <p className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">{b.student_name}</p>
                                            <p className="text-[12px] text-gray-400 font-bold mt-0.5">
                                                {b.subject_code} — {b.subject_name}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] font-black text-red-400 uppercase tracking-widest">{b.origin_year_level} Sem {b.origin_semester_term}</p>
                                            <p className="text-[11px] font-bold text-gray-300 mt-0.5">
                                                {b.attempts_used}/{b.max_attempts} attempts
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {totalBacklogs > 6 && (
                                    <p className="text-center text-[12px] font-black text-red-400 uppercase tracking-widest pt-2">
                                        + {totalBacklogs - 6} more pending backlogs
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Right Side: Upcoming Meetings */}
                    <div className="bg-white rounded-[3rem] p-10 border-2 border-slate-100 shadow-sm h-full flex flex-col relative overflow-hidden">
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#1a1b4b]/5 rounded-full blur-3xl" />
                        
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <h2 className="text-2xl font-black text-[#1a1b4b] uppercase tracking-tighter leading-none">Institutional Multi-Meet</h2>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="p-3 bg-[#1a1b4b] text-white rounded-xl hover:bg-[#ef4444] transition-all shadow-lg active:scale-95"
                                >
                                    <Plus size={18} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        {nextMeeting ? (
                            <div className="space-y-6 flex-1">
                                <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 relative group">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center border border-slate-100">
                                            <p className="text-[12px] font-black text-red-500 uppercase leading-none">
                                                {new Date(nextMeeting.date).toLocaleString('default', { month: 'short' })}
                                            </p>
                                            <p className="text-2xl font-black text-[#1a1b4b] leading-tight">
                                                {new Date(nextMeeting.date).getDate()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1">Upcoming Agenda</p>
                                            <h3 className="text-lg font-black text-[#1a1b4b] leading-tight">{nextMeeting.agenda}</h3>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                                        <div className="flex items-center gap-2 text-[12px] font-bold text-slate-500 uppercase tracking-widest">
                                            <Clock size={14} className="text-[#ef4444]" /> {nextMeeting.start_time}
                                        </div>
                                        <div className="flex items-center justify-end">
                                            <Link to="/meetings" className="text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest hover:underline">View All Briefings</Link>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 flex items-center justify-center opacity-30 italic text-xs font-bold text-gray-400">
                                    - End of Briefing Stream -
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                                <Clock size={60} className="text-slate-100 mb-4" />
                                <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No meetings scheduled</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Meeting Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#1a1b4b]/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl border border-white/20 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                         <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#1a1b4b]/10 flex items-center justify-center text-[#1a1b4b]">
                                    <Plus size={24} strokeWidth={3} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter">New Briefing</h2>
                                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Schedule Department Meet</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateMeet} className="space-y-5">
                            <div>
                                <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Event Date</label>
                                <input type="date" name="date" value={newMeet.date} onChange={handleChange} required
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] focus:bg-white focus:border-[#ef4444]/30 outline-none transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Starts At</label>
                                    <input type="time" name="start_time" value={newMeet.start_time} onChange={handleChange} required
                                        className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] focus:bg-white focus:border-[#ef4444]/30 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Ends At</label>
                                    <input type="time" name="end_time" value={newMeet.end_time} onChange={handleChange} required
                                        className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] focus:bg-white focus:border-[#ef4444]/30 outline-none transition-all" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Location / Venue</label>
                                <input type="text" name="location" value={newMeet.location} onChange={handleChange} required placeholder="e.g. Conference Room 3"
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] focus:bg-white focus:border-[#ef4444]/30 outline-none transition-all" />
                            </div>

                            <div>
                                <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Organized By</label>
                                <input type="text" name="organized_by" value={newMeet.organized_by} onChange={handleChange} required placeholder="e.g. Dr. Meera Joshi"
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] focus:bg-white focus:border-[#ef4444]/30 outline-none transition-all" />
                            </div>

                            <div>
                                <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Briefing Agenda</label>
                                <input type="text" name="agenda" value={newMeet.agenda} onChange={handleChange} required placeholder="e.g. Academic Review"
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] focus:bg-white focus:border-[#ef4444]/30 outline-none transition-all" />
                            </div>

                            <button type="submit"
                                className="w-full py-4 bg-[#1a1b4b] text-white text-[13px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#ef4444] transition-all shadow-xl shadow-[#1a1b4b]/20 flex items-center justify-center gap-2 mt-4">
                                <Check size={16} strokeWidth={3} /> Authorize Meeting
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HODDashboard;
