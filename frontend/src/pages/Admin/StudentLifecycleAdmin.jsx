import { useState, useEffect, useCallback } from 'react';
import {
    Activity, Search, Filter, RefreshCw, ChevronRight, History,
    ShieldAlert, ArrowRight, UserCheck, AlertTriangle, CheckCircle2,
    X, Info, Clock, Loader2, Award, Zap, ShieldCheck, HelpCircle
} from 'lucide-react';
import {
    listStudents, getStatesMatrix, getStudentHistory,
    transitionStudentState, adminOverrideState
} from '../../api/studentLifecycleApi';

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

// ── Status Badge Component ─────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const styles = {
        APPLIED:           'bg-blue-50 text-blue-600 border-blue-100',
        ADMITTED:          'bg-indigo-50 text-indigo-600 border-indigo-100',
        REGISTERED:        'bg-teal-50 text-teal-600 border-teal-100',
        COURSE_REGISTERED: 'bg-cyan-50 text-cyan-600 border-cyan-100',
        ACTIVE:            'bg-emerald-50 text-emerald-600 border-emerald-100',
        EXAM_ELIGIBLE:     'bg-violet-50 text-violet-600 border-violet-100',
        RESULT_PUBLISHED:  'bg-purple-50 text-purple-600 border-purple-100',
        PROMOTED:          'bg-emerald-100 text-emerald-800 border-emerald-200 font-extrabold',
        ATKT:              'bg-amber-50 text-amber-600 border-amber-100',
        REPEAT:            'bg-amber-100 text-amber-700 border-amber-200',
        DETAINED:          'bg-red-50 text-red-600 border-red-100',
        SUSPENDED:         'bg-red-100 text-red-700 border-red-200',
        DROP_OUT:          'bg-gray-100 text-gray-600 border-gray-200',
        ON_LEAVE:          'bg-blue-100 text-blue-700 border-blue-200',
        GRADUATED:         'bg-[#1a1b4b] text-white border-[#1a1b4b] shadow-sm',
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-widest border ${styles[status] || 'bg-gray-50 text-gray-400 border-gray-100'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'GRADUATED' ? 'bg-amber-400 animate-pulse' : status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-current'}`} />
            {status.replace(/_/g, ' ')}
        </span>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const StudentLifecycleAdmin = () => {
    const [students, setStudents]           = useState([]);
    const [statesMatrix, setStatesMatrix]   = useState({ states: [], allowed_transitions: {} });
    const [loading, setLoading]             = useState(true);
    const [toast, setToast]                 = useState(null);
    const [search, setSearch]               = useState('');
    const [filterStatus, setFilterStatus]   = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showModal, setShowModal]         = useState(false);
    const [historyStudent, setHistoryStudent] = useState(null);
    const [historyData, setHistoryData]     = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const showToast = useCallback((message, type = 'info') => setToast({ message, type }), []);

    // ── Load data ──────────────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [studRes, matrixRes] = await Promise.all([
                listStudents({ status: filterStatus, search }),
                getStatesMatrix(),
            ]);
            setStudents(studRes.data || []);
            setStatesMatrix(matrixRes.data || { states: [], allowed_transitions: {} });
        } catch (err) {
            showToast('Failed to load student lifecycle records', 'error');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, search, showToast]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleOpenTransition = (student) => {
        setSelectedStudent(student);
        setShowModal(true);
    };

    const handleViewHistory = async (student) => {
        setHistoryStudent(student);
        setHistoryLoading(true);
        try {
            const res = await getStudentHistory(student.id);
            setHistoryData(res.data || []);
        } catch (err) {
            setHistoryData([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    // ── Stats ──────────────────────────────────────────────────
    const totalStudents = students.length;
    const activeCount   = students.filter(s => s.lifecycle_status === 'ACTIVE').length;
    const atktCount     = students.filter(s => s.lifecycle_status === 'ATKT').length;
    const graduatedCount = students.filter(s => s.lifecycle_status === 'GRADUATED').length;

    return (
        <div className="p-6 md:p-10 space-y-10 bg-[#fcfdfe] min-h-screen">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <Activity className="text-[#ef4444]" size={36} />
                        Student Lifecycle Engine
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2">
                        <Zap size={13} className="text-indigo-400" />
                        Automated State Machine · Strict Transition Validation · Admin Overrides & Audits
                    </p>
                </div>
                <button onClick={loadData} className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[#1a1b4b] hover:shadow-md transition-all flex items-center gap-2">
                    <RefreshCw size={13} /> Refresh
                </button>
            </div>

            {/* ── KPI Cards ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Enrolled', value: totalStudents, icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Active Students', value: activeCount,   icon: Activity,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'ATKT / Backlog',  value: atktCount,     icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Graduated',       value: graduatedCount, icon: Award,    color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((c, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 group relative overflow-hidden">
                        <div className={`absolute -right-3 -bottom-3 w-20 h-20 rounded-full ${c.bg} opacity-30 group-hover:scale-150 transition-transform duration-700`} />
                        <div className={`p-2.5 rounded-2xl ${c.bg} ${c.color} inline-flex mb-4 group-hover:scale-110 transition-transform`}>
                            <c.icon size={18} strokeWidth={2.5} />
                        </div>
                        <div className="text-3xl font-black text-[#1a1b4b] tracking-tighter">{c.value}</div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1">{c.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Search & Filter ─────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                        type="text"
                        placeholder="Search student by name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-gray-100 text-sm font-bold text-[#1a1b4b] placeholder:text-gray-300 focus:outline-none focus:border-[#1a1b4b]/30 shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Filter size={14} className="text-gray-400" />
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="px-4 py-3 rounded-2xl bg-white border border-gray-100 text-xs font-black text-gray-500 uppercase tracking-widest focus:outline-none cursor-pointer shadow-sm"
                    >
                        <option value="">All Lifecycle States</option>
                        {(statesMatrix.states || []).map(st => (
                            <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Student List Table ──────────────────────────────── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="w-10 h-10 text-[#1a1b4b] animate-spin" />
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Evaluating Lifecycle States…</p>
                </div>
            ) : students.length === 0 ? (
                <div className="text-center py-24 space-y-3">
                    <Activity size={48} className="mx-auto text-gray-200" />
                    <h3 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tighter">No Students Found</h3>
                    <p className="text-xs text-gray-400 font-bold">Try clearing your filters or search term.</p>
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-gray-100">
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Current State</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Allowed Transitions</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {students.map(s => {
                                const allowed = statesMatrix.allowed_transitions[s.lifecycle_status] || [];
                                return (
                                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-[#1a1b4b] text-white rounded-2xl flex items-center justify-center font-black text-sm uppercase">
                                                    {s.full_name?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <p className="font-black text-[#1a1b4b] text-sm uppercase tracking-tight">{s.full_name || 'Unnamed Student'}</p>
                                                    <p className="text-[11px] text-gray-400 font-mono">{s.id.slice(0, 8)}...</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-[11px] font-black uppercase text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                                                {s.role}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <StatusBadge status={s.lifecycle_status} />
                                        </td>
                                        <td className="p-6">
                                            {allowed.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {allowed.map(nxt => (
                                                        <span key={nxt} className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                                                            → {nxt.replace(/_/g, ' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                                    {s.lifecycle_status === 'GRADUATED' ? 'Locked (Graduated)' : 'Terminal State'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewHistory(s)}
                                                    title="Lifecycle History"
                                                    className="p-2.5 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                                                >
                                                    <History size={16} />
                                                </button>
                                                {s.lifecycle_status !== 'GRADUATED' && (
                                                    <button
                                                        onClick={() => handleOpenTransition(s)}
                                                        className="px-4 py-2 bg-[#1a1b4b] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#2d3a8c] transition-all flex items-center gap-1.5 shadow-md"
                                                    >
                                                        Transition <ArrowRight size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Transition Modal ─────────────────────────────────── */}
            {showModal && selectedStudent && (
                <TransitionModal
                    student={selectedStudent}
                    statesMatrix={statesMatrix}
                    onClose={() => setShowModal(false)}
                    onSuccess={(msg) => {
                        setShowModal(false);
                        showToast(msg, 'success');
                        loadData();
                    }}
                    onError={(msg) => showToast(msg, 'error')}
                />
            )}

            {/* ── History Timeline Drawer ──────────────────────────── */}
            {historyStudent && (
                <LifecycleHistoryDrawer
                    student={historyStudent}
                    history={historyData}
                    loading={historyLoading}
                    onClose={() => setHistoryStudent(null)}
                />
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION MODAL (Standard + Admin Override)
// ═══════════════════════════════════════════════════════════════════════════════
const TransitionModal = ({ student, statesMatrix, onClose, onSuccess, onError }) => {
    const [isOverride, setIsOverride]   = useState(false);
    const [targetState, setTargetState] = useState('');
    const [reason, setReason]           = useState('');
    const [submitting, setSubmitting]   = useState(false);

    const allowedNext = (statesMatrix.allowed_transitions[student.lifecycle_status] || [])
        .filter(st => st !== student.lifecycle_status);
    const allStates   = statesMatrix.states || [];
    const handleExecute = async (e) => {
        e.preventDefault();
        if (!targetState) { onError('Please select a target state'); return; }

        setSubmitting(true);
        try {
            if (isOverride) {
                const trimmedReason = reason.trim();
                if (!trimmedReason) {
                    onError('An override reason is mandatory.');
                    setSubmitting(false);
                    return;
                }
                if (trimmedReason.length < 5) {
                    onError('Override reason must be at least 5 characters long.');
                    setSubmitting(false);
                    return;
                }
                await adminOverrideState(student.id, { target_state: targetState, reason: trimmedReason });
                onSuccess(`Admin override applied: ${student.full_name} is now ${targetState}`);
            } else {
                await transitionStudentState(student.id, { target_state: targetState, reason });
                onSuccess(`${student.full_name} transitioned to ${targetState}`);
            }
        } catch (err) {
            const data = err.response?.data;
            if (data?.details?.length) {
                onError(`Validation failed: ${data.details[0].message}`);
            } else {
                onError(data?.message || err.message || 'Transition failed');
            }
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
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-2">
                            <Activity size={22} className="text-[#ef4444]" /> Lifecycle Transition
                        </h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {student.full_name}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Current State Indicator */}
                <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Current State</span>
                    <StatusBadge status={student.lifecycle_status} />
                </div>

                {/* Standard / Admin Override Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => { setIsOverride(false); setTargetState(''); }}
                        className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${
                            !isOverride ? 'bg-white text-[#1a1b4b] shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Standard Transition
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsOverride(true); setTargetState(''); }}
                        className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1 ${
                            isOverride ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400 hover:text-red-500'
                        }`}
                    >
                        <ShieldAlert size={12} /> Admin Override
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleExecute} className="space-y-4">
                    {/* Target State Selection */}
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                            {isOverride ? 'Override Target State *' : 'Allowed Next State *'}
                        </label>
                        {!isOverride ? (
                            allowedNext.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {allowedNext.map(st => (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => setTargetState(st)}
                                            className={`p-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all text-left ${
                                                targetState === st
                                                ? 'bg-[#1a1b4b] text-white border-[#1a1b4b] shadow-md'
                                                : 'bg-slate-50 text-gray-500 border-slate-100 hover:bg-white hover:border-gray-200'
                                            }`}
                                        >
                                            → {st.replace(/_/g, ' ')}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-amber-600 font-bold bg-amber-50 p-3 rounded-xl border border-amber-100">
                                    No standard next transitions available from "{student.lifecycle_status}". Use Admin Override if required.
                                </p>
                            )
                        ) : (
                            <select
                                value={targetState}
                                onChange={e => setTargetState(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] outline-none cursor-pointer"
                            >
                                <option value="">Select Target State...</option>
                                {allStates.filter(s => s !== student.lifecycle_status && s !== 'GRADUATED').map(st => (
                                    <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Reason Field */}
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                            {isOverride ? 'Mandatory Override Reason *' : 'Reason / Note (Optional)'}
                        </label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={3}
                            placeholder={isOverride ? "e.g. Granted special exemption by Dean approval dated 2026-07-25" : "e.g. Passed all semester clearance exams"}
                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] outline-none placeholder:text-gray-300"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !targetState}
                            className={`flex-1 py-3 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${
                                isOverride ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-[#1a1b4b] hover:bg-[#2d3a8c] shadow-[#1a1b4b]/20'
                            } disabled:opacity-50`}
                        >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : isOverride ? <ShieldAlert size={14} /> : <CheckCircle2 size={14} />}
                            {submitting ? 'Updating…' : isOverride ? 'Confirm Override' : 'Apply Transition'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY DRAWER
// ═══════════════════════════════════════════════════════════════════════════════
const LifecycleHistoryDrawer = ({ student, history, loading, onClose }) => {
    return (
        <div className="fixed inset-0 z-[200] flex" onClick={onClose}>
            <div className="flex-1 bg-[#1a1b4b]/30 backdrop-blur-sm" />
            <div
                className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-5"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-8 border-b border-gray-100 flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-2">
                            <Clock size={20} className="text-indigo-500" /> Lifecycle Audit History
                        </h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">{student.full_name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 text-[#1a1b4b] animate-spin" />
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Loading Timeline…</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-20 text-gray-300">
                            <History size={48} className="mx-auto mb-3" />
                            <p className="text-xs font-black uppercase tracking-widest">No state changes recorded yet</p>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
                            <div className="space-y-6">
                                {history.map((entry, i) => (
                                    <div key={entry.id || i} className="flex gap-4 relative">
                                        <div className="w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shrink-0 z-10">
                                            <div className={`w-3 h-3 rounded-full ${entry.transition_type === 'ADMIN_OVERRIDE' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                        </div>
                                        <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-1.5 font-black text-xs text-[#1a1b4b] uppercase">
                                                    <span>{entry.from_state || 'START'}</span>
                                                    <ArrowRight size={12} className="text-gray-400" />
                                                    <span className="text-indigo-600">{entry.to_state}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                                    entry.transition_type === 'ADMIN_OVERRIDE' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>
                                                    {entry.transition_type}
                                                </span>
                                            </div>
                                            {entry.reason && (
                                                <p className="text-[11px] font-bold text-gray-500 italic">"{entry.reason}"</p>
                                            )}
                                            <div className="text-[10px] text-gray-400 font-bold flex justify-between pt-1 border-t border-gray-100">
                                                <span>{entry.changed_by_profile?.full_name ? `By ${entry.changed_by_profile.full_name}` : 'System Trigger'}</span>
                                                <span>{new Date(entry.changed_at).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentLifecycleAdmin;
