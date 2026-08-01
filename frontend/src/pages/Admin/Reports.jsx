import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    FileText, 
    Download, 
    Filter, 
    ChevronRight, 
    Users, 
    BookOpen, 
    TrendingUp, 
    Search,
    Loader2,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    UserCheck,
    Briefcase
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const Reports = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [coursesData, setCoursesData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        totalEnrollments: 0,
        avgAttendance: 0,
        activeCourses: 0,
        facultyCount: 0
    });

    useEffect(() => {
        fetchReportData();
    }, []);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            // 1. Fetch all subject allocations with related info
            const { data: allocations, error: allocError } = await supabase
                .from('subject_allocations')
                .select(`
                    id,
                    subject_id,
                    faculty_id,
                    batch_id,
                    subjects:subject_id(name, code),
                    faculty:faculty_id(full_name, role),
                    batches:batch_id(name)
                `);

            if (allocError) throw allocError;

            // 2. Fetch session and record counts for attendance calculation
            const { data: sessions, error: sessionError } = await supabase
                .from('attendance_sessions')
                .select('id, allocation_id');
            
            if (sessionError) throw sessionError;

            const { data: records, error: recordError } = await supabase
                .from('attendance_records')
                .select('session_id, status');

            if (recordError) throw recordError;

            // 3. Fetch enrollment counts
            const { data: enrollments, error: enrollError } = await supabase
                .from('student_enrollments')
                .select('allocation_id');

            if (enrollError) throw enrollError;

            // 4. Process data
            const processed = allocations.map(alloc => {
                const allocSessions = sessions.filter(s => s.allocation_id === alloc.id);
                const sessionIds = allocSessions.map(s => s.id);
                const allocRecords = records.filter(r => sessionIds.includes(r.session_id));
                const allocEnrollments = enrollments.filter(e => e.allocation_id === alloc.id).length;

                const totalPossible = allocSessions.length * allocEnrollments;
                const totalPresent = allocRecords.filter(r => r.status === 'present').length;
                const avgAttendance = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

                return {
                    id: alloc.id,
                    name: alloc.subjects?.name || 'N/A',
                    code: alloc.subjects?.code || 'N/A',
                    facultyName: alloc.faculty?.full_name || 'Unassigned',
                    batch: alloc.batches?.name || 'N/A',
                    enrollmentCount: allocEnrollments,
                    avgAttendance: avgAttendance,
                    sessionCount: allocSessions.length
                };
            });

            setCoursesData(processed);

            // Calculate overall stats
            const totalE = processed.reduce((acc, curr) => acc + curr.enrollmentCount, 0);
            const totalA = processed.reduce((acc, curr) => acc + curr.avgAttendance, 0) / (processed.length || 1);
            const uniqueFaculty = new Set(allocations.map(a => a.faculty_id)).size;

            setStats({
                totalEnrollments: totalE,
                avgAttendance: Math.round(totalA),
                activeCourses: processed.length,
                facultyCount: uniqueFaculty
            });

        } catch (error) {
            console.error('Error fetching report data:', error);
        }
        setLoading(false);
    };

    const filteredData = coursesData.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.facultyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportToCSV = () => {
        if (filteredData.length === 0) return;

        const headers = ['Course Name', 'Course Code', 'Batch', 'Faculty', 'Enrollments', 'Avg Attendance (%)'];
        const rows = filteredData.map(course => [
            course.name,
            course.code,
            course.batch,
            course.facultyName,
            course.enrollmentCount,
            course.avgAttendance
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `University_Academic_Report_${new Date().toLocaleDateString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-8 sm:p-12 space-y-12 bg-[#fcfdfe] min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <FileText size={40} className="text-[#ef4444]" /> Academic Reports
                    </h1>
                    <p className="text-gray-400 font-bold text-[12px] tracking-[0.3em] uppercase mt-1">Data-Driven University Governance Hub • Live Metrics</p>
                </div>
                
                <div className="flex gap-4">
                    <button 
                        onClick={exportToCSV}
                        className="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl flex items-center gap-3 text-[12px] font-black uppercase tracking-widest text-[#1a1b4b] hover:border-[#1a1b4b]/20 hover:shadow-xl hover:shadow-[#1a1b4b]/5 transition-all outline-none"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                    <button className="px-6 py-3 bg-[#1a1b4b] text-white rounded-2xl flex items-center gap-3 text-[12px] font-black uppercase tracking-widest shadow-xl shadow-[#1a1b4b]/20 hover:bg-[#ef4444] transition-all outline-none">
                        <TrendingUp size={16} /> Strategy Mode
                    </button>
                </div>
            </div>

            {/* Metric KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { label: 'Active Courses', value: stats.activeCourses, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Avg Attendance', value: `${stats.avgAttendance}%`, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Total Enrolled', value: stats.totalEnrollments, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Active Faculty', value: stats.facultyCount, icon: Briefcase, color: 'text-[#1a1b4b]', bg: 'bg-indigo-50' },
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all group overflow-hidden relative">
                         <div className="flex justify-between items-start mb-6">
                            <div className={`p-4 rounded-2xl ${kpi.bg} ${kpi.color} shadow-inner`}>
                                <kpi.icon size={24} />
                            </div>
                            <div className="text-right">
                                <span className="flex items-center gap-1 text-[12px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <ArrowUpRight size={10} /> +2.4%
                                </span>
                            </div>
                         </div>
                         <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">{kpi.label}</h3>
                         <p className="text-4xl font-black text-[#1a1b4b] tracking-tighter">{kpi.value}</p>
                         <div className="absolute -bottom-1 -right-1 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                    </div>
                ))}
            </div>

            {/* Course Intelligence Table */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input 
                            type="text" 
                            placeholder="SEARCH COURSE, CODE, OR FACULTY..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-[12px] font-black tracking-widest outline-none focus:bg-white focus:border-[#1a1b4b]/20 transition-all uppercase placeholder:text-gray-300"
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button className="flex-1 md:flex-none px-6 py-4 bg-slate-50 text-gray-400 rounded-2xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:text-[#1a1b4b] transition-colors border border-transparent hover:border-slate-200">
                            <Filter size={16} /> Filters
                        </button>
                        <button className="flex-1 md:flex-none px-6 py-4 bg-slate-50 text-gray-400 rounded-2xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:text-[#1a1b4b] transition-colors border border-transparent hover:border-slate-200">
                             <Calendar size={16} /> 2024-25
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] border-2 border-slate-50 overflow-hidden shadow-sm shadow-slate-100/50">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-10 py-6 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Course Index</th>
                                    <th className="px-10 py-6 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Assigned Faculty</th>
                                    <th className="px-10 py-6 text-center text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Enrollments</th>
                                    <th className="px-10 py-6 text-center text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Attendance</th>
                                    <th className="px-10 py-6 text-right text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Performance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-10 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 className="animate-spin text-[#1a1b4b]" size={32} />
                                                <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest">Aggregating Institutional Data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-10 py-32 text-center text-[12px] font-black text-gray-300 uppercase italic">
                                            No archival records detected for the current filter
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((course) => (
                                        <tr key={course.id} className="hover:bg-slate-50/50 transition-all group">
                                            <td className="px-10 py-8">
                                                <div className="flex flex-col">
                                                    <p className="text-[16px] font-black text-[#1a1b4b] tracking-tight">{course.name}</p>
                                                    <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{course.code} • {course.batch}</p>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 font-black text-xs border border-indigo-100">
                                                        {course.facultyName.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-600">{course.facultyName}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-center">
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-xl">
                                                    <Users size={14} className="text-gray-400" />
                                                    <span className="text-sm font-black text-[#1a1b4b]">{course.enrollmentCount}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className={`text-sm font-black ${
                                                        course.avgAttendance >= 85 ? 'text-emerald-500' :
                                                        course.avgAttendance >= 75 ? 'text-amber-500' : 'text-red-500'
                                                    }`}>{course.avgAttendance}%</span>
                                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                        <div 
                                                            className={`h-full transition-all duration-1000 ${
                                                                course.avgAttendance >= 85 ? 'bg-emerald-500' :
                                                                course.avgAttendance >= 75 ? 'bg-amber-500' : 'bg-red-500'
                                                            }`}
                                                            style={{ width: `${course.avgAttendance}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <Link 
                                                    to={`/audit/allocation/${course.id}`}
                                                    className="flex items-center justify-end gap-3 hover:translate-x-2 transition-transform cursor-pointer group/action"
                                                >
                                                    <span className="text-[12px] font-black uppercase text-[#1a1b4b] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Full Audit</span>
                                                    <div className="p-2.5 bg-gray-50 rounded-xl group-hover/action:bg-[#1a1b4b] group-hover/action:text-white transition-colors">
                                                        <ChevronRight size={18} />
                                                    </div>
                                                </Link>
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
    );
};

export default Reports;
