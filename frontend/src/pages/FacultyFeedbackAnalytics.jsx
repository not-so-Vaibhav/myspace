import { useState, useEffect } from 'react';
import { 
    MessageSquare, 
    Search, 
    Filter, 
    PieChart, 
    Users, 
    BookOpen, 
    ChevronRight, 
    ArrowLeft,
    Download,
    Star,
    Loader2,
    Calendar,
    MessageCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const QUESTIONS = [
    "Explain the subject in simple language",
    "Conducts lectures regularly, and sincerely and insists on discipline.",
    "Use appropriate teaching aids to enhance understanding and learning capacity.",
    "Takes sufficient effort to simplify difficult problems/concepts.",
    "Give inputs for the content beyond the syllabus related to the subject.",
    "Provide adequate course material (like Book references, notes etc.)",
    "Use diverse assessment techniques (such as case study assignments, competitions, presentations, etc.) to foster student achievement and enhance their skills and competencies.",
    "Conduct the periodic assessment based on student understanding of course content and achieving course objectives.",
    "Interactive, Caring, Approachable and having a mentor attitude.",
    "Is the content of the subject/course sufficient to gain the fundamentals and conceptual knowledge from a lifelong perspective?"
];

const FacultyFeedbackAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [activeCourse, setActiveCourse] = useState(null); 
    const [summaryData, setSummaryData] = useState([]);
    const [responses, setResponses] = useState([]); 
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchRealData();
    }, []);

    const fetchRealData = async () => {
        setLoading(true);
        try {
            // 1. Fetch all allocations that have feedback
            const { data: rawFeedback, error } = await supabase
                .from('faculty_feedback')
                .select(`
                    id,
                    responses,
                    allocation:subject_allocations(
                        id,
                        subject:subjects(name, code),
                        faculty:profiles(full_name)
                    )
                `);

            if (error) throw error;

            // 2. Aggregate Data by Allocation
            const aggregation = {};
            rawFeedback.forEach(f => {
                const allocId = f.allocation.id;
                if (!aggregation[allocId]) {
                    aggregation[allocId] = {
                        id: allocId,
                        name: f.allocation.subject.name,
                        code: f.allocation.subject.code,
                        faculty: f.allocation.faculty.full_name,
                        responseCount: 0,
                        totalScore: 0, // Cumulative based on 'Very Satisfied' weight
                        responses: []
                    };
                }
                
                aggregation[allocId].responseCount += 1;
                
                // Simple Satisfaction Score Calc: 
                // Very Satisfied (4), Satisfied (3), Neutral (2), Not Satisfied (1)
                let rowScore = 0;
                Object.values(f.responses).forEach(val => {
                    if (val === 'Very Satisfied') rowScore += 4;
                    else if (val === 'Satisfied') rowScore += 3;
                    else if (val === 'Neutral') rowScore += 2;
                    else if (val === 'Not Satisfied') rowScore += 1;
                });
                
                aggregation[allocId].totalScore += (rowScore / (QUESTIONS.length * 4)) * 100;
            });

            const summary = Object.values(aggregation).map(s => ({
                ...s,
                avgSatisfaction: Math.round(s.totalScore / s.responseCount) + '%',
                trend: Math.round(s.totalScore / s.responseCount) > 80 ? 'positive' : 'neutral'
            }));

            setSummaryData(summary);
        } catch (error) {
            console.error('Analytics Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDetail = async (courseId) => {
        setLoading(true);
        const course = summaryData.find(s => s.id === courseId);
        setActiveCourse(course);
        try {
            const { data, error } = await supabase
                .from('faculty_feedback')
                .select('*')
                .eq('allocation_id', courseId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setResponses(data);
        } catch (error) {
            console.error('Detail Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSummary = summaryData.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.faculty.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && !activeCourse) return (
        <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[#1a1b4b]" size={40} />
            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Aggregating Institutional Feedback...</p>
        </div>
    );

    if (activeCourse) {
        return (
            <div className="p-6 sm:p-8 space-y-8 bg-[#fcfdfe] min-h-screen">
                <button 
                    onClick={() => setActiveCourse(null)}
                    className="flex items-center gap-2 text-[12px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-all group"
                >
                    <ArrowLeft size={16} /> Back to Audit Summary
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-sm animate-in fade-in duration-500">
                    <div>
                        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
                            {activeCourse.name} Audit
                        </h1>
                        <p className="text-gray-400 font-bold text-[12px] tracking-widest uppercase mt-1">
                            LOGGED FOR {activeCourse.faculty} • {activeCourse.avgSatisfaction} SATISFACTION INDEX
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                             <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest leading-none">Response Volume</p>
                             <p className="text-2xl font-black text-[#1a1b4b] tracking-tighter tabular-nums">{activeCourse.responseCount}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {responses.length > 0 ? responses.map((res, i) => (
                        <div key={res.id} className="bg-white rounded-[2.5rem] p-10 border-2 border-slate-50 shadow-sm space-y-8 hover:border-[#1a1b4b]/10 transition-colors">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#1a1b4b] font-black text-sm">
                                        VCR-{i+1} 
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-black text-[#1a1b4b] uppercase tracking-tight">Verified Student Response</p>
                                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Calendar size={12} /> Logged: {new Date(res.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[12px] font-black uppercase tracking-widest">Master Audit Log</span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6">
                                {QUESTIONS.map((q, qIdx) => (
                                    <div key={qIdx} className="flex justify-between items-start gap-6">
                                        <p className="text-[14px] font-bold text-slate-500 leading-tight flex-1">{q}</p>
                                        <span className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-[12px] font-black uppercase tracking-widest ${
                                            res.responses[qIdx] === 'Very Satisfied' ? 'bg-emerald-50 text-emerald-600' :
                                            res.responses[qIdx] === 'Satisfied' ? 'bg-blue-50 text-blue-600' :
                                            res.responses[qIdx] === 'Neutral' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                        }`}>
                                            {res.responses[qIdx]}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {res.remarks && (
                                <div className="pt-8 border-t border-slate-100">
                                    <p className="text-[14px] font-black text-gray-400 uppercase tracking-widest mb-4">Qualitative Remarks</p>
                                    <div className="p-8 bg-slate-50 rounded-2xl text-[16px] font-bold text-slate-600 italic leading-relaxed border border-slate-100 shadow-inner">
                                        "{res.remarks}"
                                    </div>
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="text-center p-20 bg-white rounded-[3rem] border-2 border-slate-50 flex flex-col items-center gap-4">
                            <MessageCircle className="text-slate-100" size={64} />
                            <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No detailed logs found for this vector.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 sm:p-8 space-y-10 bg-[#fcfdfe] min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <PieChart size={32} className="text-[#ef4444]" /> Faculty Feedback Analytics
                    </h1>
                    <p className="text-gray-400 font-bold text-[12px] tracking-[0.3em] uppercase mt-1">Institutional Audit Hub • Live Student Data</p>
                </div>
                <div className="flex gap-4">
                    <button className="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl flex items-center gap-3 text-[12px] font-black uppercase tracking-widest text-[#1a1b4b] outline-none">
                        <Filter size={16} /> Filters
                    </button>
                    <button onClick={fetchRealData} className="px-6 py-3 bg-[#1a1b4b] text-white rounded-2xl text-[12px] font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-[#1a1b4b]/20">
                         Refresh Logs
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: 'Network Quality Index', value: summaryData.length > 0 ? Math.round(summaryData.reduce((acc, s) => acc + parseInt(s.avgSatisfaction), 0) / summaryData.length) + '%' : '0%', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Active Reviews', value: summaryData.reduce((acc, s) => acc + s.responseCount, 0), icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Participating Nodes', value: summaryData.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4 transition-transform hover:scale-[1.02]">
                        <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-4xl font-black text-[#1a1b4b] tracking-tighter tabular-nums">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                        type="text" 
                        placeholder="SEARCH BY COURSE OR FACULTY..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border-2 border-slate-50 rounded-2xl py-4 pl-14 pr-6 text-[12px] font-black tracking-widest outline-none focus:border-[#1a1b4b]/20 transition-all uppercase placeholder:text-gray-200 shadow-sm"
                    />
                </div>

                {summaryData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredSummary.map(course => (
                            <div key={course.id} className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-50 shadow-sm hover:shadow-xl hover:shadow-[#1a1b4b]/5 transition-all group cursor-pointer" onClick={() => fetchDetail(course.id)}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-[#1a1b4b] transition-colors shadow-inner">
                                        <BookOpen size={24} />
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-widest ${
                                        course.trend === 'positive' ? 'bg-emerald-50 text-emerald-600' :
                                        course.trend === 'neutral' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                                    }`}>
                                        {course.avgSatisfaction} Score
                                    </span>
                                </div>
                                
                                <div className="space-y-1">
                                    <h3 className="text-[20px] font-black text-[#1a1b4b] uppercase tracking-tighter leading-tight">{course.name}</h3>
                                    <p className="text-[14px] font-black text-gray-400 uppercase tracking-widest">{course.faculty} • {course.code}</p>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-gray-300" />
                                        <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">{course.responseCount} Responses</span>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-[#1a1b4b] group-hover:text-white transition-all shadow-sm">
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-slate-50 space-y-4">
                        <PieChart size={48} className="text-slate-100 mx-auto" />
                        <p className="text-xs font-black text-gray-300 uppercase tracking-widest uppercase">Awaiting initial student data vectors...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacultyFeedbackAnalytics;
