// frontend/src/pages/Admin/EnterpriseCreditAdminPortal.jsx
// Enterprise Academic Credit Admin Portal — redesigned to match project theme

import React, { useState, useEffect, useCallback } from 'react';
import {
    Settings,
    FileText,
    Download,
    Printer,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    Layers,
    Award,
    TrendingUp,
    BookOpen,
    GraduationCap,
    X,
    BarChart2,
    ShieldCheck,
    Loader2,
    Info
} from 'lucide-react';
import creditApi from '../../api/creditApi';

// ── Toast ─────────────────────────────────────────────────────────────────────
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
        info:    <Info size={16} />
    };

    return (
        <div className={`fixed top-20 right-6 z-[300] ${styles[type]} text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-right-5 fade-in max-w-sm`}>
            <span className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center shrink-0">{icons[type]}</span>
            <span className="text-xs font-black uppercase tracking-widest">{message}</span>
            <button onClick={onClose} className="ml-auto text-white/60 hover:text-white"><X size={14} /></button>
        </div>
    );
};

// ── Field label ──────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
    <div className="space-y-1.5">
        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
        {children}
    </div>
);

const inputClass = 'w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-[#1a1b4b] focus:bg-white focus:border-[#1a1b4b]/30 outline-none transition-all placeholder:text-gray-300';

