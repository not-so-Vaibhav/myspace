import React, { useState, useEffect, useCallback } from 'react';
import {
    Users,
    Layers,
    Plus,
    Wand2,
    ArrowRightLeft,
    FileSpreadsheet,
    FileText,
    Printer,
    CheckCircle2,
    AlertCircle,
    Building2,
    UserCheck,
    RefreshCw,
    X,
    AlertTriangle,
    Info,
    Loader2,
    BookOpen,
} from 'lucide-react';
import { batchApi } from '../../api/batchApi';

// ── Toast ──────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    const styles = {
        success: 'bg-emerald-600 border-emerald-500',
        error:   'bg-red-600 border-red-500',
        info:    'bg-[#1a1b4b] border-[#2d3a8c]',
    };
    const icons = {
        success: <CheckCircle2 size={16} />,
        error:   <AlertTriangle size={16} />,
        info:    <Info size={16} />,
    };

    return (
        <div className={`fixed top-20 right-6 z-[300] ${styles[type]} text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-right-5 fade-in max-w-sm`}>
            <span className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center shrink-0">{icons[type]}</span>
            <span className="text-xs font-black uppercase tracking-widest">{message}</span>
            <button onClick={onClose} className="ml-auto text-white/60 hover:text-white"><X size={14} /></button>
        </div>
    );
};

// ── Field label ───────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
    <div className="space-y-1.5">
        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
        {children}
    </div>
);

const inputClass = 'w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] focus:bg-white focus:border-[#1a1b4b]/30 outline-none transition-all placeholder:text-gray-300';
const selectClass = 'w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] focus:bg-white focus:border-[#1a1b4b]/30 outline-none transition-all cursor-pointer';

// ── Modal Shell ───────────────────────────────────────────────────────────────
const Modal = ({ title, subtitle, icon: Icon, iconColor, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-[2rem] w-full max-w-md p-7 shadow-2xl border border-gray-100">
            <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className={`p-2.5 rounded-2xl ${iconColor || 'bg-indigo-50'}`}>
                            <Icon size={18} className={iconColor ? 'text-white' : 'text-[#1a1b4b]'} strokeWidth={2.5} />
                        </div>
                    )}
                    <div>
                        <h3 className="text-base font-black text-[#1a1b4b] uppercase tracking-tight">{title}</h3>
                        {subtitle && <p className="text-[11px] font-bold text-gray-400 mt-0.5">{subtitle}</p>}
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-[#1a1b4b] hover:bg-slate-100 transition">
                    <X size={16} />
                </button>
            </div>
            {children}
        </div>
    </div>
);

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ label }) => (
    <span className="px-3 py-1 text-[11px] font-black uppercase tracking-widest rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
        {label || 'ACTIVE'}
    </span>
);

