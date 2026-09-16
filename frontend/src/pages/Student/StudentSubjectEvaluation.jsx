import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchStudentEvaluations } from '../../services/evaluationService';
import {
    Award,
    BookOpen,
    Percent,
    CheckCircle2,
    XCircle,
    Clock,
    UserCheck,
    Layers,
    TrendingUp,
    RefreshCw,
    Sparkles,
    Calendar,
    GraduationCap,
    FileSpreadsheet,
    Printer
} from 'lucide-react';

const StudentSubjectEvaluation = () => {
    const { profile, user } = useAuth();
    const studentId = profile?.id || user?.id;

    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('ALL'); // 'ALL' | 'THEORY' | 'PRACTICAL'

    useEffect(() => {
        if (!studentId) return;
        loadData();
    }, [studentId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchStudentEvaluations(studentId);
            setEvaluations(data || []);
        } catch (err) {
            console.error('Failed to load student evaluations:', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = evaluations.filter(ev => {
        if (selectedTab === 'THEORY') return !ev.is_practical;
        if (selectedTab === 'PRACTICAL') return ev.is_practical;
        return true;
    });

    const totalSubjects = evaluations.length;
    const gradedCount = evaluations.filter(e => e.has_evaluation && e.total_marks !== null).length;
    const overallTotalMarks = evaluations.reduce((acc, e) => acc + (e.total_marks || 0), 0);
    const avgScore = gradedCount > 0 ? (overallTotalMarks / gradedCount).toFixed(1) : '—';
    const totalCredits = evaluations.reduce((acc, e) => acc + (e.credits || 0), 0);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-indigo-50/70 via-transparent to-transparent rounded-full pointer-events-none -mr-20 -mt-20" />
                
                <div className="space-y-2 z-10">
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest">
                        <GraduationCap className="w-4 h-4" />
                        <span>Continuous Assessment & Subject Marks</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        My Subject Evaluations
                    </h1>
                    <p className="text-sm font-medium text-slate-500 max-w-2xl">
                        View continuous internal assessment scores (CA), Attendance marks, TA/PAB subunits, and End-Semester exam results for your registered courses.
                    </p>
                </div>

                <div className="z-10 flex items-center gap-3">
                    <button
                        onClick={loadData}
                        className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all flex items-center gap-2 font-bold text-xs"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                        <span>Refresh</span>
                    </button>

                    <button
                        onClick={() => window.print()}
                        className="px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl border border-indigo-200 transition-all flex items-center gap-2 font-bold text-xs shadow-sm"
                    >
                        <Printer className="w-4 h-4 text-indigo-600" />
                        <span>Print Report</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Courses</p>
                        <p className="text-xl font-black text-slate-900">{totalSubjects} <span className="text-xs font-semibold text-slate-400">Enrolled</span></p>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Evaluated</p>
                        <p className="text-xl font-black text-slate-900">{gradedCount} <span className="text-xs font-semibold text-slate-400">/ {totalSubjects}</span></p>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Score</p>
                        <p className="text-xl font-black text-slate-900">{avgScore} <span className="text-xs font-semibold text-slate-400">/ 100</span></p>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Credits</p>
                        <p className="text-xl font-black text-slate-900">{totalCredits} <span className="text-xs font-semibold text-slate-400">Total</span></p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                {['ALL', 'THEORY', 'PRACTICAL'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setSelectedTab(tab)}
                        className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                            selectedTab === tab
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200'
                        }`}
                    >
                        {tab === 'ALL' ? 'All Subjects' : tab === 'THEORY' ? 'Theory Subjects' : 'Practical / Lab Subjects'}
                    </button>
                ))}
            </div>

            {/* Evaluation Cards Grid */}
            {loading ? (
                <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="font-bold text-sm">Fetching your academic marks...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-100 shadow-sm space-y-3">
                    <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
                    <p className="font-black text-slate-700 text-base">No registered subjects in this view</p>
                    <p className="text-xs text-slate-400">Your enrolled courses and published marks will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filtered.map(ev => {
                        const isTheory = !ev.is_practical;
                        const subTag = isTheory ? 'TA' : 'PAB';
                        const examName = isTheory ? 'Theory Exam' : 'Practical Exam';
                        const attPct = ev.attendance_pct || 100;

                        return (
                            <div
                                key={ev.allocation_id}
                                className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-6 space-y-5 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all"
                            >
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                                {ev.subject_code}
                                            </span>
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                isTheory ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                            }`}>
                                                {ev.subject_type}
                                            </span>
                                            <span className="text-xs text-slate-400 font-semibold">• {ev.credits} Credits</span>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 mt-1.5">{ev.subject_name}</h3>
                                        <p className="text-xs text-slate-500 font-medium">Instructor: <strong className="text-slate-700">{ev.faculty_name}</strong> • {ev.batch_name}</p>
                                    </div>

                                    {/* Grade Badge */}
                                    {ev.has_evaluation && ev.total_marks !== null ? (
                                        <div className="text-right">
                                            <span className={`inline-block text-xl font-black px-3.5 py-1.5 rounded-2xl shadow-sm ${
                                                ev.grade === 'O' || ev.grade === 'A+' ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                                                ev.grade === 'A' || ev.grade === 'B+' ? 'bg-indigo-600 text-white shadow-indigo-600/20' :
                                                ev.grade === 'B' || ev.grade === 'C' ? 'bg-amber-500 text-white shadow-amber-500/20' :
                                                'bg-rose-500 text-white shadow-rose-500/20'
                                            }`}>
                                                {ev.grade || '—'}
                                            </span>
                                            <p className={`text-[10px] font-black uppercase mt-1 ${ev.is_pass ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                {ev.is_pass ? 'PASS' : 'FAIL'}
                                            </p>
                                        </div>
                                    ) : (
                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                                            In Progress
                                        </span>
                                    )}
                                </div>

                                {/* Live Attendance Snapshot */}
                                <div className="bg-slate-50/80 rounded-2xl p-3.5 flex items-center justify-between border border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                        <Clock className="w-4 h-4 text-cyan-600" />
                                        <span className="text-xs font-bold text-slate-700">Real System Attendance</span>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                                        attPct >= 75 ? 'bg-emerald-100 text-emerald-800' :
                                        attPct >= 60 ? 'bg-amber-100 text-amber-800' :
                                        'bg-rose-100 text-rose-800'
                                    }`}>
                                        {attPct}%
                                    </span>
                                </div>

                                {/* Detailed Marks Breakdown Grid */}
                                <div className="space-y-3">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Continuous Assessment (CA) Breakdown</p>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400">Attendance</p>
                                            <p className="text-sm font-black text-slate-800 mt-0.5">{ev.ca_attendance_marks ?? '—'}</p>
                                            <p className="text-[9px] text-slate-400">Max 5</p>
                                        </div>

                                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400">{subTag}-1</p>
                                            <p className="text-sm font-black text-slate-800 mt-0.5">{ev.ca_sub_1 ?? '—'}</p>
                                            <p className="text-[9px] text-slate-400">Max 10</p>
                                        </div>

                                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400">{subTag}-2</p>
                                            <p className="text-sm font-black text-slate-800 mt-0.5">{ev.ca_sub_2 ?? '—'}</p>
                                            <p className="text-[9px] text-slate-400">Max 10</p>
                                        </div>

                                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400">{subTag}-3</p>
                                            <p className="text-sm font-black text-slate-800 mt-0.5">{ev.ca_sub_3 ?? '—'}</p>
                                            <p className="text-[9px] text-slate-400">Max 15</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Totals Bar */}
                                <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/60">
                                        <p className="text-[10px] font-bold text-indigo-500 uppercase">CA Total</p>
                                        <p className="text-base font-black text-indigo-900 mt-0.5">{ev.ca_total ?? '—'} <span className="text-[10px] font-normal text-indigo-400">/ 40</span></p>
                                    </div>

                                    <div className="bg-purple-50/50 p-2.5 rounded-xl border border-purple-100/60">
                                        <p className="text-[10px] font-bold text-purple-500 uppercase">{examName}</p>
                                        <p className="text-base font-black text-purple-900 mt-0.5">{ev.exam_marks ?? '—'} <span className="text-[10px] font-normal text-purple-400">/ 60</span></p>
                                    </div>

                                    <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-md">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Grand Total</p>
                                        <p className="text-base font-black text-white mt-0.5">{ev.total_marks ?? '—'} <span className="text-[10px] font-normal text-slate-400">/ 100</span></p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentSubjectEvaluation;
