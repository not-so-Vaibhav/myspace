// frontend/src/pages/Admin/EnterpriseReportCenter.jsx
// Phase 7: Centralized Report Center Dashboard
// Modeled after TCS iON, Oracle PeopleSoft Campus Solutions, and SAP Campus Management

import React, { useState, useEffect } from 'react';
import reportApi from '../../api/reportApi';
import {
    FileText, Search, Star, Bookmark, Clock, Filter, Download,
    Printer, Calendar, Mail, CheckCircle, AlertCircle, RefreshCw,
    Sliders, ArrowRight, Table
} from 'lucide-react';

const CATEGORIES = [
    { key: 'ALL', label: 'All Reports' },
    { key: 'STUDENT', label: 'Student Reports (20)' },
    { key: 'COURSE', label: 'Course Reports (9)' },
    { key: 'ATTENDANCE', label: 'Attendance Reports (11)' },
    { key: 'EXAMINATION', label: 'Examination Reports (11)' },
    { key: 'FACULTY', label: 'Faculty Reports (8)' },
    { key: 'CLASS_BATCH', label: 'Class & Batch (7)' },
    { key: 'ADMIN', label: 'Admin & Audit (10)' },
    { key: 'CREDIT', label: 'Credit System (8)' }
];

const DATE_PRESETS = [
    { key: 'TODAY', label: 'Today' },
    { key: 'YESTERDAY', label: 'Yesterday' },
    { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
    { key: 'LAST_30_DAYS', label: 'Last 30 Days' },
    { key: 'CURRENT_MONTH', label: 'Current Month' },
    { key: 'PREVIOUS_MONTH', label: 'Previous Month' },
    { key: 'CURRENT_SEMESTER', label: 'Current Semester' },
    { key: 'PREVIOUS_SEMESTER', label: 'Previous Semester' },
    { key: 'CURRENT_ACADEMIC_YEAR', label: 'Current Academic Year' },
    { key: 'CUSTOM_DATE_RANGE', label: 'Custom Date Range' }
];

export default function EnterpriseReportCenter() {
    const [activeTab, setActiveTab] = useState('ALL'); // ALL, FAVORITES, SAVED, RECENT
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('LAST_30_DAYS');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const [catalog, setCatalog] = useState([]);
    const [favorites, setFavorites] = useState(new Set());
    const [savedReports, setSavedReports] = useState([]);
    const [recentReports, setRecentReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Active report generation state
    const [selectedReportCode, setSelectedReportCode] = useState('STUDENT_COMPLETE_ACADEMIC_HISTORY');
    const [generatedReport, setGeneratedReport] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleEmail, setScheduleEmail] = useState('admin@university.edu');
    const [scheduleFreq, setScheduleFreq] = useState('WEEKLY');

    useEffect(() => {
        loadCatalog();
    }, [selectedCategory]);

    const loadCatalog = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await reportApi.getCatalog(selectedCategory === 'ALL' ? '' : selectedCategory);
            const list = res.data || [];
            setCatalog(list);
            const favSet = new Set(list.filter(r => r.is_favorite).map(r => r.report_code));
            setFavorites(favSet);

            // Also load saved reports
            const savedRes = await reportApi.manageSavedReports({ action: 'LIST' });
            setSavedReports(savedRes.data || []);
        } catch (err) {
            setError('Failed to load enterprise report catalog: ' + (err.message || 'Server error'));
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (code = selectedReportCode) => {
        setGenerating(true);
        setError(null);
        try {
            const payload = {
                report_code: code,
                date_preset: selectedPreset,
                filters: {
                    start_date: customStart,
                    end_date: customEnd
                },
                pagination: { page: 1, limit: 100 }
            };
            const res = await reportApi.generateReport(payload);
            setGeneratedReport(res.data);
            setSelectedReportCode(code);

            // Update recent list locally
            setRecentReports(prev => [
                { report_code: code, generated_at: new Date().toLocaleTimeString(), rows: res.data?.total_rows || 0 },
                ...prev.slice(0, 9)
            ]);
        } catch (err) {
            setError('Report generation failed: ' + (err.message || 'Unknown error'));
        } finally {
            setGenerating(false);
        }
    };

    const handleToggleFavorite = async (code) => {
        try {
            await reportApi.manageSavedReports({
                action: 'TOGGLE_FAVORITE',
                report_code: code
            });
            setFavorites(prev => {
                const next = new Set(prev);
                if (next.has(code)) next.delete(code);
                else next.add(code);
                return next;
            });
        } catch (err) {
            console.error('Could not toggle favorite:', err.message);
        }
    };

    const handleExport = async (format) => {
        if (!generatedReport) return;
        if (format === 'PRINT') {
            window.print();
            return;
        }
        try {
            const res = await reportApi.exportReport({
                report_code: generatedReport.report_code,
                filters: generatedReport.filters_applied || {},
                format: format.toUpperCase()
            });
            if (format.toUpperCase() === 'EXCEL' || format.toUpperCase() === 'CSV') {
                const blob = new Blob([res.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${generatedReport.report_code}_export_${Date.now()}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert(`Exported ${generatedReport.total_rows} records as ${format} successfully.`);
            }
        } catch (err) {
            alert('Export failed: ' + (err.message || 'Error'));
        }
    };

    const handleScheduleReport = async (e) => {
        e.preventDefault();
        try {
            await reportApi.manageScheduledReports({
                action: 'CREATE',
                report_code: selectedReportCode,
                schedule_frequency: scheduleFreq,
                target_emails: scheduleEmail.split(',').map(e => e.trim()),
                export_format: 'EXCEL'
            });
            alert(`Report ${selectedReportCode} successfully scheduled for automatic ${scheduleFreq} email delivery!`);
            setShowScheduleModal(false);
        } catch (err) {
            alert('Could not schedule report: ' + (err.message || 'Error'));
        }
    };

    // Filter catalog by search query & quick ribbon
    const filteredCatalog = catalog.filter(rep => {
        const matchesQuery = !searchQuery ||
            rep.report_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rep.report_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (rep.description && rep.description.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesQuery) return false;
        if (activeTab === 'FAVORITES') return favorites.has(rep.report_code);
        return true;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
                        <FileText className="w-4 h-4" />
                        <span>University ERP • TCS iON / SAP Campus Management Style</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mt-1">Enterprise Report Center & Catalogue</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Centralized analytics, historical student audit, course metrics, attendance defaulters, and automated email scheduling.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowScheduleModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition shadow-sm"
                    >
                        <Mail className="w-4 h-4" />
                        <span>Schedule Automatic Report</span>
                    </button>
                    <button
                        onClick={() => handleGenerate(selectedReportCode)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                        <span>Generate Active Report</span>
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Quick Access Ribbons */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('ALL')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'ALL' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        All Catalogue ({catalog.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('FAVORITES')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'FAVORITES' ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>Favorites ({favorites.size})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('RECENT')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'RECENT' ? 'bg-slate-200 text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Clock className="w-4 h-4" />
                        <span>Recent ({recentReports.length})</span>
                    </button>
                </div>

                {/* Search Box */}
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search 50+ enterprise reports..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Date Preset Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Date Preset:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
                    {DATE_PRESETS.map(preset => (
                        <button
                            key={preset.key}
                            onClick={() => setSelectedPreset(preset.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                selectedPreset === preset.key
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
                {selectedPreset === 'CUSTOM_DATE_RANGE' && (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                        />
                        <span className="text-xs text-slate-500">to</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                        />
                    </div>
                )}
            </div>

            {/* Category Navigation Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.key}
                        onClick={() => setSelectedCategory(cat.key)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                            selectedCategory === cat.key
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Main Content Split Area: Catalogue List vs Generated Report Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Available Report Definitions Catalogue */}
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[700px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-sm text-slate-800 flex items-center justify-between">
                        <span>Report Catalogue</span>
                        <span className="text-xs font-normal text-slate-500">{filteredCatalog.length} available</span>
                    </div>
                    <div className="p-3 overflow-y-auto space-y-2 flex-1">
                        {loading ? (
                            <div className="p-6 text-center text-sm text-slate-500">Loading enterprise catalogue...</div>
                        ) : filteredCatalog.length === 0 ? (
                            <div className="p-6 text-center text-sm text-slate-400">No matching reports found.</div>
                        ) : (
                            filteredCatalog.map(rep => {
                                const isFav = favorites.has(rep.report_code);
                                const isSelected = selectedReportCode === rep.report_code;
                                return (
                                    <div
                                        key={rep.report_code}
                                        onClick={() => {
                                            setSelectedReportCode(rep.report_code);
                                            handleGenerate(rep.report_code);
                                        }}
                                        className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                                            isSelected
                                                ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                                    {rep.category}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-900 truncate">
                                                    {rep.report_name}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                {rep.description || 'Enterprise ERP analytics report.'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleFavorite(rep.report_code);
                                            }}
                                            className="p-1 hover:bg-white rounded transition"
                                        >
                                            <Star
                                                className={`w-4 h-4 ${isFav ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}
                                            />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Col: Active Generated Report Viewer */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <span className="text-xs font-semibold text-indigo-600 uppercase">
                                Active Report Viewer
                            </span>
                            <h2 className="text-lg font-bold text-slate-900">
                                {generatedReport ? generatedReport.report_name : 'No Report Loaded'}
                            </h2>
                            {generatedReport && (
                                <p className="text-xs text-slate-500">
                                    Generated in {generatedReport.execution_time_ms} ms • {generatedReport.total_rows} total rows
                                </p>
                            )}
                        </div>
                        {generatedReport && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleExport('EXCEL')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Excel (.xls)</span>
                                </button>
                                <button
                                    onClick={() => handleExport('CSV')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>CSV</span>
                                </button>
                                <button
                                    onClick={() => handleExport('PDF')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs rounded-lg transition"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>PDF</span>
                                </button>
                                <button
                                    onClick={() => handleExport('PRINT')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="p-4 overflow-x-auto flex-1">
                        {generating ? (
                            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                                <span className="text-sm font-medium">Executing SQL analytics query...</span>
                            </div>
                        ) : !generatedReport || !generatedReport.rows || generatedReport.rows.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-sm">
                                Select any report from the catalogue on the left to view data and export.
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                                        {Object.keys(generatedReport.rows[0]).map(col => (
                                            <th key={col} className="p-2.5 whitespace-nowrap capitalize">
                                                {col.replace(/_/g, ' ')}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {generatedReport.rows.map((row, idx) => (
                                        <tr
                                            key={idx}
                                            className="border-b border-slate-100 hover:bg-slate-50 transition"
                                        >
                                            {Object.keys(row).map(col => {
                                                const val = row[col];
                                                return (
                                                    <td key={col} className="p-2.5 text-slate-700 whitespace-nowrap">
                                                        {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-')}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Scheduled Report Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900">Schedule Automatic Report</h3>
                            <button
                                onClick={() => setShowScheduleModal(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleScheduleReport} className="space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Report Code to Schedule
                                </label>
                                <input
                                    type="text"
                                    value={selectedReportCode}
                                    onChange={(e) => setSelectedReportCode(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Schedule Frequency
                                </label>
                                <select
                                    value={scheduleFreq}
                                    onChange={(e) => setScheduleFreq(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                                >
                                    <option value="DAILY">Daily</option>
                                    <option value="WEEKLY">Weekly</option>
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="SEMESTER_END">Semester End</option>
                                    <option value="ACADEMIC_YEAR_END">Academic Year End</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Target Email Recipients (comma separated)
                                </label>
                                <input
                                    type="text"
                                    value={scheduleEmail}
                                    onChange={(e) => setScheduleEmail(e.target.value)}
                                    placeholder="admin@university.edu, dean.cs@university.edu"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowScheduleModal(false)}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
                                >
                                    Schedule Now
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
