import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileUser, Clock, Plus, X, ArrowRight, Check, Ban } from 'lucide-react';
import { MeetingCard, statusColors } from '../components/Dashboard/MeetingSection';
import { Link } from 'react-router-dom';

// Initial leave requests
const initialLeaveRequests = [
    { id: 1, name: 'Dr. Jane Smith', type: 'Sick Leave', duration: '2 Days', status: 'pending' },
    { id: 2, name: 'Prof. Mark Lee', type: 'Conference', duration: '1 Week', status: 'pending' },
    { id: 3, name: 'Dr. Priya Patel', type: 'Personal Leave', duration: '3 Days', status: 'pending' },
    { id: 4, name: 'Prof. Amit Sharma', type: 'Medical', duration: '5 Days', status: 'pending' },
    { id: 5, name: 'Dr. Kavita Nair', type: 'Workshop', duration: '2 Days', status: 'pending' },
    { id: 6, name: 'Prof. Rahul Verma', type: 'Sick Leave', duration: '1 Day', status: 'pending' },
    { id: 7, name: 'Dr. Neha Gupta', type: 'Conference', duration: '4 Days', status: 'pending' },
    { id: 8, name: 'Prof. Suresh Kumar', type: 'Personal Leave', duration: '2 Days', status: 'pending' },
];

// Initial meetings
const initialMeetings = [
    {
        id: 1,
        date: 'Monday, 31 Mar 2026',
        timing: '10:00 AM – 11:30 AM',
        agenda: 'Mid-Semester Review & Academic Progress Discussion',
        location: 'Conference Room 3, Admin Block',
        organizedBy: 'Dr. Meera Joshi (HoD, Computer Dept.)',
        status: 'upcoming',
    },
    {
        id: 2,
        date: 'Wednesday, 2 Apr 2026',
        timing: '02:00 PM – 03:00 PM',
        agenda: 'Research Paper Submission Deadline Briefing',
        location: 'Seminar Hall – B, 2nd Floor',
        organizedBy: 'Prof. Rakesh Sharma (Research Cell)',
        status: 'upcoming',
    },
    {
        id: 3,
        date: 'Friday, 4 Apr 2026',
        timing: '11:00 AM – 12:00 PM',
        agenda: 'Internal Quality Assurance Cell (IQAC) Monthly Meet',
        location: 'Board Room, Admin Block',
        organizedBy: 'Dr. Sunil Patil (IQAC Coordinator)',
        status: 'upcoming',
    },
];

// Toast notification component
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    const icon = type === 'success' ? <Check size={16} strokeWidth={3} /> : <Ban size={16} strokeWidth={3} />;

    return (
        <div className={`fixed top-20 right-6 z-[100] ${bgColor} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in`}>
            <span className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">{icon}</span>
            <span className="text-sm font-bold">{message}</span>
        </div>
    );
};

