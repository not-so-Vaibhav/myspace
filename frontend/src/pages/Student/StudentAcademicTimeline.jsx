// frontend/src/pages/Student/StudentAcademicTimeline.jsx
// Phase 7: Permanent Student Academic Timeline Viewer
// Modeled after TCS iON, Oracle PeopleSoft Campus Solutions, and SAP Campus Management

import React, { useState, useEffect } from 'react';
import reportApi from '../../api/reportApi';
import {
    Calendar, Award, BookOpen, Clock, CheckCircle, User,
    FileText, Shield, Layers, RefreshCw, AlertCircle
} from 'lucide-react';

export default function StudentAcademicTimeline({ studentId: propId }) {
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterModule, setFilterModule] = useState('ALL');

    // Default to user ID from localStorage if propId not provided
    const studentId = propId || (JSON.parse(localStorage.getItem('user') || '{}').id);

    useEffect(() => {
        if (studentId) {
            loadTimeline();
        } else {
            setLoading(false);
            setError('No student profile found. Please login as a student or provide student ID.');
        }
    }, [studentId, filterModule]);

    const loadTimeline = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await reportApi.getStudentTimeline(studentId, {
                module_name: filterModule === 'ALL' ? '' : filterModule
            });
            setTimeline(res.data || []);
        } catch (err) {
            setError('Failed to load academic timeline: ' + (err.message || 'Server error'));
        } finally {
            setLoading(false);
        }
    };

    const getModuleColor = (mod = '') => {
        const m = mod.toUpperCase();
        if (m === 'REGISTRATION') return 'bg-indigo-100 text-indigo-700 border-indigo-300';
        if (m === 'ACADEMIC_BATCH') return 'bg-blue-100 text-blue-700 border-blue-300';
        if (m === 'EXAMINATION') return 'bg-emerald-100 text-emerald-700 border-emerald-300';
        if (m === 'CREDIT') return 'bg-purple-100 text-purple-700 border-purple-300';
        if (m === 'PROMOTION') return 'bg-amber-100 text-amber-800 border-amber-300';
        if (m === 'GRADUATION') return 'bg-rose-100 text-rose-700 border-rose-300';
        return 'bg-slate-100 text-slate-700 border-slate-300';
    };

    const getModuleIcon = (mod = '') => {
        const m = mod.toUpperCase();
        if (m === 'REGISTRATION') return <User className="w-4 h-4" />;
        if (m === 'ACADEMIC_BATCH') return <Layers className="w-4 h-4" />;
        if (m === 'EXAMINATION') return <CheckCircle className="w-4 h-4" />;
        if (m === 'CREDIT') return <BookOpen className="w-4 h-4" />;
        if (m === 'GRADUATION') return <Award className="w-4 h-4" />;
        return <FileText className="w-4 h-4" />;
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
                        <Clock className="w-4 h-4" />
                        <span>Permanent ERP Audit Trail • TCS iON / SAP Campus Management</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mt-1">Student Complete Academic Timeline</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Chronological record of admissions, class & practical batch allocations, course registrations, semester results, and graduation eligibility.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadTimeline}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Refresh Timeline</span>
                    </button>
                </div>
            </div>

            {/* Filter Module Tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 mr-2">Filter by ERP Module:</span>
                {['ALL', 'REGISTRATION', 'ACADEMIC_BATCH', 'EXAMINATION', 'CREDIT', 'PROMOTION', 'GRADUATION'].map(mod => (
                    <button
                        key={mod}
                        onClick={() => setFilterModule(mod)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            filterModule === mod
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {mod.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Timeline Events View */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                {loading ? (
                    <div className="p-12 text-center text-sm text-slate-500 flex flex-col items-center gap-3">
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                        <span>Loading permanent academic timeline events...</span>
                    </div>
                ) : timeline.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">
                        No timeline events recorded yet for this filter.
                    </div>
                ) : (
                    <div className="relative border-l-2 border-indigo-200 ml-4 space-y-8 py-2">
                        {timeline.map((item, idx) => (
                            <div key={item.id || idx} className="relative pl-6 group">
                                {/* Timeline Dot */}
                                <span className="absolute -left-[11px] top-1.5 w-5 h-5 rounded-full bg-indigo-600 border-4 border-white shadow flex items-center justify-center" />

                                <div className="p-4 bg-slate-50 group-hover:bg-indigo-50/50 rounded-2xl border border-slate-200 transition space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${getModuleColor(item.module_name)}`}>
                                                {getModuleIcon(item.module_name)}
                                                <span>{item.module_name}</span>
                                            </span>
                                            <span className="text-xs font-semibold text-slate-500">
                                                {item.event_type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{item.event_date || item.created_at?.split('T')[0]}</span>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-slate-900 text-base">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        {item.description}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-200/60">
                                        <span>Performed By: <strong className="text-slate-600">{item.performed_by_name || 'System'}</strong></span>
                                        <span>Audit Verified • Immutable Record</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
