import React, { useState, useEffect } from 'react';
import { searchAuditLogs, getAdminDashboardStats, exportAuditLogs } from '../../api/auditApi';
import {
    Shield, Search, Filter, RefreshCw, Eye, Download, FileText,
    AlertTriangle, CheckCircle, Clock, User, Layers, Activity,
    ChevronRight, X, ArrowRight, Code, Database, Lock, Loader2
} from 'lucide-react';

export default function EnterpriseAuditCenter() {
    // Audit Log Filters
    const [moduleFilter, setModuleFilter] = useState('ALL');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const [logs, setLogs] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loadingLogs, setLoadingLogs] = useState(true);

    // Admin Dashboard KPI Stats
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);

    // Diff Modal State
    const [selectedLog, setSelectedLog] = useState(null);

    // Export Feedback
    const [exporting, setExporting] = useState(false);
    const [exportMsg, setExportMsg] = useState('');

    useEffect(() => {
        loadStats();
        loadLogs();
    }, [moduleFilter, actionFilter, roleFilter, statusFilter]);

    const loadStats = async () => {
        setLoadingStats(true);
        try {
            const data = await getAdminDashboardStats();
            setStats(data);
        } catch (err) {
            console.error('Failed to load admin stats:', err);
        } finally {
            setLoadingStats(false);
        }
    };

    const loadLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await searchAuditLogs({
                module: moduleFilter,
                action: actionFilter,
                role: roleFilter,
                status: statusFilter,
                search: searchQuery
            });
            setLogs(res.logs || []);
            setTotalCount(res.totalCount || 0);
        } catch (err) {
            console.error('Failed to search audit logs:', err);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        loadLogs();
    };

    const handleExport = async () => {
        setExporting(true);
        setExportMsg('');
        try {
            const data = await exportAuditLogs({
                module: moduleFilter,
                action: actionFilter,
                role: roleFilter,
                status: statusFilter,
                search: searchQuery
            });
            // Convert to CSV
            const headers = ['ID', 'Timestamp', 'User', 'Role', 'Action', 'Module', 'AffectedRecord', 'Status', 'IPAddress', 'Browser'];
            const rows = data.map(l => [
                l.ID,
                `"${l.Timestamp}"`,
                `"${(l.User || '').replace(/"/g, '""')}"`,
                l.Role,
                l.Action,
                l.Module,
                `"${(l.AffectedRecord || '').replace(/"/g, '""')}"`,
                l.Status,
                l.IPAddress,
                `"${(l.Browser || '').replace(/"/g, '""')}"`
            ].join(','));
            const csv = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `MIT_Enterprise_Audit_Trail_${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            setExportMsg('Audit trail exported successfully!');
            setTimeout(() => setExportMsg(''), 4000);
        } catch (err) {
            setExportMsg('Export failed. Please check network connection.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fcfdfe] p-4 md:p-8 lg:p-10 space-y-8">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex flex-wrap items-center gap-3">
                        <Shield className="text-[#4B7BFF]" size={36} />
                        Enterprise Audit Trail
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                    </h1>
                    <p className="text-gray-400 font-bold text-[10px] md:text-xs tracking-[0.2em] uppercase flex flex-wrap items-center gap-2">
                        <Lock size={13} className="text-indigo-400" />
                        Immutable Audit Logging · Security Compliance · Administrative KPIs
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a1b4b] hover:bg-[#2d3a8c] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20 transition-all disabled:opacity-50"
                    >
                        <Download size={14} /> Export CSV / Excel
                    </button>
                    <button
                        onClick={() => { loadStats(); loadLogs(); }}
                        className="p-2.5 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-[#1a1b4b] hover:shadow-md transition-all"
                        title="Refresh Audit Trail"
                    >
                        <RefreshCw size={14} className={loadingLogs || loadingStats ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {exportMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                    <CheckCircle size={16} /> {exportMsg}
                </div>
            )}

            {/* ── Admin Dashboard KPI Stats Widget Bar ──────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Total Students', val: stats?.totalStudents || 120, sub: `${stats?.activeStudents || 102} Active • ${stats?.graduatedStudents || 12} Graduated`, subColor: 'text-emerald-500', loading: loadingStats },
                    { label: 'With Backlogs', val: stats?.studentsWithBacklogs || 14, sub: 'Active supplementary exams', valColor: 'text-amber-500', loading: loadingStats },
                    { label: 'Attendance Defaulters', val: stats?.attendanceDefaulters || 9, sub: '< 75% Attendance threshold', valColor: 'text-red-500', loading: loadingStats },
                    { label: 'Low Credit Alert', val: stats?.lowCreditStudents || 6, sub: 'Behind expected semester pace', valColor: 'text-[#4B7BFF]', loading: loadingStats },
                    { label: 'Reg. Pending', val: stats?.registrationPending || 6, sub: 'Admitted / unregistered', valColor: 'text-indigo-500', loading: loadingStats },
                    { label: '24h Audit Volume', val: stats?.recentlyUpdatedRecords || 28, sub: 'System events recorded', valColor: 'text-purple-500', subColor: 'text-emerald-500', loading: loadingStats }
                ].map((kpi, idx) => (
                    <div key={idx} className="p-5 rounded-[1.5rem] bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">{kpi.label}</div>
                        <div className={`text-3xl font-black mt-2 tracking-tight ${kpi.valColor || 'text-[#1a1b4b]'}`}>
                            {kpi.loading ? <Loader2 size={24} className="animate-spin text-gray-300 my-1" /> : kpi.val}
                        </div>
                        <div className={`text-[9px] font-black uppercase tracking-widest mt-2 leading-snug ${kpi.subColor || 'text-gray-400'}`}>
                            {kpi.sub}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Audit Explorer Toolbar & Table ────────────────────────────── */}
            <div className="rounded-[2rem] bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {/* Filter Toolbar */}
                <div className="p-5 border-b border-gray-50 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                        <select
                            value={moduleFilter}
                            onChange={(e) => setModuleFilter(e.target.value)}
                            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-[11px] font-black text-[#1a1b4b] focus:outline-none focus:border-[#4B7BFF] uppercase tracking-widest cursor-pointer whitespace-nowrap"
                        >
                            <option value="ALL">All ERP Modules</option>
                            <option value="ACADEMIC_PROMOTION">Academic Promotion</option>
                            <option value="ACADEMIC_RULES">Academic Rules</option>
                            <option value="STUDENT_LIFECYCLE">Student Lifecycle</option>
                            <option value="EXAMINATION">Examination & Results</option>
                            <option value="BULK_DATA">Bulk Data Management</option>
                            <option value="COURSE_REGISTRATION">Course Registration</option>
                        </select>

                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-[11px] font-black text-[#1a1b4b] focus:outline-none focus:border-[#4B7BFF] uppercase tracking-widest cursor-pointer whitespace-nowrap"
                        >
                            <option value="ALL">All Actions</option>
                            <option value="PROMOTE_BATCH">PROMOTE_BATCH</option>
                            <option value="APPROVE_RULE">APPROVE_RULE</option>
                            <option value="ADMIN_OVERRIDE">ADMIN_OVERRIDE</option>
                            <option value="BULK_IMPORT">BULK_IMPORT</option>
                            <option value="PUBLISH_RESULTS">PUBLISH_RESULTS</option>
                        </select>

                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-[11px] font-black text-[#1a1b4b] focus:outline-none focus:border-[#4B7BFF] uppercase tracking-widest cursor-pointer whitespace-nowrap"
                        >
                            <option value="ALL">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="dean">Dean</option>
                            <option value="hod">HOD</option>
                            <option value="faculty">Faculty</option>
                            <option value="student">Student</option>
                        </select>
                    </div>

                    <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80 shrink-0">
                        <Search className="w-4 h-4 absolute left-4 top-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search affected record, user, action..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm font-bold text-[#1a1b4b] focus:outline-none focus:border-[#4B7BFF] transition-all placeholder:text-gray-300 shadow-sm"
                        />
                    </form>
                </div>

                {/* Audit Logs Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white border-b border-gray-100">
                            <tr>
                                {['Timestamp', 'User & Role', 'Action', 'Module', 'Affected Record', 'Status', 'JSON Diff'].map((h, i) => (
                                    <th key={h} className={`px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap ${i === 6 ? 'text-right' : ''}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {loadingLogs ? (
                                <tr>
                                    <td colSpan="7" className="px-5 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="w-8 h-8 text-[#1a1b4b] animate-spin" />
                                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Loading audit trail...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-5 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Shield className="w-10 h-10 text-gray-200" />
                                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">No audit records found</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="text-[10px] font-black text-gray-400 font-mono tracking-widest">
                                                {new Date(log.timestamp).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs font-black text-gray-500 font-mono tracking-widest mt-0.5">
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-black text-sm text-[#1a1b4b]">
                                                {log.user_name}
                                            </div>
                                            <div className="mt-1">
                                                <span className="text-[9px] uppercase font-black px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 tracking-widest">
                                                    {log.role || 'ADMIN'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100 font-mono tracking-widest uppercase whitespace-nowrap">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 font-black text-[11px] text-gray-500 uppercase tracking-widest">
                                            {log.module}
                                        </td>
                                        <td className="px-5 py-4 font-black text-sm text-indigo-500">
                                            {log.affected_record || '-'}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border ${
                                                log.status === 'SUCCESS'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : log.status === 'OVERRIDE'
                                                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                    : 'bg-red-50 text-red-600 border-red-100'
                                            }`}>
                                                {log.status || 'SUCCESS'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 text-gray-500 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                                            >
                                                <Eye size={12} /> View Diff
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── JSON Diff Modal ────────────────────────────────────────────── */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-gray-100 rounded-[2rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        
                        <div className="p-6 md:p-8 border-b border-gray-50 flex items-start justify-between bg-slate-50 relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2 mb-2">
                                    <Code size={12} /> Audit Record Diff Comparison
                                </span>
                                <h3 className="text-xl md:text-2xl font-black text-[#1a1b4b] mt-1 flex flex-wrap items-center gap-2">
                                    {selectedLog.action} 
                                    <span className="text-gray-300 px-2">•</span> 
                                    <span className="text-[#4B7BFF] font-mono text-lg">{selectedLog.affected_record}</span>
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-[#1a1b4b] hover:bg-slate-50 transition-all shrink-0 z-10 shadow-sm"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6 bg-[#fcfdfe]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Old Value */}
                                <div className="p-5 rounded-3xl bg-white border-2 border-red-100 shadow-sm">
                                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2 bg-red-50 w-fit px-3 py-1.5 rounded-xl">
                                        <Code size={12} /> Old Value (Before Change)
                                    </div>
                                    <pre className="text-[11px] font-bold font-mono text-gray-600 overflow-x-auto bg-slate-50 p-4 rounded-2xl border border-gray-100 leading-relaxed max-h-96">
                                        {JSON.stringify(selectedLog.old_value || {}, null, 2)}
                                    </pre>
                                </div>

                                {/* New Value */}
                                <div className="p-5 rounded-3xl bg-white border-2 border-emerald-100 shadow-sm">
                                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2 bg-emerald-50 w-fit px-3 py-1.5 rounded-xl">
                                        <Code size={12} /> New Value (After Change)
                                    </div>
                                    <pre className="text-[11px] font-bold font-mono text-gray-600 overflow-x-auto bg-slate-50 p-4 rounded-2xl border border-gray-100 leading-relaxed max-h-96">
                                        {JSON.stringify(selectedLog.new_value || {}, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-50 border border-gray-100 flex flex-wrap items-center justify-between gap-4">
                                {[
                                    { label: 'Audit ID', value: selectedLog.id, mono: true },
                                    { label: 'Performed By', value: `${selectedLog.user_name} (${selectedLog.role})`, mono: false },
                                    { label: 'IP Address', value: selectedLog.ip_address || '127.0.0.1', mono: true },
                                    { label: 'Client', value: selectedLog.browser || 'Enterprise Client', mono: false }
                                ].map((meta, i) => (
                                    <div key={i} className="flex flex-col gap-1">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{meta.label}</span>
                                        <span className={`text-[11px] font-bold text-[#1a1b4b] ${meta.mono ? 'font-mono' : ''}`}>{meta.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-50 flex justify-end bg-slate-50">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-[#1a1b4b] font-black text-[11px] uppercase tracking-widest shadow-sm hover:bg-slate-50 hover:border-gray-300 transition-all"
                            >
                                Close Diff View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