const HODDashboard = () => {
    const { profile } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests);
    const [meetingsList, setMeetingsList] = useState(initialMeetings);
    const [toast, setToast] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [newMeet, setNewMeet] = useState({
        date: '', startTime: '', endTime: '', agenda: '', location: '', organizedBy: ''
    });

    const totalFaculty = 45;
    const activeFaculty = 42;
    const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handleApprove = (id) => {
        setProcessingId(id);
        // Simulate a brief processing delay
        setTimeout(() => {
            setLeaveRequests(prev => prev.map(r =>
                r.id === id ? { ...r, status: 'approved' } : r
            ));
            const req = leaveRequests.find(r => r.id === id);
            showToast(`${req.name}'s leave approved ✓`, 'success');
            setProcessingId(null);
            // Remove from visible list after animation
            setTimeout(() => {
                setLeaveRequests(prev => prev.filter(r => r.id !== id));
            }, 500);
        }, 600);
    };

    const handleReject = (id) => {
        setProcessingId(id);
        setTimeout(() => {
            setLeaveRequests(prev => prev.map(r =>
                r.id === id ? { ...r, status: 'rejected' } : r
            ));
            const req = leaveRequests.find(r => r.id === id);
            showToast(`${req.name}'s leave rejected`, 'error');
            setProcessingId(null);
            setTimeout(() => {
                setLeaveRequests(prev => prev.filter(r => r.id !== id));
            }, 500);
        }, 600);
    };

    const handleChange = (e) => setNewMeet({ ...newMeet, [e.target.name]: e.target.value });

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    const formatTime = (time) => {
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${m} ${ampm}`;
    };

    const handleCreate = (e) => {
        e.preventDefault();
        const newMeeting = {
            id: meetingsList.length + 1,
            date: formatDate(newMeet.date),
            timing: `${formatTime(newMeet.startTime)} – ${formatTime(newMeet.endTime)}`,
            agenda: newMeet.agenda,
            location: newMeet.location,
            organizedBy: newMeet.organizedBy,
            status: 'upcoming',
        };
        setMeetingsList(prev => [newMeeting, ...prev]);
        setShowModal(false);
        setNewMeet({ date: '', startTime: '', endTime: '', agenda: '', location: '', organizedBy: '' });
        showToast('New meeting created successfully!', 'success');
    };

    const pendingLeaves = leaveRequests.filter(r => r.status === 'pending');
    const next = meetingsList[0];

    return (
        <div className="p-8 sm:p-12 space-y-10">
            {/* Toast Notification */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="mb-4">
                <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
                    HOD Dashboard
                </h1>
                <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
                    Department Operations
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Stats + Leave Approvals */}
                <div className="space-y-8">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { label: 'Active Faculty', value: `${activeFaculty}/${totalFaculty}`, icon: FileUser, color: 'text-indigo-500', linkTo: '/faculty' },
                            { label: 'Pending Approvals', value: String(pendingCount), icon: Clock, color: 'text-amber-500', linkTo: '/approvals' },
                        ].map((stat, i) => (
                            <Link key={i} to={stat.linkTo} className="bg-white p-6 rounded-2xl border border-[var(--color-border-light)] hover:shadow-lg transition-all cursor-pointer group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest group-hover:text-[#1a1b4b] transition-colors">{stat.label}</span>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                                <div className="text-3xl font-black text-[#1a1b4b]">{stat.value}</div>
                            </Link>
                        ))}
                    </div>

                    {/* Leave Approvals */}
                    <div className="bg-white rounded-3xl p-8 border border-[var(--color-border-light)] shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight">Leave Approvals</h2>
                            <Link to="/approvals" className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">View All</Link>
                        </div>
                        <div className="space-y-4">
                            {pendingLeaves.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                                        <Check size={24} className="text-green-500" strokeWidth={2.5} />
                                    </div>
                                    <p className="text-sm font-bold text-gray-400">All caught up!</p>
                                    <p className="text-xs text-gray-300 mt-1">No pending leave requests</p>
                                </div>
                            ) : (
                                pendingLeaves.slice(0, 3).map((req) => (
                                    <div
                                        key={req.id}
                                        className={`flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all duration-500 ${
                                            req.status === 'approved' ? 'bg-green-50 border-green-200 opacity-50 scale-95' :
                                            req.status === 'rejected' ? 'bg-red-50 border-red-200 opacity-50 scale-95' : ''
                                        }`}
                                    >
                                        <div>
                                            <p className="font-bold text-[#1a1b4b]">{req.name}</p>
                                            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">{req.type} • {req.duration}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {req.status === 'pending' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleReject(req.id)}
                                                        disabled={processingId === req.id}
                                                        className="px-4 py-2 bg-[#ef4444] text-white text-xs font-bold rounded-lg uppercase tracking-wider hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {processingId === req.id ? '...' : 'Reject'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(req.id)}
                                                        disabled={processingId === req.id}
                                                        className="px-4 py-2 bg-green-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {processingId === req.id ? '...' : 'Approve'}
                                                    </button>
                                                </>
                                            ) : (
                                                <span className={`text-xs font-black uppercase tracking-widest ${
                                                    req.status === 'approved' ? 'text-green-500' : 'text-red-500'
                                                }`}>
                                                    {req.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            {pendingLeaves.length > 3 && (
                                <Link to="/approvals" className="block text-center text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline pt-2">
                                    +{pendingLeaves.length - 3} more pending
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Upcoming Meetings */}
                <div className="bg-white rounded-3xl p-8 border border-[var(--color-border-light)] shadow-sm h-full flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight">Upcoming Meetings</h2>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1b4b] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#2a2b6b] transition-colors"
                            >
                                <Plus size={13} strokeWidth={3} /> New Meet
                            </button>
                            <Link
                                to="/meetings"
                                className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#1a1b4b] uppercase tracking-widest hover:opacity-70 transition-opacity"
                            >
                                See All <ArrowRight size={13} strokeWidth={3} />
                            </Link>
                        </div>
                    </div>
                    {next ? (
                        <div className="flex-1 flex flex-col">
                            <MeetingCard m={next} className="flex-1" />
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                                    <Clock size={24} className="text-blue-400" strokeWidth={2.5} />
                                </div>
                                <p className="text-sm font-bold text-gray-400">No upcoming meetings</p>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline mt-2"
                                >
                                    Schedule one now
                                </button>
                            </div>
                        </div>
                    )}
                    {meetingsList.length > 1 && (
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4 text-center">
                            {meetingsList.length - 1} more meeting{meetingsList.length - 1 !== 1 ? 's' : ''} scheduled
                        </p>
                    )}
                </div>
            </div>

            {/* Create Meeting Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-gray-100 relative animate-scale-in" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-[#1a1b4b] transition-colors">
                            <X size={20} strokeWidth={2.5} />
                        </button>

                        <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight mb-1">Create New Meeting</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-6">Fill in the details below</p>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Date</label>
                                <input type="date" name="date" value={newMeet.date} onChange={handleChange} required
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]/20 focus:border-[#1a1b4b]/40 transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Start Time</label>
                                    <input type="time" name="startTime" value={newMeet.startTime} onChange={handleChange} required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]/20 focus:border-[#1a1b4b]/40 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">End Time</label>
                                    <input type="time" name="endTime" value={newMeet.endTime} onChange={handleChange} required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]/20 focus:border-[#1a1b4b]/40 transition-all" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Agenda</label>
                                <input type="text" name="agenda" value={newMeet.agenda} onChange={handleChange} required placeholder="e.g. Mid-Semester Review"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]/20 focus:border-[#1a1b4b]/40 transition-all" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Location</label>
                                <input type="text" name="location" value={newMeet.location} onChange={handleChange} required placeholder="e.g. Conference Room 3"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]/20 focus:border-[#1a1b4b]/40 transition-all" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Organized By</label>
                                <input type="text" name="organizedBy" value={newMeet.organizedBy} onChange={handleChange} required placeholder="e.g. Dr. Meera Joshi"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]/20 focus:border-[#1a1b4b]/40 transition-all" />
                            </div>

                            <button type="submit"
                                className="w-full mt-2 py-3 bg-[#1a1b4b] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#2a2b6b] transition-colors">
                                Create Meeting
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-slide-in { animation: slideIn 0.3s ease-out; }
                .animate-scale-in { animation: scaleIn 0.2s ease-out; }
            `}</style>
        </div>
    );
};

export default HODDashboard;
