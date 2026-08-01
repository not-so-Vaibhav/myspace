import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Shield, Plus, Edit3, Trash2, Power, PowerOff, History,
    ChevronRight, RefreshCw, X, CheckCircle2, AlertTriangle,
    Info, GraduationCap, BookOpen, Award, Settings2,
    Loader2, Search, Filter, SlidersHorizontal, Clock,
    TrendingUp, Layers, AlertCircle
} from 'lucide-react';
import {
    listRules, getReferenceData, createRule, updateRule,
    activateRule, deactivateRule, deleteRule, getRuleHistory
} from '../../api/academicRulesApi';

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
    const icons = { success: <CheckCircle2 size={16} />, error: <AlertTriangle size={16} />, info: <Info size={16} /> };

    return (
        <div className={`fixed top-20 right-6 z-[300] ${styles[type]} text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-right-5 fade-in max-w-sm`}>
            <span className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center shrink-0">{icons[type]}</span>
            <span className="text-xs font-black uppercase tracking-widest">{message}</span>
            <button onClick={onClose} className="ml-auto text-white/60 hover:text-white"><X size={14} /></button>
        </div>
    );
};

// ── Field helpers ──────────────────────────────────────────────────────────────
const Field = ({ label, children, error, hint }) => (
    <div className="space-y-1.5">
        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
        {children}
        {error && <p className="text-[11px] font-bold text-red-400 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        {hint && !error && <p className="text-[11px] text-gray-400 font-bold">{hint}</p>}
    </div>
);

const inputClass = 'w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] focus:bg-white focus:border-[#1a1b4b]/30 outline-none transition-all placeholder:text-gray-300';
const errInputClass = 'border-red-200 bg-red-50/30';

// ── Policy Badge ───────────────────────────────────────────────────────────────
const PolicyBadge = ({ policy }) => {
    const styles = {
        STANDARD: 'bg-blue-50 text-blue-600 border-blue-100',
        STRICT:   'bg-red-50 text-red-600 border-red-100',
        LIBERAL:  'bg-emerald-50 text-emerald-600 border-emerald-100',
    };
    return (
        <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-widest border ${styles[policy] || 'bg-gray-50 text-gray-400 border-gray-100'}`}>
            {policy}
        </span>
    );
};

// ── Default form state ─────────────────────────────────────────────────────────
const DEFAULT_FORM = {
    rule_name: '',
    description: '',
    program_id: '',
    academic_year_id: '',
    semester_id: '',
    min_attendance_percent: 75,
    min_sgpa: 5.0,
    min_credits: 0,
    max_backlogs_allowed: 2,
    credits_required_for_promotion: 0,
    credits_required_for_graduation: 160,
    allow_atkt: true,
    promote_with_backlogs: false,
    promotion_policy: 'STANDARD',
    graduation_requirements: '{"internship": true, "project": true}',
};

// ── Validation ─────────────────────────────────────────────────────────────────
function validateForm(form) {
    const errors = {};
    const name = form.rule_name?.trim() || '';
    if (!name) errors.rule_name = 'Rule name is required';
    else if (name.length < 3) errors.rule_name = 'Rule name must be at least 3 characters';
    else if (name.length > 200) errors.rule_name = 'Rule name must be 200 characters or fewer';
    const att = parseFloat(form.min_attendance_percent);
    if (isNaN(att) || att < 0 || att > 100) errors.min_attendance_percent = 'Must be between 0 and 100';
    const sgpa = parseFloat(form.min_sgpa);
    if (isNaN(sgpa) || sgpa < 0 || sgpa > 10) errors.min_sgpa = 'Must be between 0 and 10';
    if (parseFloat(form.min_credits) < 0) errors.min_credits = 'Must be ≥ 0';
    if (parseInt(form.max_backlogs_allowed) < 0) errors.max_backlogs_allowed = 'Must be ≥ 0';
    if (parseFloat(form.credits_required_for_promotion) < 0) errors.credits_required_for_promotion = 'Must be ≥ 0';
    if (parseFloat(form.credits_required_for_graduation) < 0) errors.credits_required_for_graduation = 'Must be ≥ 0';
    try { JSON.parse(form.graduation_requirements); }
    catch { errors.graduation_requirements = 'Must be valid JSON'; }
    return errors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const AcademicRulesAdmin = () => {
    // ── State ──────────────────────────────────────────────────
    const [rules, setRules]               = useState([]);
    const [refData, setRefData]           = useState({ programs: [], academicYears: [], semesters: [] });
    const [loading, setLoading]           = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [toast, setToast]               = useState(null);
    const [search, setSearch]             = useState('');
    const [filterActive, setFilterActive] = useState('all');       // 'all' | 'active' | 'inactive'
    const [filterProgram, setFilterProgram] = useState('');
    const [showForm, setShowForm]         = useState(false);
    const [editingRule, setEditingRule]   = useState(null);
    const [form, setForm]                 = useState(DEFAULT_FORM);
    const [formErrors, setFormErrors]     = useState({});
    const [historyRule, setHistoryRule]   = useState(null);
    const [historyData, setHistoryData]   = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [submitting, setSubmitting]     = useState(false);

    const showToast = useCallback((message, type = 'info') => setToast({ message, type }), []);

    // ── Load data ──────────────────────────────────────────────
    const loadRules = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterActive !== 'all') params.is_active = filterActive === 'active';
            if (filterProgram) params.program_id = filterProgram;
            const res = await listRules(params);
            setRules(res.data || []);
        } catch (err) {
            showToast('Failed to load rules', 'error');
        } finally {
            setLoading(false);
        }
    }, [filterActive, filterProgram, showToast]);

    const loadRefData = useCallback(async () => {
        try {
            const res = await getReferenceData();
            setRefData(res.data || { programs: [], academicYears: [], semesters: [] });
        } catch (err) {
            // non-fatal
        }
    }, []);

    useEffect(() => { loadRules(); }, [loadRules]);
    useEffect(() => { loadRefData(); }, [loadRefData]);

    // ── Filtered view ──────────────────────────────────────────
    const visibleRules = rules.filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return r.rule_name.toLowerCase().includes(q) ||
               r.description?.toLowerCase().includes(q) ||
               r.promotion_policy?.toLowerCase().includes(q);
    });

    // ── Form helpers ───────────────────────────────────────────
    const openCreate = () => {
        setEditingRule(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setShowForm(true);
    };

    const openEdit = (rule) => {
        setEditingRule(rule);
        setForm({
            rule_name: rule.rule_name || '',
            description: rule.description || '',
            program_id: rule.program_id || '',
            academic_year_id: rule.academic_year_id || '',
            semester_id: rule.semester_id || '',
            min_attendance_percent: rule.min_attendance_percent ?? 75,
            min_sgpa: rule.min_sgpa ?? 5,
            min_credits: rule.min_credits ?? 0,
            max_backlogs_allowed: rule.max_backlogs_allowed ?? 2,
            credits_required_for_promotion: rule.credits_required_for_promotion ?? 0,
            credits_required_for_graduation: rule.credits_required_for_graduation ?? 160,
            allow_atkt: rule.allow_atkt ?? true,
            promote_with_backlogs: rule.promote_with_backlogs ?? false,
            promotion_policy: rule.promotion_policy || 'STANDARD',
            graduation_requirements: JSON.stringify(rule.graduation_requirements || {}, null, 2),
        });
        setFormErrors({});
        setShowForm(true);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errors = validateForm(form);
        if (Object.keys(errors).length) { setFormErrors(errors); return; }

        setSubmitting(true);
        try {
            const payload = {
                ...form,
                graduation_requirements: JSON.parse(form.graduation_requirements),
                program_id: form.program_id || null,
                academic_year_id: form.academic_year_id || null,
                semester_id: form.semester_id || null,
                min_attendance_percent: parseFloat(form.min_attendance_percent),
                min_sgpa: parseFloat(form.min_sgpa),
                min_credits: parseFloat(form.min_credits),
                max_backlogs_allowed: parseInt(form.max_backlogs_allowed),
                credits_required_for_promotion: parseFloat(form.credits_required_for_promotion),
                credits_required_for_graduation: parseFloat(form.credits_required_for_graduation),
            };

            if (editingRule) {
                await updateRule(editingRule.id, payload);
                showToast('Rule updated successfully', 'success');
            } else {
                await createRule(payload);
                showToast('Rule created successfully', 'success');
            }
            setShowForm(false);
            loadRules();
        } catch (err) {
            const data = err.response?.data;
            // Joi returns { status: 'error', message, details: [{ field, message }] }
            if (data?.details?.length) {
                const detail = data.details.map(d => `${d.field}: ${d.message}`).join('\n');
                showToast(`Validation error — ${data.details[0].message}`, 'error');
            } else {
                showToast(data?.message || 'Operation failed', 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ── Actions ────────────────────────────────────────────────
    const handleToggleActive = async (rule) => {
        setActionLoading(rule.id + '_toggle');
        try {
            if (rule.is_active) {
                await deactivateRule(rule.id);
                showToast(`"${rule.rule_name}" deactivated`, 'info');
            } else {
                await activateRule(rule.id);
                showToast(`"${rule.rule_name}" activated`, 'success');
            }
            loadRules();
        } catch (err) {
            showToast(err.response?.data?.message || 'Action failed', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (rule) => {
        if (!window.confirm(`Permanently delete "${rule.rule_name}"? This cannot be undone.`)) return;
        setActionLoading(rule.id + '_delete');
        try {
            await deleteRule(rule.id);
            showToast('Rule permanently deleted', 'success');
            loadRules();
        } catch (err) {
            showToast('Delete failed', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleViewHistory = async (rule) => {
        setHistoryRule(rule);
        setHistoryLoading(true);
        try {
            const res = await getRuleHistory(rule.id);
            setHistoryData(res.data || []);
        } catch (err) {
            setHistoryData([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    // ── Stats ──────────────────────────────────────────────────
    const totalRules    = rules.length;
    const activeRules   = rules.filter(r => r.is_active).length;
    const strictRules   = rules.filter(r => r.promotion_policy === 'STRICT').length;
    const atktRules     = rules.filter(r => r.allow_atkt).length;

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="p-6 md:p-10 space-y-10 bg-[#fcfdfe] min-h-screen">
            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <Shield className="text-[#ef4444]" size={36} />
                        Academic Rules Engine
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2">
                        <SlidersHorizontal size={13} className="text-indigo-400" />
                        Configure Academic Policies · Version Controlled · Fully Audited
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={loadRules} className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[#1a1b4b] hover:shadow-md transition-all flex items-center gap-2">
                        <RefreshCw size={13} /> Refresh
                    </button>
                    <button
                        onClick={openCreate}
                        className="px-6 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20 hover:bg-[#2d3a8c] transition-all flex items-center gap-2"
                    >
                        <Plus size={15} strokeWidth={3} /> New Rule
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Rules',    value: totalRules,  icon: Layers,        color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Active Rules',   value: activeRules, icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Strict Policy',  value: strictRules, icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50' },
                    { label: 'ATKT Allowed',   value: atktRules,   icon: Award,         color: 'text-amber-600',  bg: 'bg-amber-50' },
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

            {/* ── Filters & Search ────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                        type="text"
                        placeholder="Search rules..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-gray-100 text-sm font-bold text-[#1a1b4b] placeholder:text-gray-300 focus:outline-none focus:border-[#1a1b4b]/30 shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Filter size={14} className="text-gray-400" />
                    {['all', 'active', 'inactive'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterActive(f)}
                            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                filterActive === f
                                ? 'bg-[#1a1b4b] text-white shadow-md'
                                : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                    <select
                        value={filterProgram}
                        onChange={e => setFilterProgram(e.target.value)}
                        className="px-4 py-2 rounded-xl bg-white border border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-widest focus:outline-none cursor-pointer"
                    >
                        <option value="">All Programs</option>
                        {refData.programs.map(p => (
                            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Rules Table / Cards ──────────────────────────────── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="w-10 h-10 text-[#1a1b4b] animate-spin" />
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Loading Academic Rules…</p>
                </div>
            ) : visibleRules.length === 0 ? (
                <div className="text-center py-24 space-y-4">
                    <div className="w-20 h-20 bg-[#1a1b4b]/5 rounded-[2rem] flex items-center justify-center mx-auto">
                        <Shield size={36} className="text-[#1a1b4b]/20" />
                    </div>
                    <h3 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter">No Rules Found</h3>
                    <p className="text-sm text-gray-400 font-bold">
                        {rules.length === 0 ? 'Create your first academic rule to get started.' : 'Try adjusting your filters.'}
                    </p>
                    {rules.length === 0 && (
                        <button onClick={openCreate} className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1b4b] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-[#2d3a8c] transition-all mt-4">
                            <Plus size={14} /> Create First Rule
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {visibleRules.map(rule => (
                        <RuleCard
                            key={rule.id}
                            rule={rule}
                            programs={refData.programs}
                            actionLoading={actionLoading}
                            onEdit={openEdit}
                            onToggle={handleToggleActive}
                            onDelete={handleDelete}
                            onHistory={handleViewHistory}
                        />
                    ))}
                </div>
            )}

            {/* ── Create / Edit Modal ──────────────────────────────── */}
            {showForm && (
                <RuleFormModal
                    form={form}
                    errors={formErrors}
                    refData={refData}
                    editingRule={editingRule}
                    submitting={submitting}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    onClose={() => setShowForm(false)}
                />
            )}

            {/* ── History Drawer ───────────────────────────────────── */}
            {historyRule && (
                <HistoryDrawer
                    rule={historyRule}
                    history={historyData}
                    loading={historyLoading}
                    onClose={() => setHistoryRule(null)}
                />
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// RULE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const RuleCard = ({ rule, programs, actionLoading, onEdit, onToggle, onDelete, onHistory }) => {
    const isLoading = (suffix) => actionLoading === rule.id + suffix;
    const progName = programs.find(p => p.id === rule.program_id)?.code || 'Global';

    return (
        <div className={`bg-white rounded-[2rem] border ${rule.is_active ? 'border-gray-100' : 'border-gray-100 opacity-70'} shadow-sm hover:shadow-xl hover:shadow-[#1a1b4b]/5 transition-all duration-500 group overflow-hidden`}>
            {/* Status bar */}
            <div className={`h-1 w-full ${rule.is_active ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gray-200'}`} />

            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center">
                {/* Left: identity */}
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-widest border ${
                            rule.is_active
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-gray-50 text-gray-400 border-gray-100'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${rule.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-gray-300'}`} />
                            {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-[11px] font-black uppercase tracking-widest">
                            v{rule.version}
                        </span>
                        <PolicyBadge policy={rule.promotion_policy} />
                        <span className="px-2.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 rounded text-[11px] font-black uppercase">{progName}</span>
                    </div>
                    <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tighter leading-tight">{rule.rule_name}</h2>
                    {rule.description && (
                        <p className="text-sm text-gray-400 font-bold truncate">{rule.description}</p>
                    )}
                    {/* Metrics row */}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1">
                        {[
                            { label: 'Attendance', value: `${rule.min_attendance_percent}%`, icon: TrendingUp },
                            { label: 'Min SGPA',   value: rule.min_sgpa,   icon: Award },
                            { label: 'Max Backlogs', value: rule.max_backlogs_allowed, icon: BookOpen },
                            { label: 'Grad Credits', value: rule.credits_required_for_graduation, icon: GraduationCap },
                        ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500">
                                <Icon size={12} className="text-gray-300" />
                                <span className="text-gray-300 uppercase tracking-widest text-[10px]">{label}:</span>
                                <span className="text-[#1a1b4b]">{value}</span>
                            </div>
                        ))}
                        {rule.allow_atkt && (
                            <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-widest">ATKT Allowed</span>
                        )}
                    </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-2 md:shrink-0">
                    <button onClick={() => onHistory(rule)} title="View history" className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:bg-indigo-50 hover:text-indigo-500 transition-all">
                        <History size={16} />
                    </button>
                    <button onClick={() => onEdit(rule)} title="Edit rule" className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:bg-amber-50 hover:text-amber-500 transition-all">
                        <Edit3 size={16} />
                    </button>
                    <button
                        onClick={() => onToggle(rule)}
                        disabled={!!isLoading('_toggle')}
                        title={rule.is_active ? 'Deactivate' : 'Activate'}
                        className={`p-2.5 rounded-xl transition-all ${
                            rule.is_active
                            ? 'bg-emerald-50 text-emerald-500 hover:bg-red-50 hover:text-red-500'
                            : 'bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500'
                        }`}
                    >
                        {isLoading('_toggle') ? <Loader2 size={16} className="animate-spin" /> : rule.is_active ? <Power size={16} /> : <PowerOff size={16} />}
                    </button>
                    <button
                        onClick={() => onDelete(rule)}
                        disabled={!!isLoading('_delete')}
                        title="Delete permanently"
                        className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                        {isLoading('_delete') ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// RULE FORM MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const RuleFormModal = ({ form, errors, refData, editingRule, submitting, onChange, onSubmit, onClose }) => {
    const [tab, setTab] = useState('basic'); // 'basic' | 'credits' | 'policy' | 'graduation'

    const tabs = [
        { id: 'basic',      label: 'Basic',         icon: Settings2 },
        { id: 'credits',    label: 'Credits',        icon: Award },
        { id: 'policy',     label: 'Policy',         icon: Shield },
        { id: 'graduation', label: 'Graduation',     icon: GraduationCap },
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-[#1a1b4b]/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-white/30 animate-in zoom-in-95 max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 pt-8 pb-6 border-b border-gray-100 flex items-start justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                            <Shield className="text-[#ef4444]" size={24} />
                            {editingRule ? 'Edit Rule' : 'New Academic Rule'}
                        </h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {editingRule ? `Currently v${editingRule.version} — saved as v${editingRule.version + 1}` : 'Saved as Version 1'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl transition-colors">
                        <X size={22} className="text-gray-400" />
                    </button>
                </div>

                {/* Tab Bar */}
                <div className="px-8 pt-4 flex gap-1 shrink-0">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                tab === t.id
                                ? 'bg-[#1a1b4b] text-white shadow-md'
                                : 'text-gray-400 hover:bg-slate-50'
                            }`}
                        >
                            <t.icon size={12} />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="px-8 py-6 space-y-5 overflow-y-auto flex-1">

                        {/* BASIC TAB */}
                        {tab === 'basic' && (
                            <>
                                <Field label="Rule Name *" error={errors.rule_name}>
                                    <input name="rule_name" value={form.rule_name} onChange={onChange} placeholder="e.g. B.Tech Standard Policy 2025-26" className={`${inputClass} ${errors.rule_name ? errInputClass : ''}`} />
                                </Field>
                                <Field label="Description" error={errors.description}>
                                    <textarea name="description" value={form.description} onChange={onChange} rows={2} placeholder="Optional: briefly describe this rule's purpose" className={inputClass} />
                                </Field>

                                {/* Scope */}
                                <div className="bg-slate-50/60 rounded-2xl p-5 space-y-4 border border-slate-100">
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Layers size={12} /> Scope (leave blank for global default)
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Field label="Program">
                                            <select name="program_id" value={form.program_id} onChange={onChange} className={inputClass}>
                                                <option value="">All Programs</option>
                                                {refData.programs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Academic Year">
                                            <select name="academic_year_id" value={form.academic_year_id} onChange={onChange} className={inputClass}>
                                                <option value="">All Years</option>
                                                {refData.academicYears.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Semester">
                                            <select name="semester_id" value={form.semester_id} onChange={onChange} className={inputClass}>
                                                <option value="">All Semesters</option>
                                                {refData.semesters.map(s => <option key={s.id} value={s.id}>Sem {s.term}</option>)}
                                            </select>
                                        </Field>
                                    </div>
                                </div>

                                {/* Attendance & SGPA */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Min Attendance (%)" error={errors.min_attendance_percent} hint="0–100">
                                        <input type="number" name="min_attendance_percent" value={form.min_attendance_percent} onChange={onChange} min={0} max={100} step={0.5} className={`${inputClass} ${errors.min_attendance_percent ? errInputClass : ''}`} />
                                    </Field>
                                    <Field label="Min SGPA" error={errors.min_sgpa} hint="0–10">
                                        <input type="number" name="min_sgpa" value={form.min_sgpa} onChange={onChange} min={0} max={10} step={0.1} className={`${inputClass} ${errors.min_sgpa ? errInputClass : ''}`} />
                                    </Field>
                                </div>

                                <Field label="Max Backlogs Allowed" error={errors.max_backlogs_allowed} hint="0 = no backlogs tolerated">
                                    <input type="number" name="max_backlogs_allowed" value={form.max_backlogs_allowed} onChange={onChange} min={0} className={`${inputClass} ${errors.max_backlogs_allowed ? errInputClass : ''}`} />
                                </Field>
                            </>
                        )}

                        {/* CREDITS TAB */}
                        {tab === 'credits' && (
                            <>
                                <Field label="Minimum Credits (to pass semester)" error={errors.min_credits}>
                                    <input type="number" name="min_credits" value={form.min_credits} onChange={onChange} min={0} step={0.5} className={`${inputClass} ${errors.min_credits ? errInputClass : ''}`} />
                                </Field>
                                <Field label="Credits Required for Promotion" error={errors.credits_required_for_promotion}>
                                    <input type="number" name="credits_required_for_promotion" value={form.credits_required_for_promotion} onChange={onChange} min={0} step={0.5} className={`${inputClass} ${errors.credits_required_for_promotion ? errInputClass : ''}`} />
                                </Field>
                                <Field label="Credits Required for Graduation" error={errors.credits_required_for_graduation}>
                                    <input type="number" name="credits_required_for_graduation" value={form.credits_required_for_graduation} onChange={onChange} min={0} step={0.5} className={`${inputClass} ${errors.credits_required_for_graduation ? errInputClass : ''}`} />
                                </Field>
                            </>
                        )}

                        {/* POLICY TAB */}
                        {tab === 'policy' && (
                            <>
                                <Field label="Promotion Policy">
                                    <div className="grid grid-cols-3 gap-3">
                                        {['STANDARD', 'STRICT', 'LIBERAL'].map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => onChange({ target: { name: 'promotion_policy', value: p, type: 'text' } })}
                                                className={`py-3 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${
                                                    form.promotion_policy === p
                                                    ? p === 'STRICT' ? 'bg-red-500 text-white border-red-400 shadow-md'
                                                      : p === 'LIBERAL' ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                                                      : 'bg-[#1a1b4b] text-white border-[#1a1b4b] shadow-md'
                                                    : 'bg-white text-gray-400 border-gray-100 hover:bg-slate-50'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-gray-400 font-bold mt-2">
                                        {form.promotion_policy === 'STRICT' && 'All criteria must pass. Zero tolerance.'}
                                        {form.promotion_policy === 'STANDARD' && 'Standard promotion with limited backlogs.'}
                                        {form.promotion_policy === 'LIBERAL' && 'Promoted with backlogs; must clear in next attempt.'}
                                    </p>
                                </Field>

                                <div className="space-y-4 bg-slate-50/60 rounded-2xl p-5 border border-slate-100">
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Policy Flags</p>
                                    {[
                                        { name: 'allow_atkt', label: 'Allow ATKT (Allowed to Keep Terms)', desc: 'Students can be allowed with backlogs to next semester' },
                                        { name: 'promote_with_backlogs', label: 'Promote With Backlogs', desc: 'Automatically promote even with pending backlogs' },
                                    ].map(flag => (
                                        <label key={flag.name} className="flex items-start gap-4 cursor-pointer group">
                                            <div className="relative mt-0.5">
                                                <input type="checkbox" name={flag.name} checked={form[flag.name]} onChange={onChange} className="sr-only" />
                                                <div className={`w-12 h-6 rounded-full transition-all ${form[flag.name] ? 'bg-[#1a1b4b]' : 'bg-gray-200'}`}>
                                                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all ${form[flag.name] ? 'left-6' : 'left-0.5'}`} />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">{flag.label}</p>
                                                <p className="text-[11px] text-gray-400 font-bold">{flag.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* GRADUATION TAB */}
                        {tab === 'graduation' && (
                            <Field label="Graduation Requirements (JSON)" error={errors.graduation_requirements} hint='e.g. {"internship": true, "project": true, "ncc": false}'>
                                <textarea
                                    name="graduation_requirements"
                                    value={form.graduation_requirements}
                                    onChange={onChange}
                                    rows={8}
                                    className={`${inputClass} font-mono text-xs leading-relaxed ${errors.graduation_requirements ? errInputClass : ''}`}
                                    spellCheck={false}
                                />
                            </Field>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                        <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-100 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-3 bg-[#1a1b4b] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20 hover:bg-[#2d3a8c] transition-all flex items-center gap-2 disabled:opacity-60"
                        >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            {submitting ? 'Saving…' : editingRule ? 'Save Changes' : 'Create Rule'}
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
const HistoryDrawer = ({ rule, history, loading, onClose }) => {
    const actionStyle = {
        CREATED:     'bg-emerald-50 text-emerald-600 border-emerald-100',
        UPDATED:     'bg-blue-50 text-blue-600 border-blue-100',
        ACTIVATED:   'bg-teal-50 text-teal-600 border-teal-100',
        DEACTIVATED: 'bg-amber-50 text-amber-600 border-amber-100',
        DELETED:     'bg-red-50 text-red-600 border-red-100',
    };

    return (
        <div className="fixed inset-0 z-[200] flex" onClick={onClose}>
            <div className="flex-1 bg-[#1a1b4b]/30 backdrop-blur-sm" />
            <div
                className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-5"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-2">
                            <Clock size={20} className="text-indigo-500" /> Audit History
                        </h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">{rule.rule_name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 text-[#1a1b4b] animate-spin" />
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Loading History…</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-20 text-gray-300">
                            <Clock size={48} className="mx-auto mb-3" />
                            <p className="text-xs font-black uppercase tracking-widest">No history recorded yet</p>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
                            <div className="space-y-6">
                                {history.map((entry, i) => (
                                    <div key={entry.id || i} className="flex gap-5 relative">
                                        <div className="w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shrink-0 z-10">
                                            <div className="w-3 h-3 bg-[#1a1b4b]/40 rounded-full" />
                                        </div>
                                        <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <span className={`px-2.5 py-0.5 rounded border text-[10px] font-black uppercase tracking-widest ${actionStyle[entry.action] || 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                                    {entry.action}
                                                </span>
                                                <span className="text-[11px] font-bold text-gray-400">
                                                    v{entry.version} · {new Date(entry.changed_at).toLocaleString()}
                                                </span>
                                            </div>
                                            {entry.changed_by_profile?.full_name && (
                                                <p className="text-[11px] font-bold text-gray-400">
                                                    By: <span className="text-[#1a1b4b]">{entry.changed_by_profile.full_name}</span>
                                                    {entry.changed_by_profile.role && ` (${entry.changed_by_profile.role})`}
                                                </p>
                                            )}
                                            {entry.change_reason && (
                                                <p className="text-[11px] font-bold text-gray-400 italic">"{entry.change_reason}"</p>
                                            )}
                                            <details className="group">
                                                <summary className="text-[10px] font-black text-indigo-400 uppercase tracking-widest cursor-pointer list-none flex items-center gap-1">
                                                    <ChevronRight size={10} className="group-open:rotate-90 transition-transform" /> View Snapshot
                                                </summary>
                                                <pre className="mt-2 text-[10px] font-mono bg-white p-3 rounded-xl overflow-x-auto text-gray-500 border border-gray-100 max-h-48">
                                                    {JSON.stringify(entry.snapshot, null, 2)}
                                                </pre>
                                            </details>
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

export default AcademicRulesAdmin;
