import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    ArrowLeft, 
    Users, 
    BookOpen, 
    Calendar, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    FileText,
    TrendingUp,
    ShieldCheck,
    Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AllocationAudit = () => {
    const { id } = useParams(); // Allocation UUID
    const [loading, setLoading] = useState(true);
    const [allocation, setAllocation] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [activeTab, setActiveTab] = useState('attendance');

    useEffect(() => {
        fetchAuditData();
    }, [id]);

    const fetchAuditData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Allocation Details
            const { data: alloc, error: allocError } = await supabase
                .from('subject_allocations')
                .select(`
                    id,
                    subject:subjects(name, code, credits, type),
                    faculty:profiles(full_name, role),
                    batch:batches(name),
                    semester:semesters(term_number)
                `)
                .eq('id', id)
                .single();

            if (allocError) throw allocError;
            setAllocation(alloc);

            // 2. Fetch Enrolled Students
            const { data: enrolled, error: enrollError } = await supabase
                .from('student_enrollments')
                .select(`
                    id,
                    student:profiles(full_name, role, id)
                `)
                .eq('allocation_id', id);

            if (enrollError) throw enrollError;
            setEnrollments(enrolled);

            // 3. Fetch Attendance Sessions & Records
            const { data: attSessions, error: sessError } = await supabase
                .from('attendance_sessions')
                .select(`
                    id,
                    session_date,
                    session_time,
                    topic
                `)
                .eq('allocation_id', id)
                .order('session_date', { ascending: false });

            if (sessError) throw sessError;
            
            // Get records for these sessions
            const sessionIds = attSessions.map(s => s.id);
            const { data: attRecords } = await supabase
                .from('attendance_records')
                .select('session_id, status')
                .in('session_id', sessionIds);

            const sessionsWithCounts = attSessions.map(s => {
                const recs = (attRecords || []).filter(r => r.session_id === s.id);
                return {
                    ...s,
                    present: recs.filter(r => r.status === 'present').length,
                    total: recs.length
                };
            });

            setSessions(sessionsWithCounts);

        } catch (error) {
            console.error('Audit Fetch Error:', error);
        }
        setLoading(false);
    };

    if (loading) return (
        <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[#1a1b4b]" size={40} />
            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Master Audit in Progress...</p>
        </div>
    );

    if (!allocation) return (
        <div className="p-20 text-center">
            <p className="text-red-500 font-black uppercase tracking-widest">Invalid Allocation Link</p>
            <Link to="/reports" className="text-[#1a1b4b] text-[12px] font-black uppercase underline mt-4 block">Return to Terminal</Link>
        </div>
    );

    const totalPossible = sessions.length * enrollments.length;
    const totalPresent = sessions.reduce((acc, s) => acc + s.present, 0);
    const avgAttendance = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

    return (
        <div className="p-8 sm:p-12 space-y-12 bg-[#fcfdfe] min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col space-y-6">
                <Link to="/reports" className="inline-flex items-center gap-2 text-[12px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-all group w-fit">
                    <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-[#1a1b4b] group-hover:text-white transition-colors">
                        <ArrowLeft size={14} strokeWidth={3} />
                    </div>
                    Back to Reports
                </Link>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-4">
                            Audit: {allocation.subject?.name}
                            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[12px] border border-emerald-100 rounded-lg flex items-center gap-2">
                                <ShieldCheck size={14} /> Verified Record
                            </div>
                        </h1>
                        <p className="text-gray-400 font-bold text-[12px] tracking-[0.2em] uppercase mt-1">
                            {allocation.subject?.code} • {allocation.batch?.name} • SEM {allocation.semester?.term_number}
                        </p>
                    </div>

                    <div className="flex p-1.5 bg-gray-100/50 rounded-[1.25rem] border border-gray-100">
                        {['attendance', 'students'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === tab
                                        ? 'bg-white text-[#1a1b4b] shadow-md'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-50 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-50 text-[#1a1b4b] rounded-2xl">
                            <TrendingUp size={20} />
                        </div>
                        <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Average Compliance</h3>
                    </div>
                    <p className="text-4xl font-black text-[#1a1b4b] tracking-tighter">{avgAttendance}%</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-50 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Users size={20} />
                        </div>
                        <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Enrolled Size</h3>
                    </div>
                    <p className="text-4xl font-black text-[#1a1b4b] tracking-tighter">{enrollments.length}</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-50 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <Clock size={20} />
                        </div>
                        <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Total Sessions</h3>
                    </div>
                    <p className="text-4xl font-black text-[#1a1b4b] tracking-tighter">{sessions.length}</p>
                </div>
            </div>

            {/* Active Table View */}
            <div className="bg-white rounded-[3rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                {activeTab === 'attendance' ? (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-10 py-6 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest">Session Date</th>
                                <th className="px-10 py-6 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest">Module/Topic</th>
                                <th className="px-10 py-6 text-center text-[12px] font-black text-gray-400 uppercase tracking-widest">Presence</th>
                                <th className="px-10 py-6 text-right text-[12px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sessions.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <Calendar size={16} className="text-gray-300" />
                                            <span className="text-sm font-black text-[#1a1b4b]">{new Date(s.session_date).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <p className="text-sm font-bold text-slate-600">{s.topic || 'Regular Session'}</p>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <span className="text-sm font-black text-[#1a1b4b]">{s.present} / {enrollments.length}</span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[12px] font-black uppercase rounded-md">Log Verified</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-10 py-6 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest">Enrollment ID</th>
                                <th className="px-10 py-6 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest">Student Name</th>
                                <th className="px-10 py-6 text-right text-[12px] font-black text-gray-400 uppercase tracking-widest">Identity Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {enrollments.map(e => (
                                <tr key={e.id} className="hover:bg-slate-50/50 transition-all">
                                    <td className="px-10 py-6">
                                        <code className="text-[12px] font-black text-gray-300">{e.id.slice(0, 8)}</code>
                                    </td>
                                    <td className="px-10 py-6">
                                        <span className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">{e.student?.full_name}</span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[12px] font-black uppercase rounded-md">Authorized</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AllocationAudit;
