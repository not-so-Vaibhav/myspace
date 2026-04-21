import { useState, useEffect } from 'react';
import { CalendarCheck, FileText, Calendar, Folder } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudentAttendance } from '../../hooks/useStudentAttendance';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// Import schedule data to calculate "Classes Today"
// Note: We use the structure from ScheduleCard to stay consistent
const allSchedule = {
    Monday: { slots: [{}, {}, {}, {}, {}, {}] },
    Tuesday: { slots: [{}, {}, {}, {}] },
    Wednesday: { slots: [{}, {}, {}, {}, {}, {}] },
    Thursday: { slots: [{}, {}, {}, {}, {}, {}] },
    Friday: { slots: [{}, {}, {}, {}, {}] },
    Saturday: { slots: [{}, {}, {}] },
};

const QuickAccess = () => {
    const { profile } = useAuth();
    const { overallPct, loading: attendanceLoading } = useStudentAttendance();
    const [counts, setCounts] = useState({
        pendingAssignments: 0,
        resourceFiles: 0,
        classesToday: 0
    });
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        if (!profile?.id) return;

        const fetchQuickStats = async () => {
            try {
                // 1. Fetch Assignments Count
                const { data: enrollments } = await supabase
                    .from('student_enrollments')
                    .select('allocation_id');

                const allocIds = enrollments?.map(e => e.allocation_id) || [];

                if (allocIds.length > 0) {
                    // Total Assignments
                    const { data: assignments } = await supabase
                        .from('course_materials')
                        .select('id')
                        .in('allocation_id', allocIds)
                        .eq('type', 'Assignment');

                    // Total Submissions
                    const { data: submissions } = await supabase
                        .from('student_submissions')
                        .select('material_id')
                        .eq('student_id', profile.id);

                    const submissionIds = new Set(submissions?.map(s => s.material_id) || []);
                    const pendingCount = (assignments?.filter(a => !submissionIds.has(a.id)).length) || 0;

                    // Resource Files (Notes, References, etc.)
                    const { count: resourceCount } = await supabase
                        .from('course_materials')
                        .select('id', { count: 'exact', head: true })
                        .in('allocation_id', allocIds)
                        .neq('type', 'Assignment');

                    // 2. Classes Today
                    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                    const todayClasses = allSchedule[today]?.slots?.length || 0;

                    setCounts({
                        pendingAssignments: pendingCount,
                        resourceFiles: resourceCount || 0,
                        classesToday: todayClasses
                    });
                }
            } catch (err) {
                console.error("Error fetching quick access stats:", err);
            } finally {
                setStatsLoading(false);
            }
        };

        fetchQuickStats();
    }, [profile?.id]);

    const cards = [
        { 
            name: 'Attendance', 
            icon: CalendarCheck, 
            stats: attendanceLoading ? '--' : `${overallPct}% Present`, 
            to: '/attendance', 
            accent: '#1a1b4b', 
            bg: 'bg-indigo-50' 
        },
        { 
            name: 'Assignments', 
            icon: FileText, 
            stats: statsLoading ? '--' : `${counts.pendingAssignments} Pending`, 
            to: '/assignments', 
            accent: '#ef4444', 
            bg: 'bg-red-50' 
        },
        { 
            name: 'Schedule', 
            icon: Calendar, 
            stats: statsLoading ? '--' : `${counts.classesToday} Classes Today`, 
            to: '/schedule', 
            accent: '#f59e0b', 
            bg: 'bg-amber-50' 
        },
        { 
            name: 'Resources', 
            icon: Folder, 
            stats: statsLoading ? '--' : `${counts.resourceFiles} Files`, 
            to: '/resources', 
            accent: '#10b981', 
            bg: 'bg-emerald-50' 
        },
    ];

    return (
        <section>
            <h2 className="text-[var(--color-text)] font-bold mb-5 uppercase tracking-tighter text-sm opacity-40">Quick Access</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <Link
                            key={idx}
                            to={card.to}
                            className="bg-white border border-[#1a1b4b]/5 p-6 shadow-[var(--shadow-card)] relative cursor-pointer hover:-translate-y-2 transition-all flex flex-col justify-between h-52 group rounded-2xl hover:shadow-xl"
                        >
                            <div className="flex justify-center w-full pt-2">
                                <div className={`w-16 h-16 ${card.bg} flex items-center justify-center rounded-2xl shadow-inner group-hover:scale-110 transition-transform`}>
                                    <Icon size={26} style={{ color: card.accent }} />
                                </div>
                            </div>
                            <div className="mt-auto pl-2">
                                <h3 className="font-black text-xl tracking-tight leading-none mb-1 text-[#1a1b4b]">{card.name}</h3>
                                <div className="flex justify-between items-center text-[12px] font-black text-gray-400 tracking-widest uppercase mt-1">
                                    <span>{card.stats}</span>
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#1a1b4b]">→</span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
};

export default QuickAccess;