// ── Occupancy Bar ─────────────────────────────────────────────────────────────
const OccupancyBar = ({ pct, color = 'bg-[#4B7BFF]' }) => (
    <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${Math.min(100, pct || 0)}%` }} />
        </div>
        <span className="text-[11px] font-black text-[#1a1b4b] w-8 text-right">{pct ?? 0}%</span>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
export default function ClassBatchAdminPortal() {
    const [activeTab, setActiveTab] = useState('classes');
    const [classes, setClasses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [reports, setReports] = useState([]);
    const [selectedReportType, setSelectedReportType] = useState('CLASS_REPORT');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const [showClassModal, setShowClassModal] = useState(false);
    const [showAutoGenModal, setShowAutoGenModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);

    const [newClass, setNewClass] = useState({
        program_name: 'Computer Science Engineering',
        academic_year: '2026-2027',
        year_level: 'First Year',
        class_name: 'FY-1',
        capacity: 70,
        classroom: 'Room 101',
    });
    const [autoGenConfig, setAutoGenConfig] = useState({
        classId: '',
        totalStudents: 70,
        batchSize: 24,
        assignedLab: 'Computer Lab 1',
    });
    const [transferConfig, setTransferConfig] = useState({
        studentId: '',
        targetBatchId: '',
        reason: 'Administrative Batch Transfer',
    });

    const showToast = useCallback((message, type = 'info') => setToast({ message, type }), []);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [clsRes, bRes, allocRes] = await Promise.all([
                batchApi.listClasses(),
                batchApi.listBatches(),
                batchApi.generateReport('STUDENT_ALLOCATION_REPORT'),
            ]);
            setClasses(clsRes.data || clsRes || []);
            setBatches(bRes.data || bRes || []);
            setAllocations(allocRes.data || allocRes || []);
            loadReport(selectedReportType);
        } catch (err) {
            showToast('Failed to fetch batch data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadReport = async (type) => {
        try {
            const res = await batchApi.generateReport(type);
            setReports(res.data || res || []);
        } catch { setReports([]); }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        try {
            await batchApi.createClass(newClass);
            setShowClassModal(false);
            showToast(`Class ${newClass.class_name} created!`, 'success');
            loadData();
        } catch (err) {
            showToast(err.message || 'Failed to create class', 'error');
        }
    };

    const handleAutoGenerateBatches = async (e) => {
        e.preventDefault();
        try {
            const res = await batchApi.autoGenerateBatches({
                classId: autoGenConfig.classId,
                totalStudents: Number(autoGenConfig.totalStudents),
                batchSize: Number(autoGenConfig.batchSize),
                assignedLab: autoGenConfig.assignedLab,
            });
            setShowAutoGenModal(false);
            showToast(`Generated ${res.batches_created || 0} batches!`, 'success');
            loadData();
        } catch (err) {
            showToast(err.message || 'Batch generation failed', 'error');
        }
    };

    const handleTransferStudent = async (e) => {
        e.preventDefault();
        try {
            await batchApi.transferStudentBatch({
                studentId: transferConfig.studentId,
                targetBatchId: transferConfig.targetBatchId,
                reason: transferConfig.reason,
            });
            setShowTransferModal(false);
            showToast('Transfer completed & audit logged', 'success');
            loadData();
        } catch (err) {
            showToast(err.message || 'Transfer failed', 'error');
        }
    };

    const exportToCSV = () => {
        if (!reports.length) return;
        const headers = Object.keys(reports[0]);
        const csv = [headers.join(','), ...reports.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `${selectedReportType}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    };

    const exportToExcel = () => {
        if (!reports.length) return;
        const headers = Object.keys(reports[0]);
        const html = `<table border="1"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${reports.map(r => `<tr>${headers.map(h => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `${selectedReportType}_${new Date().toISOString().slice(0, 10)}.xls`; a.click();
    };

    // KPIs
    const totalCapacity = classes.reduce((a, c) => a + (Number(c.class_capacity) || 0), 0);
    const totalEnrolled = classes.reduce((a, c) => a + (Number(c.enrolled_students) || 0), 0);
    const overallOccupancy = totalCapacity > 0 ? ((totalEnrolled / totalCapacity) * 100).toFixed(1) : '0.0';

    const kpis = [
        { label: 'Academic Classes', value: classes.length, sub: 'FY-1, FY-2, SY-1 hierarchy', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Practical Batches', value: batches.length, sub: 'Batch A, B, C configurable', icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Overall Occupancy', value: `${overallOccupancy}%`, sub: `${totalEnrolled} / ${totalCapacity} seats`, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Active Allocations', value: allocations.length, sub: '1 Class & 1 Batch per student', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    const tabs = [
        { id: 'classes',     label: 'Class & Batch Manager',           icon: Building2 },
        { id: 'allocations', label: 'Student Allocations & Transfers',  icon: Users },
        { id: 'reports',     label: 'Enterprise Exporters & Reports',   icon: FileSpreadsheet },
    ];

    const reportTabs = [
        { type: 'CLASS_REPORT',              label: 'Class Report' },
        { type: 'BATCH_REPORT',              label: 'Batch Report' },
        { type: 'STUDENT_ALLOCATION_REPORT', label: 'Student Allocations' },
        { type: 'FACULTY_ALLOCATION_REPORT', label: 'Faculty Allocations' },
        { type: 'BATCH_CAPACITY_REPORT',     label: 'Batch Capacity' },
    ];

    return (
        <div className="p-6 md:p-10 space-y-10 bg-[#fcfdfe] min-h-screen">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <Building2 className="text-[#4B7BFF]" size={36} />
                        Class & Batch Management
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2">
                        <BookOpen size={13} className="text-indigo-400" />
                        Academic Hierarchy · Auto-Generate Batches · Transfer Auditing · Compliance Reports
                    </p>
                </div>
                <div className="flex gap-3 shrink-0">
                    <button
                        onClick={loadData}
                        className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[#1a1b4b] hover:shadow-md transition-all flex items-center gap-2"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button
                        onClick={() => setShowAutoGenModal(true)}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                        <Wand2 size={14} /> Auto-Generate Batches
                    </button>
                    <button
                        onClick={() => setShowClassModal(true)}
                        className="px-5 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20 hover:bg-[#2d3a8c] transition-all flex items-center gap-2"
                    >
                        <Plus size={15} strokeWidth={3} /> New Academic Class
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((k, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 group relative overflow-hidden">
                        <div className={`absolute -right-3 -bottom-3 w-20 h-20 rounded-full ${k.bg} opacity-30 group-hover:scale-150 transition-transform duration-700`} />
                        <div className={`p-2.5 rounded-2xl ${k.bg} ${k.color} inline-flex mb-4 group-hover:scale-110 transition-transform`}>
                            <k.icon size={18} strokeWidth={2.5} />
                        </div>
                        <div className="text-3xl font-black text-[#1a1b4b] tracking-tighter">{loading ? '—' : k.value}</div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1">{k.label}</p>
                        <p className="text-[11px] font-bold text-gray-300 mt-0.5">{k.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Navigation Tabs ────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 bg-white border border-gray-100 p-1 rounded-2xl w-fit shadow-sm">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                            activeTab === t.id
                                ? 'bg-[#1a1b4b] text-white shadow-md'
                                : 'text-gray-400 hover:text-[#1a1b4b]'
                        }`}
                    >
                        <t.icon size={13} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Tab 1: Classes & Batches ───────────────────────────────────── */}
            {activeTab === 'classes' && (
                <div className="space-y-8">
                    {/* Academic Classes Table */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-7 py-5 border-b border-gray-50 flex items-center gap-3">
                            <div className="p-2 rounded-2xl bg-blue-50">
                                <Building2 size={16} className="text-blue-600" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">Academic Class Hierarchy & Batches</h2>
                                <p className="text-[11px] font-bold text-gray-400">Program → Academic Year → Year Level → Class → Practical Batches</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-50 bg-slate-50/60">
                                        {['Class Hierarchy', 'Year Level', 'Capacity / Enrolled', 'Occupancy', 'Classroom', 'Class Teacher', 'Status'].map(h => (
                                            <th key={h} className="px-5 py-3.5 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-16 text-center">
                                                <Loader2 className="w-7 h-7 text-[#1a1b4b] animate-spin mx-auto" />
                                            </td>
                                        </tr>
                                    ) : classes.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-16 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-14 h-14 bg-[#1a1b4b]/5 rounded-[1.5rem] flex items-center justify-center">
                                                        <Building2 size={22} className="text-[#1a1b4b]/20" />
                                                    </div>
                                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No classes configured</p>
                                                    <p className="text-xs font-bold text-gray-300">Click "New Academic Class" to add one</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : classes.map(cls => (
                                        <tr key={cls.class_id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-4 font-black text-[#1a1b4b] text-sm">{cls.program_name} — {cls.class_name}</td>
                                            <td className="px-5 py-4 text-sm font-bold text-gray-600">{cls.year_level} <span className="text-gray-400">({cls.academic_year})</span></td>
                                            <td className="px-5 py-4 text-sm font-bold text-[#1a1b4b]">{cls.enrolled_students} / {cls.class_capacity} seats</td>
                                            <td className="px-5 py-4 w-40"><OccupancyBar pct={cls.occupancy_percentage} /></td>
                                            <td className="px-5 py-4 text-sm font-bold text-gray-600">{cls.classroom}</td>
                                            <td className="px-5 py-4 text-sm font-bold text-gray-600">{cls.class_teacher_name || '—'}</td>
                                            <td className="px-5 py-4"><StatusBadge label={cls.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Practical Batches Table */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-7 py-5 border-b border-gray-50 flex items-center gap-3">
                            <div className="p-2 rounded-2xl bg-indigo-50">
                                <Layers size={16} className="text-indigo-600" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">Practical Batches (Lab Sections)</h2>
                                <p className="text-[11px] font-bold text-gray-400">Configurable batch sizes with unique name validation per class</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-50 bg-slate-50/60">
                                        {['Batch Name', 'Parent Class', 'Capacity / Enrolled', 'Occupancy', 'Assigned Lab', 'Faculty', 'Status'].map(h => (
                                            <th key={h} className="px-5 py-3.5 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-16 text-center">
                                                <Loader2 className="w-7 h-7 text-[#1a1b4b] animate-spin mx-auto" />
                                            </td>
                                        </tr>
                                    ) : batches.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-16 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-14 h-14 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center">
                                                        <Layers size={22} className="text-indigo-200" />
                                                    </div>
                                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No practical batches yet</p>
                                                    <p className="text-xs font-bold text-gray-300">Use "Auto-Generate Batches" to create Batch A, B, C</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : batches.map(batch => (
                                        <tr key={batch.batch_id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-4 font-black text-indigo-600 text-sm">{batch.batch_name}</td>
                                            <td className="px-5 py-4 text-sm font-bold text-gray-600">{batch.parent_class_name} <span className="text-gray-400">({batch.program_name})</span></td>
                                            <td className="px-5 py-4 text-sm font-bold text-[#1a1b4b]">{batch.enrolled_students} / {batch.batch_capacity}</td>
                                            <td className="px-5 py-4 w-40"><OccupancyBar pct={batch.occupancy_percentage} color="bg-indigo-500" /></td>
                                            <td className="px-5 py-4 text-sm font-bold text-gray-600">{batch.assigned_lab || '—'}</td>
                                            <td className="px-5 py-4 text-sm font-bold text-gray-600">{batch.faculty_name || '—'}</td>
                                            <td className="px-5 py-4"><StatusBadge label={batch.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab 2: Student Allocations ─────────────────────────────────── */}
            {activeTab === 'allocations' && (
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-7 py-5 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-2xl bg-amber-50">
                                <Users size={16} className="text-amber-600" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">Active Student Allocations & Transfer Audit</h2>
                                <p className="text-[11px] font-bold text-gray-400">Every student belongs to ONE Class and ONE Practical Batch — transfers are logged immutably</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowTransferModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20 hover:bg-[#2d3a8c] transition-all shrink-0"
                        >
                            <ArrowRightLeft size={13} /> Transfer Student
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-50 bg-slate-50/60">
                                    {['Student Name', 'Email / ID', 'Assigned Class', 'Practical Batch', 'Assigned Lab', 'Status'].map(h => (
                                        <th key={h} className="px-5 py-3.5 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-5 py-16 text-center"><Loader2 className="w-7 h-7 text-[#1a1b4b] animate-spin mx-auto" /></td></tr>
                                ) : allocations.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-14 h-14 bg-amber-50 rounded-[1.5rem] flex items-center justify-center">
                                                    <Users size={22} className="text-amber-200" />
                                                </div>
                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No active student allocations</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : allocations.map(alloc => (
                                    <tr key={alloc.allocation_id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-5 py-4 font-black text-[#1a1b4b] text-sm">{alloc.student_name}</td>
                                        <td className="px-5 py-4 text-sm font-bold text-gray-400">{alloc.student_email || alloc.student_id}</td>
                                        <td className="px-5 py-4 text-sm font-black text-blue-600">{alloc.class_name} <span className="font-bold text-blue-400">({alloc.year_level})</span></td>
                                        <td className="px-5 py-4 text-sm font-black text-indigo-600">{alloc.batch_name}</td>
                                        <td className="px-5 py-4 text-sm font-bold text-gray-600">{alloc.assigned_lab || '—'}</td>
                                        <td className="px-5 py-4"><StatusBadge label={alloc.allocation_status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Tab 3: Reports & Exporters ─────────────────────────────────── */}
            {activeTab === 'reports' && (
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-7 space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        {/* Report type pills */}
                        <div className="flex flex-wrap gap-2">
                            {reportTabs.map(rt => (
                                <button
                                    key={rt.type}
                                    onClick={() => { setSelectedReportType(rt.type); loadReport(rt.type); }}
                                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                        selectedReportType === rt.type
                                            ? 'bg-[#1a1b4b] text-white shadow-md shadow-[#1a1b4b]/20'
                                            : 'bg-slate-50 text-gray-400 border border-gray-100 hover:text-[#1a1b4b] hover:bg-slate-100'
                                    }`}
                                >
                                    {rt.label}
                                </button>
                            ))}
                        </div>
                        {/* Export buttons */}
                        <div className="flex gap-2 shrink-0">
                            <button onClick={exportToExcel} disabled={!reports.length}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                <FileSpreadsheet size={13} /> Excel
                            </button>
                            <button onClick={exportToCSV} disabled={!reports.length}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                <FileText size={13} /> CSV
                            </button>
                            <button onClick={() => window.print()} disabled={!reports.length}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                <Printer size={13} /> Print
                            </button>
                        </div>
                    </div>

                    {/* Report Table */}
                    {reports.length > 0 ? (
                        <div className="overflow-x-auto rounded-2xl border border-gray-100">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-slate-50">
                                        {Object.keys(reports[0]).map(col => (
                                            <th key={col} className="px-5 py-3.5 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                {col.replace(/_/g, ' ')}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {reports.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                            {Object.keys(row).map(col => (
                                                <td key={col} className="px-5 py-4 text-sm font-bold text-[#1a1b4b]">
                                                    {typeof row[col] === 'boolean'
                                                        ? (row[col] ? <span className="text-emerald-600">Yes</span> : <span className="text-red-400">No</span>)
                                                        : (row[col] != null ? String(row[col]) : <span className="text-gray-300">—</span>)
                                                    }
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-16 h-16 bg-[#1a1b4b]/5 rounded-[2rem] flex items-center justify-center">
                                <FileSpreadsheet size={28} className="text-[#1a1b4b]/20" />
                            </div>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No report data for this selection</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Modal: New Academic Class ──────────────────────────────────── */}
            {showClassModal && (
                <Modal title="Configure Academic Class" subtitle="Define FY-1, SY-1 class hierarchy with seat capacity"
                    icon={Building2} onClose={() => setShowClassModal(false)}>
                    <form onSubmit={handleCreateClass} className="space-y-4">
                        <Field label="Program Name">
                            <input type="text" value={newClass.program_name} required
                                onChange={e => setNewClass({ ...newClass, program_name: e.target.value })}
                                className={inputClass} placeholder="e.g. Computer Science Engineering" />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Academic Year">
                                <input type="text" value={newClass.academic_year} required
                                    onChange={e => setNewClass({ ...newClass, academic_year: e.target.value })}
                                    className={inputClass} placeholder="2026-2027" />
                            </Field>
                            <Field label="Year Level">
                                <input type="text" value={newClass.year_level} required
                                    onChange={e => setNewClass({ ...newClass, year_level: e.target.value })}
                                    className={inputClass} placeholder="First Year" />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Class Name">
                                <input type="text" value={newClass.class_name} required
                                    onChange={e => setNewClass({ ...newClass, class_name: e.target.value })}
                                    className={inputClass} placeholder="FY-1, SY-2…" />
                            </Field>
                            <Field label="Capacity (Seats)">
                                <input type="number" value={newClass.capacity} required min={1}
                                    onChange={e => setNewClass({ ...newClass, capacity: Number(e.target.value) })}
                                    className={inputClass} />
                            </Field>
                        </div>
                        <Field label="Classroom">
                            <input type="text" value={newClass.classroom} required
                                onChange={e => setNewClass({ ...newClass, classroom: e.target.value })}
                                className={inputClass} placeholder="Room 101" />
                        </Field>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowClassModal(false)}
                                className="px-5 py-2.5 rounded-xl border border-gray-100 text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-slate-50 transition-all">
                                Cancel
                            </button>
                            <button type="submit"
                                className="px-6 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20 hover:bg-[#2d3a8c] transition-all">
                                Save Class
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Modal: Auto-Generate Batches ───────────────────────────────── */}
            {showAutoGenModal && (
                <Modal title="Auto-Generate Batches" subtitle={`70 students ÷ batch size 24 → Batch A=24, B=23, C=23`}
                    icon={Wand2} onClose={() => setShowAutoGenModal(false)}>
                    <form onSubmit={handleAutoGenerateBatches} className="space-y-4">
                        <Field label="Target Academic Class">
                            <select value={autoGenConfig.classId} required
                                onChange={e => setAutoGenConfig({ ...autoGenConfig, classId: e.target.value })}
                                className={selectClass}>
                                <option value="">— Select Class —</option>
                                {classes.map(c => (
                                    <option key={c.class_id} value={c.class_id}>
                                        {c.class_name} ({c.year_level}) — Cap: {c.class_capacity}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Total Students">
                                <input type="number" value={autoGenConfig.totalStudents} required min={1}
                                    onChange={e => setAutoGenConfig({ ...autoGenConfig, totalStudents: e.target.value })}
                                    className={inputClass} />
                            </Field>
                            <Field label="Batch Size">
                                <input type="number" value={autoGenConfig.batchSize} required min={1}
                                    onChange={e => setAutoGenConfig({ ...autoGenConfig, batchSize: e.target.value })}
                                    className={inputClass} />
                            </Field>
                        </div>
                        <Field label="Assigned Lab Prefix">
                            <input type="text" value={autoGenConfig.assignedLab}
                                onChange={e => setAutoGenConfig({ ...autoGenConfig, assignedLab: e.target.value })}
                                className={inputClass} placeholder="Computer Lab 1" />
                        </Field>
                        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700">
                            <span className="font-black">Algorithm Preview: </span>
                            {Math.ceil((Number(autoGenConfig.totalStudents) || 0) / (Number(autoGenConfig.batchSize) || 1))} batches will be generated with alphabetical names (Batch A, Batch B…) and distributed capacity.
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowAutoGenModal(false)}
                                className="px-5 py-2.5 rounded-xl border border-gray-100 text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-slate-50 transition-all">
                                Cancel
                            </button>
                            <button type="submit"
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
                                <Wand2 size={13} /> Generate Now
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Modal: Transfer Student ────────────────────────────────────── */}
            {showTransferModal && (
                <Modal title="Transfer Student" subtitle="Enforces 1 Class & 1 Batch rule — writes an immutable audit trail"
                    icon={ArrowRightLeft} onClose={() => setShowTransferModal(false)}>
                    <form onSubmit={handleTransferStudent} className="space-y-4">
                        <Field label="Student ID / UUID">
                            <input type="text" value={transferConfig.studentId} required
                                onChange={e => setTransferConfig({ ...transferConfig, studentId: e.target.value })}
                                className={inputClass} placeholder="Enter student UUID" />
                        </Field>
                        <Field label="Target Practical Batch">
                            <select value={transferConfig.targetBatchId} required
                                onChange={e => setTransferConfig({ ...transferConfig, targetBatchId: e.target.value })}
                                className={selectClass}>
                                <option value="">— Select Target Batch —</option>
                                {batches.map(b => (
                                    <option key={b.batch_id} value={b.batch_id}>
                                        {b.batch_name} — {b.parent_class_name} ({b.enrolled_students}/{b.batch_capacity} seats)
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Transfer Reason / Audit Justification">
                            <textarea rows={3} value={transferConfig.reason} required
                                onChange={e => setTransferConfig({ ...transferConfig, reason: e.target.value })}
                                className={inputClass + ' resize-none'} />
                        </Field>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowTransferModal(false)}
                                className="px-5 py-2.5 rounded-xl border border-gray-100 text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-slate-50 transition-all">
                                Cancel
                            </button>
                            <button type="submit"
                                className="px-6 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20 hover:bg-[#2d3a8c] transition-all flex items-center gap-2">
                                <ArrowRightLeft size={13} /> Execute Transfer
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
