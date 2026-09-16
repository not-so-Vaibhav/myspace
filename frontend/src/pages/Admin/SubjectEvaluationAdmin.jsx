import React, { useState, useEffect, useMemo } from 'react';
import {
    fetchAdminEvaluations,
    fetchEvaluationSheet,
    exportToExcel,
    exportToCsv
} from '../../services/evaluationService';
import {
    FileSpreadsheet,
    Download,
    Search,
    RefreshCw,
    Filter,
    Users,
    Percent,
    Award,
    CheckCircle2,
    Lock,
    Unlock,
    Layers,
    Eye,
    ChevronRight,
    X,
    Building2,
    GraduationCap,
    TrendingUp
} from 'lucide-react';

const SubjectEvaluationAdmin = () => {
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'
    const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'Theory' | 'Practical'

    // Inspection Modal
    const [inspectAllocId, setInspectAllocId] = useState(null);
    const [inspectData, setInspectData] = useState(null);
    const [inspectLoading, setInspectLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchAdminEvaluations();
            setAllocations(data || []);
        } catch (err) {
            console.error('Failed to load admin evaluations:', err);
        } finally {
            setLoading(false);
        }
    };

    // Open Inspect Modal
    const handleInspect = async (allocId) => {
        setInspectAllocId(allocId);
        setInspectLoading(true);
        try {
            const data = await fetchEvaluationSheet(allocId);
            setInspectData(data);
        } catch (err) {
            console.error('Failed to inspect sheet:', err);
        } finally {
            setInspectLoading(false);
        }
    };

    // Filtered list
    const filteredAllocations = useMemo(() => {
        return allocations.filter(a => {
            const matchesSearch = !searchQuery.trim() ||
                (a.subject_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (a.subject_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (a.faculty_name || '').toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
            const matchesType = typeFilter === 'ALL' || (a.subject_type || 'Theory').toLowerCase() === typeFilter.toLowerCase();

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [allocations, searchQuery, statusFilter, typeFilter]);

    // Statistics
    const stats = useMemo(() => {
        const total = allocations.length;
        if (total === 0) return { total: 0, completed: 0, inProgress: 0, pending: 0, locked: 0, avgPass: 0 };

        const completed = allocations.filter(a => a.status === 'SUBMITTED' || a.status === 'COMPLETED').length;
        const inProgress = allocations.filter(a => a.status === 'IN_PROGRESS').length;
        const pending = allocations.filter(a => a.status === 'PENDING').length;
        const locked = allocations.filter(a => a.is_locked).length;

        const totalPassRate = allocations.reduce((acc, a) => acc + (a.pass_percentage || 0), 0);
        const avgPass = (totalPassRate / total).toFixed(1);

        return { total, completed, inProgress, pending, locked, avgPass };
    }, [allocations]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Title Banner */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest">
                        <Building2 className="w-4 h-4" />
                        <span>University-Wide Academic Administration</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Subject Evaluations Hub
                    </h1>
                    <p className="text-sm font-medium text-slate-500 max-w-2xl">
                        Monitor Continuous Assessment (CA) and End-Sem evaluation submissions, verify mark sheets, and audit grading across departments.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadData}
                        className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Allocations</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Completed</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{stats.completed}</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">In Progress</p>
                    <p className="text-2xl font-black text-indigo-700 mt-1">{stats.inProgress}</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Locked Sheets</p>
                    <p className="text-2xl font-black text-amber-700 mt-1">{stats.locked}</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm col-span-2 sm:col-span-1">
                    <p className="text-[11px] font-bold text-violet-600 uppercase tracking-wider">Avg Pass Rate</p>
                    <p className="text-2xl font-black text-violet-700 mt-1">{stats.avgPass}%</p>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                            type="text"
                            placeholder="Filter by subject, code, or faculty name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white text-slate-800 text-sm font-medium rounded-2xl pl-10 pr-4 py-2.5 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 border border-slate-200 outline-none"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="SUBMITTED">Completed / Submitted</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="PENDING">Not Started</option>
                        </select>

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="bg-white text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 border border-slate-200 outline-none"
                        >
                            <option value="ALL">All Course Types</option>
                            <option value="Theory">Theory Courses</option>
                            <option value="Practical">Practical Courses</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                            <p className="font-bold text-sm">Loading evaluations roster...</p>
                        </div>
                    ) : filteredAllocations.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 space-y-3">
                            <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300" />
                            <p className="font-bold text-base text-slate-600">No subject evaluations match your filters</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Subject</th>
                                    <th className="py-3 px-3">Type</th>
                                    <th className="py-3 px-4">Assigned Faculty</th>
                                    <th className="py-3 px-3">Batch & Term</th>
                                    <th className="py-3 px-3 text-center">Progress</th>
                                    <th className="py-3 px-3 text-center">Pass Rate</th>
                                    <th className="py-3 px-3 text-center">Lock Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAllocations.map(a => (
                                    <tr key={a.allocation_id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3.5 px-4 font-bold text-slate-800">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                                                    {a.subject_code}
                                                </span>
                                                <span className="truncate max-w-[220px]">{a.subject_name}</span>
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                (a.subject_type || '').toLowerCase() === 'practical'
                                                    ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-blue-50 text-blue-700'
                                            }`}>
                                                {a.subject_type}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-4 font-medium text-slate-700">
                                            {a.faculty_name}
                                        </td>

                                        <td className="py-3.5 px-3 font-semibold text-slate-500">
                                            {a.year_level} • Sem {a.semester_term} ({a.batch_name})
                                        </td>

                                        <td className="py-3.5 px-3 text-center">
                                            <div className="inline-flex items-center gap-1.5 font-bold">
                                                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-600 rounded-full transition-all"
                                                        style={{ width: `${a.completion_percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-[11px] text-slate-600">{a.total_graded}/{a.total_enrolled}</span>
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                                            {a.total_graded > 0 ? `${a.pass_percentage}%` : '—'}
                                        </td>

                                        <td className="py-3.5 px-3 text-center">
                                            {a.is_locked ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                                                    <Lock className="w-3 h-3" /> Locked
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                                    <Unlock className="w-3 h-3" /> Open
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-4 text-right">
                                            <button
                                                onClick={() => handleInspect(a.allocation_id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition-all shadow-sm"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>View Sheet</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── INSPECT SPREADSHEET MODAL ─────────────────────────────────── */}
            {inspectAllocId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-5xl w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">
                                    {inspectData?.allocation?.subject_code} - {inspectData?.allocation?.subject_name}
                                </h3>
                                <p className="text-xs font-semibold text-slate-500">
                                    Instructor: {inspectData?.allocation?.faculty_name} • {inspectData?.allocation?.batch_name} ({inspectData?.allocation?.subject_type})
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {inspectData && (
                                    <button
                                        onClick={() => exportToExcel(inspectData.allocation, inspectData.students, inspectData.max_marks_config)}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-xs border border-emerald-200"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Download Excel</span>
                                    </button>
                                )}
                                <button onClick={() => { setInspectAllocId(null); setInspectData(null); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {inspectLoading ? (
                                <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                                    <p className="font-bold text-sm">Fetching student mark sheet...</p>
                                </div>
                            ) : !inspectData || inspectData.students.length === 0 ? (
                                <p className="text-center text-slate-400 p-8">No student marks recorded.</p>
                            ) : (
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase sticky top-0 border-b border-slate-200">
                                        <tr>
                                            <th className="py-2.5 px-3">#</th>
                                            <th className="py-2.5 px-3">Student Name</th>
                                            <th className="py-2.5 px-3">Roll No</th>
                                            <th className="py-2.5 px-3 text-center">Attendance %</th>
                                            <th className="py-2.5 px-2 text-center">CA Att</th>
                                            <th className="py-2.5 px-2 text-center">{inspectData.allocation.ca_sub_label}-1</th>
                                            <th className="py-2.5 px-2 text-center">{inspectData.allocation.ca_sub_label}-2</th>
                                            <th className="py-2.5 px-2 text-center">{inspectData.allocation.ca_sub_label}-3</th>
                                            <th className="py-2.5 px-2 text-center font-bold text-indigo-900">CA Total</th>
                                            <th className="py-2.5 px-3 text-center">{inspectData.allocation.exam_label}</th>
                                            <th className="py-2.5 px-3 text-center font-black">Total (100)</th>
                                            <th className="py-2.5 px-3 text-center">Grade</th>
                                            <th className="py-2.5 px-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {inspectData.students.map((st, idx) => (
                                            <tr key={st.student_id} className="hover:bg-slate-50">
                                                <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                                                <td className="py-2 px-3 font-bold text-slate-800">{st.student_name}</td>
                                                <td className="py-2 px-3 font-mono text-slate-500">{st.enrollment_no}</td>
                                                <td className="py-2 px-3 text-center font-bold text-emerald-700">{st.attendance_pct}%</td>
                                                <td className="py-2 px-2 text-center">{st.ca_attendance_marks}</td>
                                                <td className="py-2 px-2 text-center">{st.ca_sub_1}</td>
                                                <td className="py-2 px-2 text-center">{st.ca_sub_2}</td>
                                                <td className="py-2 px-2 text-center">{st.ca_sub_3}</td>
                                                <td className="py-2 px-2 text-center font-bold text-indigo-700">{st.ca_total}</td>
                                                <td className="py-2 px-3 text-center font-bold text-purple-700">{st.exam_marks}</td>
                                                <td className="py-2 px-3 text-center font-black text-slate-900">{st.total_marks}</td>
                                                <td className="py-2 px-3 text-center font-black">{st.grade}</td>
                                                <td className="py-2 px-3 text-center">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${st.is_pass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                        {st.is_pass ? 'Pass' : 'Fail'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectEvaluationAdmin;
