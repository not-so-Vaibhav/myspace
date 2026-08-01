// Enterprise Bulk Data Center — redesigned to match project theme

import React, { useState, useEffect } from 'react';
import {
    Database,
    UploadCloud,
    Download,
    FileSpreadsheet,
    FileText,
    CheckCircle,
    AlertTriangle,
    XCircle,
    RefreshCw,
    Clock,
    User,
    Shield,
    Layers,
    X,
    Loader2,
} from 'lucide-react';
import {
    getTemplate,
    downloadTemplateFile,
    getAuditLogs,
    getImportErrors
} from '../../api/bulkDataApi';
import BulkDataModal from '../../components/BulkData/BulkDataModal';
import ExportMenuButton from '../../components/BulkData/ExportMenuButton';

const ERP_MODULES = [
    { label: 'Student Management',   module: 'STUDENT',       entity: 'students',       icon: User,          badge: 'Profiles'   },
    { label: 'Faculty Management',   module: 'FACULTY',       entity: 'faculty',        icon: Shield,        badge: 'Staff'      },
    { label: 'Course & Curriculum',  module: 'COURSE',        entity: 'subjects',       icon: Layers,        badge: 'Curriculum' },
    { label: 'Academic Classes',     module: 'CLASS_BATCH',   entity: 'classes',        icon: Database,      badge: 'Classes'    },
    { label: 'Practical Lab Batches',module: 'CLASS_BATCH',   entity: 'batches',        icon: Database,      badge: 'Batches'    },
    { label: 'Course Registrations', module: 'REGISTRATION',  entity: 'registrations',  icon: FileSpreadsheet, badge: 'Enrollment'},
    { label: 'Attendance Records',   module: 'ATTENDANCE',    entity: 'attendance',     icon: Clock,         badge: 'Compliance' },
    { label: 'Examination & Marks',  module: 'EXAMINATION',   entity: 'marks',          icon: FileText,      badge: 'Assessment' },
    { label: 'Credit System Rules',  module: 'CREDIT',        entity: 'credit_rules',   icon: Layers,        badge: 'Rules'      },
];

const statusColors = {
    SUCCESS:         'bg-emerald-50 text-emerald-700 border-emerald-100',
    PARTIAL_SUCCESS: 'bg-amber-50 text-amber-700 border-amber-100',
    FAILED:          'bg-red-50 text-red-700 border-red-100',
};

const opColors = {
    IMPORT: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    EXPORT: 'bg-blue-50 text-blue-700 border-blue-100',
};

