import { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp, ShieldCheck, CheckCircle2, AlertTriangle, XCircle,
    GraduationCap, RefreshCw, X, Search, Filter, Loader2, Award,
    BookOpen, Layers, Info, Check, Clock, UserCheck, Play, ArrowRight, Eye
} from 'lucide-react';
import { evaluateStudentPromotion, approvePromotionDecision, getPromotionHistory } from '../../api/promotionApi';
import { getReferenceData, listRules } from '../../api/academicRulesApi';
import { listStudents } from '../../api/studentLifecycleApi';

// ── Toast Notification ─────────────────────────────────────────────────────────
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

    return (
        <div className={`fixed top-20 right-6 z-[300] ${styles[type] || styles.info} text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-right-5 fade-in max-w-sm`}>
            <span className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                {type === 'success' ? <CheckCircle2 size={16} /> : type === 'error' ? <AlertTriangle size={16} /> : <Info size={16} />}
            </span>
            <span className="text-xs font-black uppercase tracking-widest">{message}</span>
            <button onClick={onClose} className="ml-auto text-white/60 hover:text-white"><X size={14} /></button>
        </div>
    );
};

// ── Decision Badge ─────────────────────────────────────────────────────────────
const DecisionBadge = ({ decision }) => {
    const styles = {
        PROMOTED:           'bg-emerald-50 text-emerald-600 border-emerald-100',
        PROMOTED_WITH_ATKT: 'bg-amber-50 text-amber-600 border-amber-100',
        REPEAT_SEMESTER:    'bg-red-50 text-red-600 border-red-100',
        DETAINED:           'bg-rose-100 text-rose-700 border-rose-200 font-extrabold',
        GRADUATED:          'bg-[#1a1b4b] text-white border-[#1a1b4b] shadow-sm',
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-widest border ${styles[decision] || 'bg-gray-50 text-gray-400 border-gray-100'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${decision === 'GRADUATED' ? 'bg-amber-400 animate-pulse' : decision === 'PROMOTED' ? 'bg-emerald-400' : 'bg-current'}`} />
            {decision.replace(/_/g, ' ')}
        </span>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const AcademicPromotionAdmin = () => {
    const [history, setHistory]           = useState([]);
    const [refData, setRefData]           = useState({ programs: [], academicYears: [], semesters: [] });
    const [students, setStudents]         = useState([]);
    const [rules, setRules]               = useState([]);
    const [loading, setLoading]           = useState(true);
    const [toast, setToast]               = useState(null);
    const [filterDecision, setFilterDecision] = useState('');
    const [filterStatus, setFilterStatus]     = useState('');
    const [showEvalModal, setShowEvalModal]   = useState(false);
    const [inspectRecord, setInspectRecord]   = useState(null);
    const [actionLoading, setActionLoading]   = useState(null);

    const showToast = useCallback((message, type = 'info') => setToast({ message, type }), []);

    // ── Load data ──────────────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [histRes, refRes, studRes, rulesRes] = await Promise.all([
                getPromotionHistory({ approvalStatus: filterStatus }),
                getReferenceData(),
                listStudents(),
                listRules({ is_active: true }),
            ]);
            setHistory(histRes.data || []);
            setRefData(refRes.data || { programs: [], academicYears: [], semesters: [] });
            setStudents(studRes.data || []);
            setRules(rulesRes.data || []);
        } catch (err) {
            showToast('Failed to load promotion history', 'error');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, showToast]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleApprove = async (recordId) => {
        setActionLoading(recordId);
        try {
            await approvePromotionDecision(recordId, { remarks: 'Manually approved via Admin Dashboard' });
            showToast('Promotion decision approved & applied', 'success');
            loadData();
        } catch (err) {
            showToast(err.response?.data?.message || 'Approval failed', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Metrics ────────────────────────────────────────────────
    const totalEvaluated = history.length;
    const promotedCount  = history.filter(h => h.decision === 'PROMOTED').length;
    const atktCount      = history.filter(h => h.decision === 'PROMOTED_WITH_ATKT').length;
    const repeatCount    = history.filter(h => h.decision === 'REPEAT_SEMESTER' || h.decision === 'DETAINED').length;
    const graduatedCount = history.filter(h => h.decision === 'GRADUATED').length;

    const visibleHistory = history.filter(h => {
        if (!filterDecision) return true;
        return h.decision === filterDecision;
    });

    return (
        <div className="p-6 md:p-10 space-y-10 bg-[#fcfdfe] min-h-screen">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <TrendingUp className="text-[#ef4444]" size={36} />
                        Academic Promotion Engine
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2">
                        <ShieldCheck size={13} className="text-indigo-400" />
                        Dynamic Rule-Based Evaluation · Result Publication Workflows · Audit Snapshot History
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={loadData} className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[#1a1b4b] hover:shadow-md transition-all flex items-center gap-2">
                        <RefreshCw size={13} /> Refresh
                    </button>
                    <button
                        onClick={() => setShowEvalModal(true)}
                        className="px-6 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20 hover:bg-[#2d3a8c] transition-all flex items-center gap-2"
                    >
                        <Play size={14} fill="currentColor" /> Evaluate Student
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
                {[
                    { label: 'Total Evaluated', value: totalEvaluated, icon: UserCheck,     color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Promoted',        value: promotedCount,  icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Promoted (ATKT)', value: atktCount,      icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-50' },
                    { label: 'Repeat / Detained',value: repeatCount,   icon: XCircle,       color: 'text-red-500',      bg: 'bg-red-50' },
                    { label: 'Graduated',       value: graduatedCount, icon: GraduationCap, color: 'text-purple-600',  bg: 'bg-purple-50' },
                ].map((c, i) => (
                    <div key={i} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 group relative overflow-hidden">
                        <div className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full ${c.bg} opacity-30 group-hover:scale-150 transition-transform duration-700`} />
                        <div className={`p-2.5 rounded-2xl ${c.bg} ${c.color} inline-flex mb-3 group-hover:scale-110 transition-transform`}>
                            <c.icon size={16} strokeWidth={2.5} />
                        </div>
                        <div className="text-2xl font-black text-[#1a1b4b] tracking-tighter">{c.value}</div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{c.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Active Rule Warning Banner ─────────────────────── */}
            {rules.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
                    <AlertTriangle className="text-amber-600 shrink-0" size={24} />
                    <div>
                        <p className="text-xs font-black text-amber-800 uppercase tracking-tight">No Active Academic Rule Configured</p>
                        <p className="text-xs text-amber-700 font-bold mt-0.5">
                            Please configure and activate an academic rule in the <strong>Academic Rules Engine</strong> before running promotion evaluations.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Search & Filters ────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3">
                    <Filter size={14} className="text-gray-400" />
                    <select
                        value={filterDecision}
                        onChange={e => setFilterDecision(e.target.value)}
                        className="px-4 py-2.5 rounded-2xl bg-white border border-gray-100 text-xs font-black text-gray-500 uppercase tracking-widest focus:outline-none cursor-pointer shadow-sm"
                    >
                        <option value="">All Decision Types</option>
                        <option value="PROMOTED">PROMOTED</option>
                        <option value="PROMOTED_WITH_ATKT">PROMOTED WITH ATKT</option>
                        <option value="REPEAT_SEMESTER">REPEAT SEMESTER</option>
                        <option value="DETAINED">DETAINED</option>
                        <option value="GRADUATED">GRADUATED</option>
                    </select>

                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="px-4 py-2.5 rounded-2xl bg-white border border-gray-100 text-xs font-black text-gray-500 uppercase tracking-widest focus:outline-none cursor-pointer shadow-sm"
                    >
                        <option value="">All Approval Statuses</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
                    </select>
                </div>
            </div>

            {/* ── Promotion History Table ─────────────────────────── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="w-10 h-10 text-[#1a1b4b] animate-spin" />
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Loading Promotion History…</p>
                </div>
            ) : visibleHistory.length === 0 ? (
                <div className="text-center py-24 space-y-4">
                    <TrendingUp size={48} className="mx-auto text-gray-200" />
                    <h3 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tighter">No Promotion History Found</h3>
                    <p className="text-xs text-gray-400 font-bold">Run an evaluation for a student to generate promotion decisions.</p>
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-gray-100">
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Decision</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">SGPA / CGPA</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Backlogs</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Rule Applied</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Approval</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {visibleHistory.map(row => (
                                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#1a1b4b] text-white rounded-2xl flex items-center justify-center font-black text-sm uppercase">
                                                {row.student?.full_name?.charAt(0) || 'S'}
                                            </div>
                                            <div>
                                                <p className="font-black text-[#1a1b4b] text-sm uppercase tracking-tight">{row.student?.full_name || 'Student'}</p>
                                                <p className="text-[11px] text-gray-400 font-mono">{new Date(row.decided_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <DecisionBadge decision={row.decision} />
                                    </td>
                                    <td className="p-6">
                                        <div className="text-xs font-black text-[#1a1b4b]">
                                            SGPA: {row.sgpa ?? '—'} <span className="text-gray-300">|</span> CGPA: {row.cgpa ?? '—'}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className={`text-xs font-black ${row.backlogs_at_decision > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {row.backlogs_at_decision} backlog(s)
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        <span className="text-xs font-black text-[#1a1b4b]">
                                            {row.rule?.rule_name || 'Global Fallback'} <span className="text-gray-400 text-[10px]">v{row.rule?.version || 1}</span>
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                                            row.approval_status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>
                                            {row.approval_status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setInspectRecord(row)}
                                                title="Inspect evaluation details"
                                                className="p-2.5 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {row.approval_status === 'PENDING_APPROVAL' && (
                                                <button
                                                    onClick={() => handleApprove(row.id)}
                                                    disabled={actionLoading === row.id}
                                                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-sm"
                                                >
                                                    {actionLoading === row.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                                    Approve
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Evaluation Modal ─────────────────────────────────── */}
            {showEvalModal && (
                <EvaluationModal
                    students={students}
                    refData={refData}
                    onClose={() => setShowEvalModal(false)}
                    onSuccess={(msg) => {
                        setShowEvalModal(false);
                        showToast(msg, 'success');
                        loadData();
                    }}
                    onError={(msg) => showToast(msg, 'error')}
                />
            )}

            {/* ── Inspect Details Drawer ────────────────────────────── */}
            {inspectRecord && (
                <InspectDrawer
                    record={inspectRecord}
                    onClose={() => setInspectRecord(null)}
                />
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATION MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const EvaluationModal = ({ students, refData, onClose, onSuccess, onError }) => {
    const [studentId, setStudentId] = useState('');
    const [fromSem, setFromSem]     = useState('');
    const [fromYear, setFromYear]   = useState('');
    const [toSem, setToSem]         = useState('');
    const [toYear, setToYear]       = useState('');
    const [autoApprove, setAutoApprove] = useState(true);
    const [submitting, setSubmitting]   = useState(false);

    useEffect(() => {
        if (refData.semesters?.length > 0 && !fromSem) setFromSem(refData.semesters[0].id);
        if (refData.academicYears?.length > 0 && !fromYear) setFromYear(refData.academicYears[0].id);
    }, [refData, fromSem, fromYear]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!studentId || !fromSem || !fromYear) {
            onError('Please select student, semester, and academic year');
            return;
        }

        setSubmitting(true);
        try {
            const res = await evaluateStudentPromotion({
                student_id: studentId,
                from_semester_id: fromSem,
                from_academic_year_id: fromYear,
                to_semester_id: toSem || null,
                to_academic_year_id: toYear || null,
                auto_approve: autoApprove,
            });
            onSuccess(`Evaluation complete: Decision is ${res.data?.evaluation?.decision}`);
        } catch (err) {
            onError(err.response?.data?.message || 'Evaluation failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#1a1b4b]/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl border border-white/30 animate-in zoom-in-95 space-y-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-2">
                            <TrendingUp size={22} className="text-[#ef4444]" /> Run Promotion Evaluation
                        </h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Evaluates results, attendance, credits & backlogs dynamically
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Student *</label>
                        <select
                            value={studentId}
                            onChange={e => setStudentId(e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] outline-none cursor-pointer"
                        >
                            <option value="">Select Student...</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.full_name} ({s.lifecycle_status})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Source Semester *</label>
                            <select value={fromSem} onChange={e => setFromSem(e.target.value)} className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] outline-none cursor-pointer">
                                {refData.semesters.map(s => <option key={s.id} value={s.id}>Semester {s.term}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Source Year *</label>
                            <select value={fromYear} onChange={e => setFromYear(e.target.value)} className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] outline-none cursor-pointer">
                                {refData.academicYears.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Semester (Optional)</label>
                            <select value={toSem} onChange={e => setToSem(e.target.value)} className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] outline-none cursor-pointer">
                                <option value="">Auto Next</option>
                                {refData.semesters.map(s => <option key={s.id} value={s.id}>Semester {s.term}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Year (Optional)</label>
                            <select value={toYear} onChange={e => setToYear(e.target.value)} className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] outline-none cursor-pointer">
                                <option value="">Auto Next</option>
                                {refData.academicYears.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer pt-2">
                        <input
                            type="checkbox"
                            checked={autoApprove}
                            onChange={e => setAutoApprove(e.target.checked)}
                            className="w-5 h-5 rounded-lg border-2 border-gray-200 text-[#1a1b4b] focus:ring-0"
                        />
                        <div>
                            <p className="text-xs font-black text-[#1a1b4b] uppercase tracking-tight">Auto Approve & Apply Side-Effects</p>
                            <p className="text-[10px] text-gray-400 font-bold">Immediately updates student history, lifecycle status & sends notification</p>
                        </div>
                    </label>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !studentId}
                            className="flex-1 py-3 bg-[#1a1b4b] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20 hover:bg-[#2d3a8c] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                            {submitting ? 'Evaluating…' : 'Run Evaluation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// INSPECT DRAWER
// ═══════════════════════════════════════════════════════════════════════════════
const InspectDrawer = ({ record, onClose }) => {
    const metrics = record.evaluation_metrics?.metrics || {};
    const evalData = record.evaluation_metrics?.evaluation || {};
    const checks = evalData.checks || {};

    return (
        <div className="fixed inset-0 z-[200] flex" onClick={onClose}>
            <div className="flex-1 bg-[#1a1b4b]/30 backdrop-blur-sm" />
            <div
                className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-5"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-8 border-b border-gray-100 flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-2">
                            <Info size={20} className="text-indigo-500" /> Evaluation Inspector
                        </h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">{record.student?.full_name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Final Decision */}
                    <div className="p-5 bg-slate-50/60 rounded-2xl border border-slate-100 space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Engine Decision</p>
                        <DecisionBadge decision={record.decision} />
                        {record.remarks && (
                            <p className="text-xs font-bold text-gray-500 italic pt-2">"{record.remarks}"</p>
                        )}
                    </div>

                    {/* Criteria Checks Grid */}
                    <div className="space-y-3">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Criteria Verification Checks</p>
                        {[
                            { label: 'Attendance Check', status: checks.meets_attendance, detail: `${metrics.attendance_percent || 0}%` },
                            { label: 'SGPA Threshold', status: checks.meets_sgpa, detail: `SGPA: ${metrics.sgpa || 0}` },
                            { label: 'Backlog Limit', status: checks.meets_max_backlogs, detail: `${metrics.backlogs_count || 0} backlog(s)` },
                            { label: 'Promotion Credits', status: checks.meets_promo_credits, detail: `${metrics.earned_credits || 0} earned credits` },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2.5">
                                    {item.status ? (
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                    ) : (
                                        <XCircle size={16} className="text-red-400" />
                                    )}
                                    <span className="text-xs font-black text-[#1a1b4b] uppercase tracking-tight">{item.label}</span>
                                </div>
                                <span className="text-[11px] font-bold text-gray-400">{item.detail}</span>
                            </div>
                        ))}
                    </div>

                    {/* Applied Rule Details */}
                    <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Applied Academic Rule</p>
                        <p className="text-sm font-black text-[#1a1b4b] uppercase">{record.rule?.rule_name || 'Global Fallback Rule'}</p>
                        <p className="text-[11px] text-gray-400 font-bold">Policy: {checks.policy_applied || 'STANDARD'} · ATKT Allowed: {checks.allow_atkt ? 'YES' : 'NO'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AcademicPromotionAdmin;
