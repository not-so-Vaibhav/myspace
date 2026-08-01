import React, { useState, useEffect } from 'react';
import {
    searchStudents,
    getStudent360Profile,
    getStudentTimeline,
    getStudentAcademicRecord,
    getStudentActivityHistory,
    exportStudent360Report
} from '../../api/student360Api';
import {
    Search, Filter, User, Award, BookOpen, Clock, Activity, Download,
    FileText, Printer, CheckCircle, AlertTriangle, ChevronRight, X,
    Calendar, Shield, Layers, Mail, Phone, MapPin, RefreshCw, Eye,
    Loader2
} from 'lucide-react';

export default function Student360ProfileAdmin() {
    // Search Engine & Roster State
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('ALL');
    const [semesterFilter, setSemesterFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [minAttendance, setMinAttendance] = useState('');
    const [minSgpa, setMinSgpa] = useState('');
    const [minCredits, setMinCredits] = useState('');
    const [promotionFilter, setPromotionFilter] = useState('ALL');
    const [graduationFilter, setGraduationFilter] = useState('ALL');
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);

    const [students, setStudents] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loadingList, setLoadingList] = useState(true);

    // Active Student 360 Profile State
    const [selectedStudentId, setSelectedStudentId] = useState('enr-2024-0012');
    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [activeTab, setActiveTab] = useState('SUMMARY'); // SUMMARY, TIMELINE, ACADEMIC, ACTIVITY
    const [timelineCategoryFilter, setTimelineCategoryFilter] = useState('ALL');

    // Export Feedback
    const [exporting, setExporting] = useState(false);
    const [exportMsg, setExportMsg] = useState('');

    useEffect(() => {
        loadStudents();
    }, [departmentFilter, semesterFilter, statusFilter, promotionFilter, graduationFilter]);

    useEffect(() => {
        if (selectedStudentId) {
            loadStudent360Profile(selectedStudentId);
        }
    }, [selectedStudentId]);

    const loadStudents = async () => {
        setLoadingList(true);
        try {
            const res = await searchStudents({
                query: searchQuery,
                department: departmentFilter,
                semester: semesterFilter,
                status: statusFilter,
                minAttendance,
                minSgpa,
                minCredits,
                promotionStatus: promotionFilter,
                graduationStatus: graduationFilter
            });
            setStudents(res.students || []);
            setTotalCount(res.totalCount || 0);
            if (res.students && res.students.length > 0 && !selectedStudentId) {
                setSelectedStudentId(res.students[0].id || res.students[0].enrollment_no);
            }
        } catch (err) {
            console.error('Failed to load students roster:', err);
        } finally {
            setLoadingList(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        loadStudents();
    };

    const loadStudent360Profile = async (studentId) => {
        setLoadingProfile(true);
        try {
            const data = await getStudent360Profile(studentId);
            setProfile(data?.data || data);
        } catch (err) {
            console.error('Failed to load Student 360 profile:', err);
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleExport = async (format) => {
        if (!profile) return;
        setExporting(true);
        setExportMsg('');
        try {
            if (format === 'PRINT') {
                window.print();
                setExporting(false);
                return;
            }
            const res = await exportStudent360Report(profile.personal.id || profile.personal.enrollment_no, format);
            const fileName = `MIT_Student360_${profile.personal.enrollment_no}_${Date.now()}.${format.toLowerCase()}`;
            let content = '';
            if (format === 'CSV') {
                const headers = ['Date', 'Category', 'Title', 'Description', 'PerformedBy'];
                const rows = (res.rows || []).map(r => [r.Date, r.Category, r.Title, `"${(r.Description || '').replace(/"/g, '""')}"`, r.PerformedBy].join(','));
                content = [headers.join(','), ...rows].join('\n');
            } else {
                content = JSON.stringify(res, null, 2);
            }
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            setExportMsg(`Exported successfully as ${format}`);
            setTimeout(() => setExportMsg(''), 4000);
        } catch (err) {
            setExportMsg('Export failed. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const filteredTimeline = (profile?.timeline || []).filter(item => {
        if (timelineCategoryFilter === 'ALL') return true;
        return item.event_type === timelineCategoryFilter;
    });

    const statusColors = {
        ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        GRADUATED: 'bg-blue-50 text-blue-700 border-blue-100',
        DETAINED: 'bg-red-50 text-red-700 border-red-100',
        PROMOTED: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    };

    const tabs = [
        { id: 'SUMMARY', label: '360° Summary Dashboard', icon: User },
        { id: 'TIMELINE', label: 'Complete Academic Timeline', icon: Activity },
        { id: 'ACADEMIC', label: 'Academic Record & Results', icon: Award },
        { id: 'ACTIVITY', label: 'Student Activity History', icon: Clock }
    ];

    return (
        <div className="min-h-screen bg-[#fcfdfe] p-4 md:p-8 lg:p-10 space-y-8">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <User className="text-[#4B7BFF]" size={36} />
                        Student 360° Profile
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                    </h1>
                    <p className="text-gray-400 font-bold text-xs md:text-xs tracking-[0.2em] uppercase flex flex-wrap items-center gap-2">
                        <Activity size={13} className="text-indigo-400" />
                        Centralized 360° Visibility · Academic Timeline · Activity History
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            showFilterDrawer
                                ? 'bg-[#1a1b4b] text-white shadow-lg shadow-[#1a1b4b]/20'
                                : 'bg-white border border-gray-100 text-gray-500 hover:text-[#1a1b4b] hover:shadow-md'
                        }`}
                    >
                        <Filter size={14} /> Advanced Filters
                    </button>
                    <button
                        onClick={loadStudents}
                        className="p-2.5 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-[#1a1b4b] hover:shadow-md transition-all"
                        title="Refresh Roster"
                    >
                        <RefreshCw size={14} className={loadingList ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* ── Advanced Filters Drawer ────────────────────────────────────── */}
            {showFilterDrawer && (
                <div className="p-7 rounded-[2rem] bg-white border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#1a1b4b] flex items-center gap-2">
                            <Filter size={14} className="text-[#4B7BFF]" /> Multi-Dimensional Search
                        </h3>
                        <button
                            onClick={() => {
                                setDepartmentFilter('ALL'); setSemesterFilter('ALL'); setStatusFilter('ALL');
                                setMinAttendance(''); setMinSgpa(''); setMinCredits('');
                                setPromotionFilter('ALL'); setGraduationFilter('ALL');
                            }}
                            className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-[#1a1b4b] underline underline-offset-4 transition-colors"
                        >
                            Reset
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[
                            { label: 'Department', value: departmentFilter, set: setDepartmentFilter, options: [{val: 'ALL', label: 'All'}, {val: 'Computer Science', label: 'CSE'}, {val: 'Electronics', label: 'ECE'}, {val: 'Mechanical', label: 'ME'}] },
                            { label: 'Semester', value: semesterFilter, set: setSemesterFilter, options: [{val: 'ALL', label: 'All'}, ...[1,2,3,4,5,6,7,8].map(s=>({val: s, label: `Sem ${s}`}))] },
                            { label: 'Status', value: statusFilter, set: setStatusFilter, options: [{val: 'ALL', label: 'All States'}, {val: 'ACTIVE', label: 'ACTIVE'}, {val: 'PROMOTED', label: 'PROMOTED'}, {val: 'DETAINED', label: 'DETAINED'}, {val: 'GRADUATED', label: 'GRADUATED'}] },
                        ].map(f => (
                            <div key={f.label}>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{f.label}</label>
                                <select
                                    value={f.value}
                                    onChange={(e) => f.set(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-100 text-[11px] font-black text-[#1a1b4b] focus:outline-none focus:border-[#1a1b4b]/30 uppercase tracking-widest cursor-pointer"
                                >
                                    {f.options.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                                </select>
                            </div>
                        ))}
                        {[
                            { label: 'Min Att. %', value: minAttendance, set: setMinAttendance, placeholder: '75' },
                            { label: 'Min SGPA', value: minSgpa, set: setMinSgpa, placeholder: '8.0' },
                            { label: 'Min Credits', value: minCredits, set: setMinCredits, placeholder: '60' },
                        ].map(f => (
                            <div key={f.label}>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{f.label}</label>
                                <input
                                    type="number"
                                    placeholder={f.placeholder}
                                    value={f.value}
                                    onChange={(e) => f.set(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] focus:outline-none focus:border-[#1a1b4b]/30 placeholder:text-gray-300"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Main Layout (Roster + Workspace) ───────────────────────────── */}
            <div className="flex flex-col lg:flex-row gap-6 lg:h-[85vh]">
                
                {/* LEFT ROSTER PANEL */}
                <div className="w-full lg:w-96 flex flex-col rounded-[2rem] bg-white border border-gray-100 shadow-sm overflow-hidden flex-shrink-0 max-h-[85vh] lg:max-h-full">
                    <div className="p-5 border-b border-gray-50 bg-slate-50">
                        <form onSubmit={handleSearchSubmit} className="relative">
                            <Search className="w-4 h-4 absolute left-4 top-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm font-bold text-[#1a1b4b] focus:outline-none focus:border-[#4B7BFF] transition-all placeholder:text-gray-300 shadow-sm"
                            />
                        </form>
                        <div className="flex items-center justify-between mt-4 px-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {students.length} of {totalCount} Students
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Live Filter</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loadingList ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-6 h-6 text-[#1a1b4b] animate-spin" />
                            </div>
                        ) : students.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Search className="w-10 h-10 text-gray-200" />
                                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">No students found</p>
                            </div>
                        ) : (
                            students.map((student) => {
                                const isSelected = (selectedStudentId === student.id || selectedStudentId === student.enrollment_no);
                                return (
                                    <div
                                        key={student.id}
                                        onClick={() => setSelectedStudentId(student.id || student.enrollment_no)}
                                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-indigo-50/50 border-indigo-200 shadow-md'
                                                : 'bg-white hover:bg-slate-50 border-gray-100 hover:border-gray-200 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-[1rem] flex items-center justify-center font-black text-sm shadow-sm ${
                                                    isSelected ? 'bg-[#1a1b4b] text-white' : 'bg-slate-100 text-gray-500'
                                                }`}>
                                                    {student.name ? student.name.charAt(0) : 'S'}
                                                </div>
                                                <div>
                                                    <h4 className={`font-black text-sm ${isSelected ? 'text-[#1a1b4b]' : 'text-gray-700'}`}>
                                                        {student.name}
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-gray-400 font-mono tracking-wider mt-0.5">
                                                        {student.enrollment_no || student.id}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest border ${
                                                statusColors[student.lifecycle_status] || 'bg-slate-50 text-gray-500 border-gray-100'
                                            }`}>
                                                {student.lifecycle_status || 'ACTIVE'}
                                            </span>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                            <span className="text-gray-400">Sem {student.current_semester || 4} • {student.department?.slice(0,3) || 'CSE'}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[#4B7BFF]">SGPA: {student.sgpa || '8.5'}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT 360° PROFILE WORKSPACE */}
                <div className="flex-1 space-y-6 overflow-y-auto pr-2 pb-10 min-h-0">
                    {loadingProfile || !profile ? (
                        <div className="h-full min-h-[400px] flex items-center justify-center rounded-[2rem] bg-white border border-gray-100">
                            <Loader2 className="w-8 h-8 text-[#1a1b4b] animate-spin" />
                        </div>
                    ) : (
                        <div className="flex flex-col space-y-6">
                            {/* STUDENT HEADER CARD */}
                            <div className="p-7 md:p-10 rounded-[2rem] bg-white border border-gray-100 shadow-sm relative overflow-hidden shrink-0">
                                {/* Decorative blob */}
                                <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

                                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 relative z-10">
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                                        <img
                                            src={profile.personal.avatar_url}
                                            alt={profile.personal.name}
                                            className="w-24 h-24 rounded-[1.5rem] object-cover border-4 border-white shadow-lg bg-slate-100"
                                        />
                                        <div className="text-center sm:text-left mt-2">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                <h2 className="text-3xl font-black text-[#1a1b4b] tracking-tight">
                                                    {profile.personal.name}
                                                </h2>
                                                <span className="px-3 py-1 rounded-xl text-[11px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 font-mono tracking-widest">
                                                    {profile.personal.enrollment_no}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                                {profile.academicInfo.program} • Semester {profile.academicInfo.currentSemester} <span className="text-gray-300">({profile.academicInfo.academicYear})</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Export Actions */}
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                        <button onClick={() => handleExport('EXCEL')} disabled={exporting}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 text-[11px] font-black uppercase tracking-widest transition-all">
                                            <Download size={13} /> Excel
                                        </button>
                                        <button onClick={() => handleExport('CSV')} disabled={exporting}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 text-[11px] font-black uppercase tracking-widest transition-all">
                                            <FileText size={13} /> CSV
                                        </button>
                                        <button onClick={() => handleExport('PDF')} disabled={exporting}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 text-[11px] font-black uppercase tracking-widest transition-all">
                                            <Shield size={13} /> PDF
                                        </button>
                                        <button onClick={() => handleExport('PRINT')}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 text-[11px] font-black uppercase tracking-widest transition-all shadow-sm">
                                            <Printer size={13} /> Print
                                        </button>
                                    </div>
                                </div>

                                {exportMsg && (
                                    <div className="mt-6 p-4 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-widest border border-emerald-100 flex items-center justify-center gap-2">
                                        <CheckCircle size={16} /> {exportMsg}
                                    </div>
                                )}

                                {/* 4 KPI SUMMARY CARDS */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-100 relative z-10">
                                    {[
                                        { label: 'SGPA / CGPA', val1: profile.metrics.sgpa, val2: profile.metrics.cgpa, color: 'text-indigo-600' },
                                        { label: 'Attendance %', val1: profile.metrics.attendancePercentage + '%', val2: '', color: 'text-emerald-600' },
                                        { label: 'Credits Earned', val1: profile.metrics.totalCreditsEarned, val2: profile.metrics.requiredCredits, color: 'text-[#4B7BFF]' },
                                        { label: 'Active Backlogs', val1: profile.metrics.activeBacklogs, val2: '', color: 'text-amber-600' }
                                    ].map((k, i) => (
                                        <div key={i} className="p-5 rounded-2xl bg-slate-50 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{k.label}</div>
                                            <div className={`text-2xl font-black mt-1 tracking-tight ${k.color}`}>
                                                {k.val1} {k.val2 && <span className="text-sm text-gray-400">/ {k.val2}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* TAB NAVIGATION */}
                            <div className="flex items-center gap-1 bg-white border border-gray-100 p-1.5 rounded-2xl w-fit shadow-sm overflow-x-auto max-w-full shrink-0">
                                {tabs.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setActiveTab(t.id)}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                                            activeTab === t.id
                                                ? 'bg-[#1a1b4b] text-white shadow-md'
                                                : 'text-gray-400 hover:text-[#1a1b4b] hover:bg-slate-50'
                                        }`}
                                    >
                                        <t.icon size={14} /> {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* TAB 1: SUMMARY */}
                            {activeTab === 'SUMMARY' && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in duration-300">
                                    <div className="p-7 rounded-[2rem] bg-white border border-gray-100 shadow-sm">
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#1a1b4b] mb-6 flex items-center gap-2">
                                            <div className="p-1.5 bg-indigo-50 rounded-lg"><User size={14} className="text-indigo-600" /></div> Personal Info
                                        </h3>
                                        <div className="space-y-4">
                                            {[
                                                { k: 'Email', v: profile.personal.email },
                                                { k: 'Mobile', v: profile.personal.mobile_number },
                                                { k: 'DOB', v: `${profile.personal.date_of_birth} (${profile.personal.gender})` },
                                                { k: 'Guardian', v: `${profile.personal.guardian_name} (${profile.personal.guardian_mobile})` }
                                            ].map(r => (
                                                <div key={r.k} className="flex justify-between items-end pb-3 border-b border-gray-50">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{r.k}</span>
                                                    <span className="text-sm font-bold text-[#1a1b4b] text-right">{r.v}</span>
                                                </div>
                                            ))}
                                            <div className="pt-2">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Permanent Address</span>
                                                <div className="text-xs font-bold text-gray-600 bg-slate-50 p-4 rounded-2xl border border-gray-100 leading-relaxed">
                                                    {profile.personal.address}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-7 rounded-[2rem] bg-white border border-gray-100 shadow-sm">
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#1a1b4b] mb-6 flex items-center gap-2">
                                            <div className="p-1.5 bg-emerald-50 rounded-lg"><Award size={14} className="text-emerald-600" /></div> Academic Class
                                        </h3>
                                        <div className="space-y-4">
                                            {[
                                                { k: 'Department', v: profile.academicInfo.department },
                                                { k: 'Class & Batch', v: `${profile.academicInfo.classSection} • ${profile.academicInfo.batchGroup}` },
                                                { k: 'Faculty Advisor', v: <span className="text-[#4B7BFF]">{profile.academicInfo.advisor}</span> },
                                                { k: 'Admission Date', v: profile.academicInfo.admissionDate },
                                                { k: 'Notifications', v: <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] uppercase">{profile.metrics.notificationsCount} Active</span> }
                                            ].map(r => (
                                                <div key={r.k} className="flex justify-between items-end pb-3 border-b border-gray-50">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{r.k}</span>
                                                    <span className="text-sm font-bold text-[#1a1b4b] text-right">{r.v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="xl:col-span-2 p-7 rounded-[2rem] bg-white border border-gray-100 shadow-sm overflow-hidden">
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#1a1b4b] mb-6 flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-50 rounded-lg"><BookOpen size={14} className="text-[#4B7BFF]" /></div> Current Semester Courses
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-gray-100">
                                                        {['Code', 'Course Name', 'Credits', 'Type', 'Attendance', 'Grade'].map(h => (
                                                            <th key={h} className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {(profile.registeredCourses || []).map((c, i) => (
                                                        <tr key={i} className="hover:bg-slate-50/50">
                                                            <td className="px-5 py-4 text-xs font-black font-mono text-[#4B7BFF]">{c.code}</td>
                                                            <td className="px-5 py-4 text-sm font-bold text-[#1a1b4b]">{c.name}</td>
                                                            <td className="px-5 py-4 text-xs font-bold text-gray-500">{c.credits} Cr</td>
                                                            <td className="px-5 py-4">
                                                                <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 text-gray-500 border border-gray-200">
                                                                    {c.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-4 text-sm font-black text-emerald-600">{c.attendance}%</td>
                                                            <td className="px-5 py-4 text-sm font-black text-[#1a1b4b]">{c.grade}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: TIMELINE */}
                            {activeTab === 'TIMELINE' && (
                                <div className="p-7 md:p-10 rounded-[2rem] bg-white border border-gray-100 shadow-sm animate-in fade-in duration-300">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                                        <div>
                                            <h3 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight">Chronological Timeline</h3>
                                            <p className="text-[11px] font-bold text-gray-400 mt-1">Admission, registrations, attendance, results, backlogs.</p>
                                        </div>
                                        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                                            {['ALL', 'SEMESTER_REGISTRATION', 'PROMOTION', 'RESULTS', 'ADMISSION'].map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setTimelineCategoryFilter(cat)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                                                        timelineCategoryFilter === cat
                                                            ? 'bg-[#1a1b4b] text-white shadow-sm'
                                                            : 'bg-white border border-gray-200 text-gray-500 hover:text-[#1a1b4b]'
                                                    }`}
                                                >
                                                    {cat === 'ALL' ? 'All Events' : cat.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-100 space-y-10">
                                        {filteredTimeline.length === 0 ? (
                                            <div className="py-10 text-center text-[11px] font-black uppercase tracking-widest text-gray-400">
                                                No timeline events found.
                                            </div>
                                        ) : (
                                            filteredTimeline.map((item, idx) => (
                                                <div key={item.id || idx} className="relative group">
                                                    <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-5 h-5 rounded-full bg-white border-[5px] border-indigo-500 shadow-sm group-hover:scale-125 transition-transform" />
                                                    
                                                    <div className="p-6 rounded-[1.5rem] bg-slate-50 border border-gray-100 hover:border-indigo-200 hover:bg-white hover:shadow-lg transition-all group-hover:-translate-y-1">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                                            <span className="inline-block px-3 py-1 rounded-xl text-[9px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-widest w-fit">
                                                                {item.event_type || item.module_name || 'EVENT'}
                                                            </span>
                                                            <span className="text-[11px] font-black text-gray-400 font-mono tracking-widest">
                                                                {item.event_date || 'Current'}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-black text-[#1a1b4b] text-base">{item.title}</h4>
                                                        <p className="text-xs font-bold text-gray-500 mt-2 leading-relaxed">{item.description}</p>
                                                        
                                                        <div className="mt-5 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest">
                                                            <span className="text-gray-400">By: <span className="text-[#1a1b4b]">{item.performed_by_name || 'System'}</span></span>
                                                            {item.metadata && (
                                                                <span className="font-mono bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                                                    <Shield size={10} /> Verified Hash
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: ACADEMIC RECORD */}
                            {activeTab === 'ACADEMIC' && profile.academicRecord && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="p-7 rounded-[2rem] bg-white border border-gray-100 shadow-sm">
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#1a1b4b] mb-6 flex items-center gap-2">
                                            <div className="p-1.5 bg-amber-50 rounded-lg"><Award size={14} className="text-amber-600" /></div> Semester-Wise Progression
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                            {(profile.academicRecord.semesterWiseResults || []).map((s, idx) => (
                                                <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-gray-100 hover:shadow-md transition-shadow">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="font-black text-sm text-[#1a1b4b] uppercase tracking-widest">Sem {s.semester}</span>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border ${
                                                            s.resultStatus === 'PASS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                                                        }`}>
                                                            {s.resultStatus}
                                                        </span>
                                                    </div>
                                                    <div className="text-3xl font-black text-[#1a1b4b] mb-1">{s.sgpa} <span className="text-[10px] text-gray-400 tracking-widest">SGPA</span></div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.earnedCredits} / {s.totalCredits} Cr • {s.date}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-7 rounded-[2rem] bg-white border border-gray-100 shadow-sm overflow-hidden">
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#1a1b4b] mb-6 flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-50 rounded-lg"><BookOpen size={14} className="text-[#4B7BFF]" /></div> Subject-Wise Results (Sem III)
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 border-b border-gray-100">
                                                    <tr>
                                                        {['Code', 'Subject Name', 'Credits', 'Grade Pts', 'Marks', 'Grade'].map(h => (
                                                            <th key={h} className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {(profile.academicRecord.subjectWiseResults || []).map((sub, i) => (
                                                        <tr key={i} className="hover:bg-slate-50/50">
                                                            <td className="px-5 py-4 text-xs font-black font-mono text-[#4B7BFF]">{sub.code}</td>
                                                            <td className="px-5 py-4 text-sm font-bold text-[#1a1b4b]">{sub.name}</td>
                                                            <td className="px-5 py-4 text-xs font-bold text-gray-500">{sub.credits}</td>
                                                            <td className="px-5 py-4 text-sm font-black text-[#1a1b4b]">{sub.gradePoints}</td>
                                                            <td className="px-5 py-4 text-sm font-bold text-gray-500">{sub.marks}%</td>
                                                            <td className="px-5 py-4 text-sm font-black text-emerald-600">{sub.grade}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: ACTIVITY */}
                            {activeTab === 'ACTIVITY' && (
                                <div className="p-7 rounded-[2rem] bg-white border border-gray-100 shadow-sm animate-in fade-in duration-300">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight">Portal Activity History</h3>
                                        <p className="text-[11px] font-bold text-gray-400 mt-1">Audit log of logins, registrations, downloads, and submissions.</p>
                                    </div>
                                    <div className="space-y-4">
                                        {(profile.activityHistory || []).map((log, i) => (
                                            <div key={i} className="p-5 rounded-2xl bg-slate-50 border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                                        <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
                                                            {log.activity_type}
                                                        </span>
                                                        <h4 className="font-black text-sm text-[#1a1b4b]">{log.title}</h4>
                                                    </div>
                                                    <p className="text-[11px] font-bold text-gray-500">{log.description}</p>
                                                </div>
                                                <div className="text-left md:text-right flex flex-row md:flex-col gap-3 md:gap-1 items-center md:items-end border-t md:border-t-0 border-gray-200 pt-3 md:pt-0">
                                                    <span className="text-[10px] font-black text-gray-400 tracking-widest font-mono">
                                                        {new Date(log.activity_time).toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] font-black text-indigo-500 font-mono tracking-widest">
                                                        {log.ip_address || '127.0.0.1'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