// ═══════════════════════════════════════════════════════════════════════════════
const EnterpriseCreditAdminPortal = () => {
    const [rules, setRules] = useState([]);
    const [loadingRules, setLoadingRules] = useState(true);
    const [savingRule, setSavingRule] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [toast, setToast] = useState(null);

    // Reports State
    const [selectedReport, setSelectedReport] = useState('DEPARTMENT_CREDIT_SUMMARY');
    const [reportData, setReportData] = useState([]);
    const [loadingReport, setLoadingReport] = useState(false);

    // Bulk Sync State
    const [syncingBulk, setSyncingBulk] = useState(false);
    const [bulkMessage, setBulkMessage] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        rule_name: 'Standard Institutional Credit Policy (2026)',
        min_semester_credits: 12.0,
        max_semester_credits: 26.0,
        graduation_required_credits: 160.0,
        honours_required_credits: 20.0,
        minor_required_credits: 18.0,
        max_elective_credits_per_sem: 12.0,
        max_open_elective_credits_per_sem: 6.0,
        is_active: true
    });

    const showToast = useCallback((message, type = 'info') => setToast({ message, type }), []);

    const fetchRules = async () => {
        setLoadingRules(true);
        try {
            const res = await creditApi.getRules();
            if (res?.data?.length > 0) {
                setRules(res.data);
                const active = res.data.find(r => r.is_active) || res.data[0];
                setFormData(active);
            }
        } catch (err) {
            console.error('Error fetching credit rules:', err);
        } finally {
            setLoadingRules(false);
        }
    };

    const fetchReport = async (reportType) => {
        setLoadingReport(true);
        try {
            const res = await creditApi.getReports(reportType);
            setReportData(res?.data || []);
        } catch (err) {
            setReportData([]);
        } finally {
            setLoadingReport(false);
        }
    };

    useEffect(() => {
        fetchRules();
        fetchReport(selectedReport);
    }, []);

    const handleRuleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (isNaN(value) ? value : parseFloat(value))
        }));
    };

    const handleSaveRule = async (e) => {
        e.preventDefault();
        setSavingRule(true);
        setSaveSuccess(false);
        try {
            await creditApi.upsertRule(formData);
            setSaveSuccess(true);
            showToast('Credit policy saved successfully!', 'success');
            await fetchRules();
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            showToast('Failed to save credit rule settings.', 'error');
        } finally {
            setSavingRule(false);
        }
    };

    const handleBulkSync = async () => {
        setSyncingBulk(true);
        setBulkMessage(null);
        try {
            const res = await creditApi.bulkRecalculate([]);
            setBulkMessage(res.message || 'University credits synchronized successfully.');
            showToast('Bulk sync complete!', 'success');
        } catch (err) {
            setBulkMessage('Error synchronizing university credits.');
            showToast('Sync failed. Try again.', 'error');
        } finally {
            setSyncingBulk(false);
        }
    };

    const handleExportCSV = () => {
        if (!reportData?.length) return;
        const headers = Object.keys(reportData[0]);
        const rows = reportData.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedReport.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    // ── KPI Stats ──────────────────────────────────────────────────────────────
    const activeRule = rules.find(r => r.is_active);
    const kpiCards = [
        {
            label: 'Credit Policies',
            value: loadingRules ? '—' : rules.length,
            icon: Layers,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
        },
        {
            label: 'Min Credits / Sem',
            value: loadingRules ? '—' : (activeRule?.min_semester_credits ?? formData.min_semester_credits),
            icon: BookOpen,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            label: 'Max Credits / Sem',
            value: loadingRules ? '—' : (activeRule?.max_semester_credits ?? formData.max_semester_credits),
            icon: TrendingUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            label: 'Graduation Req.',
            value: loadingRules ? '—' : (activeRule?.graduation_required_credits ?? formData.graduation_required_credits),
            icon: GraduationCap,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
    ];

    const reportTabs = [
        { key: 'DEPARTMENT_CREDIT_SUMMARY', label: 'Department Summary' },
        { key: 'STUDENT_CREDIT_REPORT',     label: 'Student Credits' },
        { key: 'GRADUATION_CREDIT_REPORT',  label: 'Graduation Eligibility' },
        { key: 'BACKLOG_CREDIT_REPORT',     label: 'Backlog Credits' },
        { key: 'CREDIT_DEFICIT_REPORT',     label: 'Deficit Report' },
    ];

    return (
        <div className="p-6 md:p-10 space-y-10 bg-[#fcfdfe] min-h-screen">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <Award className="text-[#4B7BFF]" size={36} />
                        Credit System Admin
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2">
                        <ShieldCheck size={13} className="text-indigo-400" />
                        Configure Credit Policies · Generate Reports · Sync University-Wide Credits
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchRules}
                        className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[#1a1b4b] hover:shadow-md transition-all flex items-center gap-2"
                    >
                        <RefreshCw size={13} /> Refresh
                    </button>
                    <button
                        onClick={handleBulkSync}
                        disabled={syncingBulk}
                        className="px-6 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20 hover:bg-[#2d3a8c] transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={15} className={syncingBulk ? 'animate-spin' : ''} />
                        {syncingBulk ? 'Syncing...' : 'Bulk Recalculate All'}
                    </button>
                </div>
            </div>

            {/* ── Bulk Sync Status ────────────────────────────────────────────── */}
            {bulkMessage && (
                <div className="flex items-center gap-3 px-5 py-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-sm font-bold">
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                    {bulkMessage}
                </div>
            )}

            {/* ── KPI Stats ────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((c, i) => (
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

            {/* ── Two-Column Layout: Rules Config + Reports ──────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ── Column 1: Credit Rules Form ──────────────────────────── */}
                <div className="lg:col-span-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-7 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-2xl bg-indigo-50">
                                <Settings size={18} className="text-indigo-600" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-[#1a1b4b] uppercase tracking-tight">
                                    Institutional Credit Rules
                                </h2>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Active policy configuration</p>
                            </div>
                        </div>
                        {saveSuccess && (
                            <span className="flex items-center gap-1 text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
                                <CheckCircle2 size={13} /> Saved!
                            </span>
                        )}
                    </div>

                    {loadingRules ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-8 h-8 text-[#1a1b4b] animate-spin" />
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Loading Policies…</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSaveRule} className="space-y-4">
                            <Field label="Policy Title">
                                <input
                                    type="text"
                                    name="rule_name"
                                    value={formData.rule_name}
                                    onChange={handleRuleChange}
                                    className={inputClass}
                                    placeholder="e.g. Standard Credit Policy 2026"
                                />
                            </Field>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Min Sem Credits">
                                    <input type="number" step="0.5" name="min_semester_credits"
                                        value={formData.min_semester_credits} onChange={handleRuleChange}
                                        className={inputClass} />
                                </Field>
                                <Field label="Max Sem Credits">
                                    <input type="number" step="0.5" name="max_semester_credits"
                                        value={formData.max_semester_credits} onChange={handleRuleChange}
                                        className={inputClass} />
                                </Field>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <Field label="Graduation">
                                    <input type="number" step="1" name="graduation_required_credits"
                                        value={formData.graduation_required_credits} onChange={handleRuleChange}
                                        className={inputClass} />
                                </Field>
                                <Field label="Honours">
                                    <input type="number" step="1" name="honours_required_credits"
                                        value={formData.honours_required_credits} onChange={handleRuleChange}
                                        className={inputClass} />
                                </Field>
                                <Field label="Minor">
                                    <input type="number" step="1" name="minor_required_credits"
                                        value={formData.minor_required_credits} onChange={handleRuleChange}
                                        className={inputClass} />
                                </Field>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Max Elective / Sem">
                                    <input type="number" step="1" name="max_elective_credits_per_sem"
                                        value={formData.max_elective_credits_per_sem} onChange={handleRuleChange}
                                        className={inputClass} />
                                </Field>
                                <Field label="Max Open Elec / Sem">
                                    <input type="number" step="1" name="max_open_elective_credits_per_sem"
                                        value={formData.max_open_elective_credits_per_sem} onChange={handleRuleChange}
                                        className={inputClass} />
                                </Field>
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-xs font-black text-[#1a1b4b] uppercase tracking-widest">Set as Active Policy</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="is_active" checked={formData.is_active}
                                        onChange={handleRuleChange} className="sr-only peer" />
                                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[#1a1b4b] transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={savingRule}
                                className="w-full py-3 bg-[#1a1b4b] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20 hover:bg-[#2d3a8c] transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                            >
                                {savingRule
                                    ? <><Loader2 size={15} className="animate-spin" /> Saving Policy…</>
                                    : 'Save Institutional Rules'
                                }
                            </button>
                        </form>
                    )}
                </div>

                {/* ── Column 2: Reports Panel ──────────────────────────────── */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-7 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-2xl bg-blue-50">
                                <BarChart2 size={18} className="text-[#4B7BFF]" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-[#1a1b4b] uppercase tracking-tight">
                                    University Credit Analytics
                                </h2>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    Generate compliance reports · Export CSV · Print
                                </p>
                            </div>
                        </div>

                        {/* Export Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={handleExportCSV}
                                disabled={!reportData.length}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Download size={13} /> Export CSV
                            </button>
                            <button
                                onClick={() => window.print()}
                                disabled={!reportData.length}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Printer size={13} /> Print / PDF
                            </button>
                        </div>
                    </div>

                    {/* Report Tab Pills */}
                    <div className="flex flex-wrap gap-2">
                        {reportTabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setSelectedReport(tab.key);
                                    fetchReport(tab.key);
                                }}
                                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                    selectedReport === tab.key
                                        ? 'bg-[#1a1b4b] text-white shadow-md shadow-[#1a1b4b]/20'
                                        : 'bg-slate-50 text-gray-400 border border-gray-100 hover:text-[#1a1b4b] hover:bg-slate-100'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Report Table */}
                    {loadingReport ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 text-[#1a1b4b] animate-spin" />
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Generating Report…</p>
                        </div>
                    ) : reportData?.length > 0 ? (
                        <div className="overflow-x-auto rounded-2xl border border-gray-100">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-slate-50">
                                        {Object.keys(reportData[0]).slice(0, 7).map(col => (
                                            <th key={col} className="py-3.5 px-4 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                {col.replace(/_/g, ' ')}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {reportData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                            {Object.keys(row).slice(0, 7).map((col, cIdx) => (
                                                <td key={cIdx} className="py-3.5 px-4 font-bold text-[#1a1b4b]">
                                                    {typeof row[col] === 'boolean'
                                                        ? (row[col]
                                                            ? <span className="text-emerald-600 font-black">Yes</span>
                                                            : <span className="text-red-400 font-black">No</span>)
                                                        : (row[col] != null ? row[col].toString() : <span className="text-gray-300">—</span>)
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
                                <FileText size={28} className="text-[#1a1b4b]/20" />
                            </div>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                No report data for this selection
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnterpriseCreditAdminPortal;
