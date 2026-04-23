import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Users, BookOpen, Building2, Loader2, IndianRupee, Activity, GraduationCap, ChevronRight, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DeanDashboard = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        students: 0,
        faculty: 0,
        departments: 0,
        courses: 0,
        revenue: '₹14.2M', // Mocked as there is no transaction table yet
        growth: '+8.4%'
    });
    const [deptPerformance, setDeptPerformance] = useState([]);
    const [enrollmentData, setEnrollmentData] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Basic Counts
            const [
                { count: studentCount },
                { count: facultyCount },
                { count: deptCount },
                { count: courseCount }
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['instructor', 'hod', 'faculty']),
                supabase.from('departments').select('*', { count: 'exact', head: true }),
                supabase.from('courses').select('*', { count: 'exact', head: true })
            ]);

            setStats(prev => ({
                ...prev,
                students: studentCount || 0,
                faculty: facultyCount || 0,
                departments: deptCount || 0,
                courses: courseCount || 0
            }));

            // 2. Fetch Department Performance (Based on subject allocations/enrollments)
            const { data: depts } = await supabase.from('departments').select('id, name, code');
            if (depts) {
                const perf = depts.map(d => ({
                    name: d.name,
                    code: d.code,
                    value: Math.floor(Math.random() * (98 - 85 + 1)) + 85, // Mocked performance metric for now
                    status: 'Excellent'
                }));
                setDeptPerformance(perf);
            }

            // 3. Mock Enrollment Trends (Number of students per month or semester)
            setEnrollmentData([
                { month: 'Jan', count: 45 },
                { month: 'Feb', count: 52 },
                { month: 'Mar', count: 48 },
                { month: 'Apr', count: 70 },
                { month: 'May', count: 65 },
                { month: 'Jun', count: 85 },
            ]);

        } catch (error) {
            console.error('Error fetching dean stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#fcfdfe] space-y-4">
                <Loader2 className="w-10 h-10 text-[#1a1b4b] animate-spin" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse transition-all">Synchronizing University Metrics...</p>
            </div>
        );
    }

    const cards = [
        { label: 'Enrolled Students', value: stats.students.toLocaleString(), icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+2.4%' },
        { label: 'Active Faculty', value: stats.faculty.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+1.2%' },
        { label: 'Departments', value: stats.departments.toLocaleString(), icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: 'Stable' },
        { label: 'Academic Courses', value: stats.courses.toLocaleString(), icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', trend: '+4.5%' },
    ];

    return (
        <div className="p-6 md:p-10 space-y-10 bg-[#fcfdfe] min-h-screen">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        Dean Dashboard
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2">
                        <Activity size={14} className="text-indigo-500" /> Administrative Governance & Strategy
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchData} className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:text-[#1a1b4b] hover:shadow-md transition-all">
                        Refresh Data
                    </button>
                    <div className="px-5 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20">
                        Session 2025-26
                    </div>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((stat, i) => (
                    <div key={i} className="bg-white p-7 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 group relative overflow-hidden">
                        <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${stat.bg} opacity-30 group-hover:scale-150 transition-transform duration-700`}></div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:rotate-12`}>
                                    <stat.icon size={22} strokeWidth={2.5} />
                                </div>
                                <span className="text-[12px] font-black bg-gray-50 text-gray-400 px-2 py-1 rounded-lg uppercase tracking-tight">{stat.trend}</span>
                            </div>
                            <div className="text-4xl font-black text-[#1a1b4b] tracking-tighter mb-1 select-none">
                                {stat.value}
                            </div>
                            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">
                                {stat.label}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Enrollment Trends Visualization */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <h2 className="text-2xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-2">
                             <TrendingUp className="text-emerald-500" size={24} /> Enrollment Trends
                        </h2>
                        <select className="bg-gray-50 border-none text-[12px] font-black uppercase tracking-widest px-4 py-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                            <option>Last 6 Months</option>
                            <option>Last Year</option>
                        </select>
                    </div>

                    <div className="h-64 flex items-end justify-between gap-4 relative z-10 lg:px-6">
                        {enrollmentData.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center group/bar">
                                <div className="w-full relative">
                                    <div 
                                        className="w-full bg-[#1a1b4b]/5 rounded-t-2xl absolute bottom-0" 
                                        style={{ height: '100px' }}
                                    ></div>
                                    <div 
                                        className="w-full bg-gradient-to-t from-[#1a1b4b] to-[#4f46e5] rounded-t-2xl relative transition-all duration-1000 ease-out group-hover/bar:brightness-125" 
                                        style={{ height: `${d.count}%` }}
                                    >
                                        <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1a1b4b] text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-xl transition-all duration-300 pointer-events-none">
                                            {d.count}%
                                        </div>
                                    </div>
                                </div>
                                <span className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover/bar:text-[#1a1b4b] transition-colors">{d.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Department Performance Panel */}
                <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group">
                     <h2 className="text-2xl font-black text-[#1a1b4b] uppercase tracking-tighter mb-8 flex items-center gap-2">
                         <BarChart3 className="text-amber-500" size={24} /> Dept Performance
                    </h2>
                    
                    <div className="space-y-6 flex-1">
                        {deptPerformance.length > 0 ? deptPerformance.map((dept, i) => (
                            <div key={i} className="space-y-2 group/item">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs font-black text-[#1a1b4b] uppercase tracking-tight">{dept.name}</p>
                                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{dept.code}</p>
                                    </div>
                                    <span className="text-[12px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase">Excellent</span>
                                </div>
                                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-[#1a1b4b] transition-all duration-1000 ease-out group-hover/item:bg-indigo-500" 
                                        style={{ width: `${dept.value}%` }}
                                    ></div>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
                                <Building2 size={48} strokeWidth={1} className="mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">No Dept Data Available</p>
                            </div>
                        )}
                    </div>

                    <Link to="/reports" className="w-full mt-8 py-4 border-2 border-gray-50 rounded-2xl text-[12px] font-black uppercase tracking-widest text-gray-400 hover:bg-indigo-50 hover:text-[#1a1b4b] transition-all flex items-center justify-center gap-2 group-hover:border-indigo-100/50">
                        Detailed Reports <ChevronRight size={14} />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DeanDashboard;
