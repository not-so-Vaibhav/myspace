import React, { useState, useEffect } from 'react';
import {
    UploadCloud,
    FileSpreadsheet,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Download,
    RefreshCw,
    X,
    Loader2,
} from 'lucide-react';
import {
    getTemplate,
    downloadTemplateFile,
    validateImportFile,
    executeImportFile,
    executeImportRows
} from '../../api/bulkDataApi';

const BulkDataModal = ({
    isOpen,
    onClose,
    moduleName = 'STUDENT',
    entityType = 'students',
    onImportSuccess
}) => {
    const [template, setTemplate] = useState(null);
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [validationResult, setValidationResult] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [activeTab, setActiveTab] = useState('VALID'); // 'VALID' or 'ERRORS'
    const [partialSuccess, setPartialSuccess] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        if (isOpen) {
            resetState();
            loadTemplate();
        }
    }, [isOpen, moduleName, entityType]);

    const resetState = () => {
        setFile(null);
        setValidationResult(null);
        setImportResult(null);
        setErrorMsg(null);
        setProgress(0);
        setActiveTab('VALID');
    };

    const loadTemplate = async () => {
        try {
            const res = await getTemplate(moduleName, entityType, 'CSV');
            setTemplate(res.data || null);
        } catch (err) {
            console.error('Template loading error:', err);
        }
    };

    const handleFileChange = async (selectedFile) => {
        if (!selectedFile) return;
        setFile(selectedFile);
        setErrorMsg(null);
        setValidationResult(null);
        setImportResult(null);
        setLoading(true);
        setProgress(30);

        try {
            const res = await validateImportFile(moduleName, entityType, selectedFile);
            setProgress(100);
            const data = res.data;
            setValidationResult(data);
            if (data && data.summary && data.summary.error_rows_count > 0) {
                setActiveTab('ERRORS');
            } else {
                setActiveTab('VALID');
            }
        } catch (err) {
            setErrorMsg(err.message || 'File validation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleConfirmImport = async () => {
        if (!file && (!validationResult || !validationResult.valid_rows)) return;
        setLoading(true);
        setErrorMsg(null);
        setProgress(50);

        try {
            let res;
            if (file) {
                res = await executeImportFile(moduleName, entityType, file, { partial_success: partialSuccess });
            } else {
                res = await executeImportRows(moduleName, entityType, validationResult.valid_rows, { partial_success: partialSuccess });
            }
            setProgress(100);
            const resultData = res.data;
            setImportResult(resultData);
            if (onImportSuccess) {
                onImportSuccess(resultData);
            }
        } catch (err) {
            setErrorMsg(err.message || 'Bulk import execution failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-50">
                            <UploadCloud size={18} className="text-indigo-600" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">
                                Enterprise Bulk Import ({moduleName} — {entityType})
                            </h2>
                            <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                                Multi-stage template validation, duplicate detection, and row-level error reporting
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-[#1a1b4b] hover:bg-slate-100 transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="p-7 overflow-y-auto flex-1 space-y-7">
                    {/* Template Links */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-[1rem] flex items-center justify-center shrink-0">
                                <FileSpreadsheet size={20} className="text-emerald-500" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black text-[#1a1b4b] uppercase tracking-widest">
                                    {template?.template_name || 'Import Template Rules'}
                                </h4>
                                <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                                    {template?.description || 'Download blank template or sample CSV before uploading.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => downloadTemplateFile(moduleName, entityType, 'CSV')}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 text-[11px] font-black uppercase tracking-widest transition-all"
                            >
                                <Download size={13} /> Blank CSV Template
                            </button>
                            <button
                                onClick={() => downloadTemplateFile(moduleName, entityType, 'JSON')}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-100 text-gray-500 text-[11px] font-black uppercase tracking-widest transition-all"
                            >
                                <Download size={13} /> Sample JSON
                            </button>
                        </div>
                    </div>

                    {/* Drag & Drop Area */}
                    {!importResult && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('bulk-file-input')?.click()}
                            className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px] ${
                                isDragging
                                    ? 'border-[#1a1b4b] bg-[#1a1b4b]/5'
                                    : 'border-gray-200 bg-white hover:border-[#4B7BFF] hover:bg-blue-50/50'
                            }`}
                        >
                            <input
                                id="bulk-file-input"
                                type="file"
                                accept=".csv,.xlsx,.json"
                                className="hidden"
                                onChange={(e) => handleFileChange(e.target.files?.[0])}
                            />
                            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-4 transition-colors ${file ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                                <UploadCloud size={28} className={file ? 'text-indigo-600' : 'text-gray-400'} strokeWidth={2} />
                            </div>
                            <h3 className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest">
                                {file ? file.name : 'Drag & Drop CSV, XLSX, or JSON file here'}
                            </h3>
                            <p className="text-[11px] font-bold text-gray-400 mt-2">
                                {file
                                    ? 'Click to change file or drop another file to re-validate'
                                    : 'Or click to select a file from your computer (Max 10 MB)'}
                            </p>
                        </div>
                    )}

                    {/* Loader */}
                    {loading && (
                        <div className="space-y-3">
                            <div className="flex justify-between text-[11px] font-black text-[#1a1b4b] uppercase tracking-widest">
                                <span className="flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Processing file...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-[#1a1b4b] h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {errorMsg && (
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-[11px] font-black uppercase tracking-widest">
                            <XCircle size={16} className="text-red-500 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Validation Preview */}
                    {validationResult && !importResult && (
                        <div className="border border-gray-100 rounded-3xl p-6 space-y-6 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-50 pb-5">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${validationResult.is_valid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {validationResult.is_valid ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black text-[#1a1b4b] uppercase tracking-widest">
                                            {validationResult.is_valid ? 'Validation Passed' : 'Validation Found Issues'}
                                        </h4>
                                        <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                                            Total: {validationResult.summary.total_rows} | Valid: <span className="text-emerald-600">{validationResult.summary.valid_rows_count}</span> | Errors: <span className="text-amber-600">{validationResult.summary.error_rows_count}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1 bg-slate-50 p-1.5 rounded-xl border border-gray-100">
                                    <button
                                        onClick={() => setActiveTab('VALID')}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                            activeTab === 'VALID' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-[#1a1b4b]'
                                        }`}
                                    >
                                        Valid Rows ({validationResult.summary.valid_rows_count})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('ERRORS')}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                            activeTab === 'ERRORS' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-400 hover:text-[#1a1b4b]'
                                        }`}
                                    >
                                        Error Rows ({validationResult.summary.error_rows_count})
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-2xl">
                                {activeTab === 'VALID' ? (
                                    validationResult.valid_rows.length > 0 ? (
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Row</th>
                                                    {Object.keys(validationResult.valid_rows[0] || {}).filter(k => k !== 'row_number').map(k => (
                                                        <th key={k} className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{k}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {validationResult.valid_rows.map((r, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-5 py-3 font-mono text-[11px] font-bold text-emerald-600">#{r.row_number || idx + 1}</td>
                                                        {Object.keys(r).filter(k => k !== 'row_number').map(k => (
                                                            <td key={k} className="px-5 py-3 text-[11px] font-bold text-[#1a1b4b]">{String(r[k])}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-10 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest">No valid rows available in the file.</div>
                                    )
                                ) : (
                                    validationResult.error_rows.length > 0 ? (
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Row</th>
                                                    <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Field</th>
                                                    <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Failure Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {validationResult.error_rows.map((err, idx) => (
                                                    <tr key={idx} className="bg-amber-50/30 hover:bg-amber-50/60">
                                                        <td className="px-5 py-3 font-mono text-[11px] font-bold text-amber-600">#{err.row_number}</td>
                                                        <td className="px-5 py-3 text-[11px] font-black text-[#1a1b4b]">{err.field_name}</td>
                                                        <td className="px-5 py-3 text-[11px] font-bold text-amber-700">{err.error_message}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-10 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest">No validation errors detected. All rows are valid!</div>
                                    )
                                )}
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <input
                                    type="checkbox"
                                    id="partial_chk"
                                    checked={partialSuccess}
                                    onChange={(e) => setPartialSuccess(e.target.checked)}
                                    className="w-4 h-4 rounded bg-slate-50 border-gray-200 text-[#1a1b4b] focus:ring-[#1a1b4b]"
                                />
                                <label htmlFor="partial_chk" className="text-[11px] font-black text-gray-500 uppercase tracking-widest cursor-pointer mt-0.5">
                                    Allow partial import (process valid rows even if some rows fail validation)
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Import Success Summary */}
                    {importResult && (
                        <div className="p-10 rounded-[2rem] bg-emerald-50 border border-emerald-100 text-center space-y-6">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                                <CheckCircle size={32} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-emerald-900 uppercase tracking-tight">
                                    Bulk Import {importResult.status.replace('_', ' ')}
                                </h3>
                                <p className="text-[11px] font-bold text-emerald-700 mt-2">
                                    Audit ID: <span className="font-mono bg-white px-2 py-0.5 rounded-lg border border-emerald-200 ml-1">{importResult.audit_id}</span>
                                </p>
                            </div>
                            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto pt-2">
                                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Rows</div>
                                    <div className="text-xl font-black text-[#1a1b4b] mt-1">{importResult.summary.total_records}</div>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Successful</div>
                                    <div className="text-xl font-black text-emerald-600 mt-1">{importResult.summary.success_records}</div>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Failed / Skipped</div>
                                    <div className="text-xl font-black text-amber-600 mt-1">{importResult.summary.failed_records}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-50 bg-slate-50/50">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-gray-200 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:bg-slate-100 transition-all"
                    >
                        {importResult ? 'Close' : 'Cancel'}
                    </button>
                    {validationResult && !importResult && (
                        <>
                            <button
                                onClick={resetState}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-[#1a1b4b] hover:bg-slate-50 text-[11px] font-black uppercase tracking-widest transition-all"
                            >
                                <RefreshCw size={13} /> Re-upload File
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                disabled={loading || (!partialSuccess && validationResult.summary.error_rows_count > 0) || validationResult.summary.valid_rows_count === 0}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1a1b4b] hover:bg-[#2d3a8c] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#1a1b4b]/20"
                            >
                                <CheckCircle size={14} />
                                Confirm & Import ({validationResult.summary.valid_rows_count} rows)
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkDataModal;