const EnterpriseBulkDataCenter = () => {
    const [selectedModIndex, setSelectedModIndex] = useState(0);
    const [templateData, setTemplateData] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingTemplate, setLoadingTemplate] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedAuditErrors, setSelectedAuditErrors] = useState(null);
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [auditFilterMod, setAuditFilterMod] = useState('ALL');

    const activeMod = ERP_MODULES[selectedModIndex] || ERP_MODULES[0];

    useEffect(() => {
        loadTemplateInfo();
        loadAuditHistory();
    }, [selectedModIndex]);

    const loadTemplateInfo = async () => {
        setLoadingTemplate(true);
        try {
            const res = await getTemplate(activeMod.module, activeMod.entity, 'CSV');
            setTemplateData(res.data || null);
        } catch (err) {
            console.error('Failed to fetch template:', err);
        } finally {
            setLoadingTemplate(false);
        }
    };

    const loadAuditHistory = async () => {
        setLoadingLogs(true);
        try {
            const filters = {};
            if (auditFilterMod !== 'ALL') filters.module_name = auditFilterMod;
            const res = await getAuditLogs(filters, { limit: 50, offset: 0 });
            setAuditLogs(res.data || []);
        } catch (err) {
            console.error('Failed to fetch audit history:', err);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleViewErrors = async (auditId) => {
        try {
            const res = await getImportErrors(auditId);
            setSelectedAuditErrors(res.data || []);
            setErrorModalOpen(true);
        } catch (err) {
            alert(`Could not load error details: ${err.message}`);
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-10 bg-[#fcfdfe] min-h-screen">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <Database className="text-[#4B7BFF]" size={36} />
                        Enterprise Bulk Data Hub
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2">
                        <FileSpreadsheet size={13} className="text-indigo-400" />
                        Universal Bulk Import · Export · Validation Engine · Audit Log
                    </p>
                </div>
                <div className="flex gap-3 shrink-0">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20 hover:bg-[#2d3a8c] transition-all"
                    >
                        <UploadCloud size={14} /> Bulk Import Data
                    </button>
                    <ExportMenuButton
                        moduleName={activeMod.module}
                        entityType={activeMod.entity}
                        buttonText="Export Current Module"
                    />
                </div>
            </div>

            {/* ── Module Selector ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {ERP_MODULES.map((mod, idx) => {
                    const Icon = mod.icon;
                    const isActive = idx === selectedModIndex;
                    return (
                        <button
                            key={idx}
                            onClick={() => setSelectedModIndex(idx)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all ${
                                isActive
                                    ? 'bg-[#1a1b4b] text-white shadow-md shadow-[#1a1b4b]/20'
                                    : 'bg-white border border-gray-100 text-gray-400 hover:text-[#1a1b4b] hover:border-gray-200 hover:shadow-sm'
                            }`}
                        >
                            <Icon size={13} />
                            <span className="uppercase tracking-widest">{mod.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-lg font-black ${
                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-gray-400'
                            }`}>
                                {mod.badge}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── Template + Sample Data ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Column Spec Card */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-7 py-5 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-2xl bg-indigo-50">
                                <FileSpreadsheet size={16} className="text-indigo-600" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">
                                    {loadingTemplate ? 'Loading Template…' : (templateData?.template_name || `${activeMod.label} Template Specification`)}
                                </h2>
                                <p className="text-[11px] font-bold text-gray-400">
                                    {templateData?.description || 'Mandatory fields, data types, and validation rules.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => downloadTemplateFile(activeMod.module, activeMod.entity, 'CSV')}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 text-[11px] font-black uppercase tracking-widest transition-all"
                            >
                                <Download size={13} /> Download CSV
                            </button>
                            <button
                                onClick={() => downloadTemplateFile(activeMod.module, activeMod.entity, 'JSON')}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-widest transition-all"
                            >
                                <Download size={13} /> Sample JSON
                            </button>
                        </div>
                    </div>

                    {loadingTemplate ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-7 h-7 text-[#1a1b4b] animate-spin" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-50 bg-slate-50/60">
                                        {['Column Name', 'Type', 'Required', 'Validation Rule'].map(h => (
                                            <th key={h} className="px-5 py-3.5 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(templateData?.columns || []).map((col, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-4 font-black text-[#4B7BFF] text-sm font-mono">{col.name}</td>
                                            <td className="px-5 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">{col.type}</td>
                                            <td className="px-5 py-4">
                                                {col.required ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-widest">Required</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black bg-slate-50 text-gray-400 border border-gray-100 uppercase tracking-widest">Optional</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-sm font-bold text-gray-500">{col.validation_rule}</td>
                                        </tr>
                                    ))}
                                    {(!templateData?.columns || templateData.columns.length === 0) && !loadingTemplate && (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-16 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-14 h-14 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center">
                                                        <FileSpreadsheet size={22} className="text-indigo-200" />
                                                    </div>
                                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No template columns available</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Sample Data Preview Card */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-7 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-2xl bg-emerald-50">
                            <Database size={16} className="text-emerald-600" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">Sample Row Data</h2>
                            <p className="text-[11px] font-bold text-gray-400">Reference formatting for date, email, and numeric values.</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {loadingTemplate ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-6 h-6 text-[#1a1b4b] animate-spin" />
                            </div>
                        ) : (templateData?.sample_data || []).length > 0 ? (
                            (templateData.sample_data).map((row, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-gray-100 font-mono text-xs space-y-1.5">
                                    {Object.keys(row).map(k => (
                                        <div key={k} className="flex justify-between gap-3">
                                            <span className="text-gray-400 font-bold">{k}:</span>
                                            <span className="text-emerald-600 font-black text-right truncate">{String(row[k])}</span>
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                                    <Database size={18} className="text-emerald-200" />
                                </div>
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">No sample data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Audit Trail ────────────────────────────────────────────────── */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-7 py-5 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-2xl bg-blue-50">
                            <Clock size={16} className="text-[#4B7BFF]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">Enterprise Bulk Data Operations Audit Trail</h2>
                            <p className="text-[11px] font-bold text-gray-400">Permanent history of all file imports, exports, bulk updates, and failure reports</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <select
                            value={auditFilterMod}
                            onChange={(e) => { setAuditFilterMod(e.target.value); loadAuditHistory(); }}
                            className="px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-100 text-[11px] font-black text-[#1a1b4b] focus:outline-none focus:border-[#1a1b4b]/30 uppercase tracking-widest cursor-pointer"
                        >
                            <option value="ALL">All Modules</option>
                            <option value="STUDENT">Student Management</option>
                            <option value="FACULTY">Faculty Management</option>
                            <option value="COURSE">Course & Curriculum</option>
                            <option value="CLASS_BATCH">Classes & Batches</option>
                            <option value="REGISTRATION">Course Registrations</option>
                            <option value="ATTENDANCE">Attendance Records</option>
                            <option value="EXAMINATION">Examination Marks</option>
                            <option value="CREDIT">Credit Rules</option>
                        </select>
                        <button
                            onClick={loadAuditHistory}
                            className="p-2.5 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-[#1a1b4b] hover:shadow-md transition-all"
                        >
                            <RefreshCw size={14} className={loadingLogs ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {loadingLogs ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-7 h-7 text-[#1a1b4b] animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-50 bg-slate-50/60">
                                    {['Timestamp', 'User', 'Operation', 'Module', 'Format', 'Records', 'Success', 'Failed', 'Status', 'Error Report'].map(h => (
                                        <th key={h} className="px-5 py-3.5 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {auditLogs.length > 0 ? auditLogs.map((log, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-5 py-4 text-xs font-mono font-bold text-gray-400 whitespace-nowrap">
                                            {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                                        </td>
                                        <td className="px-5 py-4 text-sm font-black text-[#1a1b4b] whitespace-nowrap">{log.user_email || 'admin@mit-learn.edu'}</td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${opColors[log.operation_type] || 'bg-slate-50 text-gray-400 border-gray-100'}`}>
                                                {log.operation_type}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-[11px] font-black text-gray-600 uppercase tracking-widest">{log.module_name}</td>
                                        <td className="px-5 py-4 text-[11px] font-black text-gray-400 uppercase">{log.file_format}</td>
                                        <td className="px-5 py-4 font-black text-[#1a1b4b] text-sm">{log.total_records || 0}</td>
                                        <td className="px-5 py-4 font-black text-emerald-600 text-sm">{log.success_records || 0}</td>
                                        <td className="px-5 py-4 font-black text-amber-600 text-sm">{log.failed_records || 0}</td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${statusColors[log.status] || 'bg-slate-50 text-gray-400 border-gray-100'}`}>
                                                {log.status?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            {log.failed_records > 0 && (
                                                <button
                                                    onClick={() => handleViewErrors(log.id)}
                                                    className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100 text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    View Errors
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={10} className="px-5 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-[#1a1b4b]/5 rounded-[2rem] flex items-center justify-center">
                                                    <Clock size={28} className="text-[#1a1b4b]/20" />
                                                </div>
                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No audit records yet</p>
                                                <p className="text-xs font-bold text-gray-300">Upload a file or run an export to populate the audit log</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Bulk Import Modal ───────────────────────────────────────────── */}
            <BulkDataModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                moduleName={activeMod.module}
                entityType={activeMod.entity}
                onImportSuccess={() => loadAuditHistory()}
            />

            {/* ── Error Report Modal ──────────────────────────────────────────── */}
            {errorModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100">
                        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-2xl bg-amber-50">
                                    <AlertTriangle size={16} className="text-amber-600" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">Row-Level Import Failure Report</h3>
                                    <p className="text-[11px] font-bold text-gray-400">Detailed field-level error breakdown</p>
                                </div>
                            </div>
                            <button onClick={() => setErrorModalOpen(false)} className="p-2 rounded-xl text-gray-400 hover:text-[#1a1b4b] hover:bg-slate-100 transition">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-7 max-h-[60vh] overflow-y-auto">
                            {selectedAuditErrors?.length > 0 ? (
                                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-gray-100">
                                                {['Row', 'Field', 'Failure Reason'].map(h => (
                                                    <th key={h} className="px-5 py-3.5 text-[11px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {selectedAuditErrors.map((e, idx) => (
                                                <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                                                    <td className="px-5 py-4 font-black text-amber-600 font-mono text-sm">#{e.row_number}</td>
                                                    <td className="px-5 py-4 font-black text-[#1a1b4b] text-sm">{e.field_name}</td>
                                                    <td className="px-5 py-4 font-bold text-amber-700 text-sm">{e.error_message}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <div className="w-14 h-14 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center">
                                        <CheckCircle size={22} className="text-emerald-400" />
                                    </div>
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No detailed error logs found</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end px-7 py-5 border-t border-gray-50">
                            <button
                                onClick={() => setErrorModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-gray-100 text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-slate-50 transition-all"
                            >
                                Close Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnterpriseBulkDataCenter;
