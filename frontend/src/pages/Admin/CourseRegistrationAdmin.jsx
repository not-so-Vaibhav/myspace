// frontend/src/pages/Admin/CourseRegistrationAdmin.jsx
// Enterprise Course Registration Admin Management & Analytics Dashboard
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { registrationApi } from '../../api/registrationApi';
import {
    BookOpen, Users, Award, Clock, Calendar, BarChart2,
    CheckCircle2, AlertTriangle, XCircle, Download, FileText,
    Printer, ShieldAlert, Loader2, Plus, Search, RefreshCw,
    Sliders, Zap, UserCheck
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

const CourseRegistrationAdmin = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'window' | 'override' | 'audit'

    // Analytics state
    const [analytics, setAnalytics] = useState({
        departmentStats: [],
        electivePopularity: [],
        seatUtilization: [],
        unregisteredStudents: [],
        overallSummary: {
            totalRegistrations: 0,
            activeRegistrationsCount: 0,
            totalCreditsRegistered: 0
        }
    });

    // Window management state
    const [windowData, setWindowData] = useState({
        start_date: new Date().toISOString().slice(0, 16),
        end_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
        min_credits: 12,
        max_credits: 26,
        status: 'OPEN',
        allow_late_registration: false
    });

    // Force Register form state
    const [overrideForm, setOverrideForm] = useState({
        studentId: '',
        allocationId: '',
        reason: 'Admin force override clearance',
        actionType: 'register' // 'register' | 'drop'
    });

    // Audit logs state
    const [auditLogs, setAuditLogs] = useState([]);

    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async () => {
        setLoading(true);
        setError('');
        try {
            const [analyticsRes, windowRes, auditRes] = await Promise.all([
                registrationApi.getAdminAnalytics(),
                registrationApi.getWindow(),
                registrationApi.getAuditLogs({})
            ]);

            if (analyticsRes?.success) {
                setAnalytics({
                    departmentStats: analyticsRes.departmentStats || [],
                    electivePopularity: analyticsRes.electivePopularity || [],
                    seatUtilization: analyticsRes.seatUtilization || [],
                    unregisteredStudents: analyticsRes.unregisteredStudents || [],
                    overallSummary: analyticsRes.overallSummary || {}
                });
            }

            if (windowRes?.success && windowRes.window) {
                const w = windowRes.window;
                setWindowData({
                    id: w.id,
                    start_date: w.start_date ? new Date(w.start_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                    end_date: w.end_date ? new Date(w.end_date).toISOString().slice(0, 16) : new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
                    min_credits: w.min_credits || 12,
                    max_credits: w.max_credits || 26,
                    status: w.status || 'OPEN',
                    allow_late_registration: !!w.allow_late_registration
                });
            }

            if (auditRes?.success) {
                setAuditLogs(auditRes.logs || []);
            }
        } catch (err) {
            console.error('Failed to load admin registration data:', err);
            setError('Failed to load Course Registration Admin portal.');
        } finally {
            setLoading(false);
        }
    };

    // Handle Window Save
    const handleSaveWindow = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await registrationApi.upsertWindow({
                ...windowData,
                start_date: new Date(windowData.start_date).toISOString(),
                end_date: new Date(windowData.end_date).toISOString()
            });
            if (res?.success) {
                setSuccess('Registration Window settings updated successfully.');
                await loadAdminData();
            }
        } catch (err) {
            setError(err.message || 'Failed to update registration window');
        } finally {
            setActionLoading(false);
        }
    };

    // Handle Override
    const handleOverrideSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError('');
        setSuccess('');
        try {
            if (!overrideForm.studentId || !overrideForm.allocationId) {
                setError('Please provide valid Student ID and Allocation ID.');
                return;
            }
            let res;
            if (overrideForm.actionType === 'register') {
                res = await registrationApi.adminForceRegister(
                    overrideForm.studentId,
                    overrideForm.allocationId,
                    overrideForm.reason
                );
            } else {
                res = await registrationApi.adminForceDrop(
                    overrideForm.studentId,
                    overrideForm.allocationId,
                    overrideForm.reason
                );
            }
            if (res?.success) {
                setSuccess(`Successfully executed ${overrideForm.actionType.toUpperCase()} override.`);
                setOverrideForm({ studentId: '', allocationId: '', reason: 'Admin force override clearance', actionType: 'register' });
                await loadAdminData();
            }
        } catch (err) {
            setError(err?.response?.data?.message || err.message || 'Override failed');
        } finally {
            setActionLoading(false);
        }
    };

    // Export Unregistered Students CSV
    const exportUnregisteredCSV = () => {
        const headers = ['Student ID', 'Full Name', 'Email', 'Department', 'Semester', 'Enrollment No'];
        const rows = analytics.unregisteredStudents.map(s => [
            s.student_id,
            s.full_name,
            s.email,
            s.department,
            s.semester,
            s.enrollment_no || 'N/A'
        ]);
        const csv = [headers, ...rows].map(e => e.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'unregistered_students_report.csv';
        link.click();
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600 font-medium">Loading Course Registration Admin...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 space-y-6">
            {/* ── HEADER ───────────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800">Enterprise Course Registration System</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Control registration windows, monitor enrollment analytics, execute overrides, and review audit logs.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={loadAdminData}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
                    </button>
                </div>
            </div>

            {/* ── TABS ─────────────────────────────────────────────────────────────── */}
            <div className="flex border-b border-gray-200 space-x-6">
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === 'analytics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Analytics Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('window')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === 'window' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Registration Windows
                </button>
                <button
                    onClick={() => setActiveTab('override')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === 'override' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Admin Override & Bulk Tools
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Audit Trail ({auditLogs.length})
                </button>
            </div>

            {/* ── ALERTS ───────────────────────────────────────────────────────────── */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-center justify-between text-red-700">
                    <span className="text-sm font-medium">{error}</span>
                    <button onClick={() => setError('')} className="text-red-500 font-bold">&times;</button>
                </div>
            )}
            {success && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-md flex items-center justify-between text-emerald-700">
                    <span className="text-sm font-medium">{success}</span>
                    <button onClick={() => setSuccess('')} className="text-emerald-500 font-bold">&times;</button>
                </div>
            )}

            {/* ── 1. ANALYTICS TAB ─────────────────────────────────────────────────── */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Active Registrations</span>
                            <p className="text-2xl font-extrabold text-blue-600 mt-2">
                                {analytics.overallSummary.activeRegistrationsCount || 0}
                            </p>
                            <span className="text-xs text-gray-400">Total course enrollments</span>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Total Credits Allocated</span>
                            <p className="text-2xl font-extrabold text-emerald-600 mt-2">
                                {analytics.overallSummary.totalCreditsRegistered || 0}
                            </p>
                            <span className="text-xs text-gray-400">Across all students</span>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Unregistered Students</span>
                            <p className="text-2xl font-extrabold text-rose-600 mt-2">
                                {analytics.unregisteredStudents.length || 0}
                            </p>
                            <span className="text-xs text-gray-400">Require action/reminder</span>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Window Status</span>
                            <p className="text-2xl font-extrabold text-gray-800 mt-2">
                                {windowData.status}
                            </p>
                            <span className="text-xs text-gray-400">Current registration period</span>
                        </div>
                    </div>

                    {/* Department-wise Registrations Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
                            <h3 className="text-base font-bold text-gray-800">Department-wise Registrations & Completion %</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.departmentStats}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="department" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="registered_students" name="Registered Students" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="total_students" name="Total Students" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Elective Popularity Table */}
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
                            <h3 className="text-base font-bold text-gray-800">Elective Popularity Ranking</h3>
                            <div className="overflow-y-auto max-h-64">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 uppercase font-bold">
                                            <th className="py-2 px-3">Subject Code</th>
                                            <th className="py-2 px-3">Subject Name</th>
                                            <th className="py-2 px-3">Category</th>
                                            <th className="py-2 px-3">Registered</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {analytics.electivePopularity.map((e, idx) => (
                                            <tr key={e.subject_id} className="hover:bg-gray-50">
                                                <td className="py-2 px-3 font-bold text-blue-600">{e.subject_code}</td>
                                                <td className="py-2 px-3 font-semibold text-gray-800">{e.subject_name}</td>
                                                <td className="py-2 px-3 text-gray-500">{e.category || 'Core'}</td>
                                                <td className="py-2 px-3 font-bold text-emerald-600">{e.total_registered}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Unregistered Students List with Export */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-gray-800">Unregistered Students Roster</h3>
                                <p className="text-xs text-gray-500">Students who have not enrolled in any courses for the current semester</p>
                            </div>
                            <button
                                onClick={exportUnregisteredCSV}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 hover:bg-blue-100"
                            >
                                <Download className="w-3.5 h-3.5" /> Export Unregistered CSV
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 uppercase font-bold border-y border-gray-200">
                                        <th className="py-2.5 px-3">Enrollment No</th>
                                        <th className="py-2.5 px-3">Student Name</th>
                                        <th className="py-2.5 px-3">Email</th>
                                        <th className="py-2.5 px-3">Department</th>
                                        <th className="py-2.5 px-3">Semester</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {analytics.unregisteredStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-6 text-center text-gray-500 font-medium">
                                                All students have completed course registration!
                                            </td>
                                        </tr>
                                    ) : (
                                        analytics.unregisteredStudents.map((s) => (
                                            <tr key={s.student_id} className="hover:bg-gray-50">
                                                <td className="py-2.5 px-3 font-semibold text-gray-800">{s.enrollment_no || 'N/A'}</td>
                                                <td className="py-2.5 px-3 font-bold text-gray-900">{s.full_name}</td>
                                                <td className="py-2.5 px-3 text-gray-600">{s.email}</td>
                                                <td className="py-2.5 px-3 text-gray-600">{s.department}</td>
                                                <td className="py-2.5 px-3 text-gray-600">Sem {s.semester}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 2. WINDOW TAB ─────────────────────────────────────────────────────── */}
            {activeTab === 'window' && (
                <div className="max-w-2xl bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Registration Window Configuration</h3>
                        <p className="text-xs text-gray-500">Configure opening/closing dates and credit limits for student registration.</p>
                    </div>

                    <form onSubmit={handleSaveWindow} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Window Status</label>
                                <select
                                    value={windowData.status}
                                    onChange={(e) => setWindowData({ ...windowData, status: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold"
                                >
                                    <option value="OPEN">OPEN (Registration Active)</option>
                                    <option value="CLOSED">CLOSED (No Registrations)</option>
                                    <option value="SCHEDULED">SCHEDULED (Opens Automatically)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Allow Late Registration</label>
                                <select
                                    value={windowData.allow_late_registration ? 'yes' : 'no'}
                                    onChange={(e) => setWindowData({ ...windowData, allow_late_registration: e.target.value === 'yes' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold"
                                >
                                    <option value="no">No (Strict Deadline)</option>
                                    <option value="yes">Yes (Allow Late Add/Drop)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Start Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={windowData.start_date}
                                    onChange={(e) => setWindowData({ ...windowData, start_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">End Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={windowData.end_date}
                                    onChange={(e) => setWindowData({ ...windowData, end_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Minimum Credits Required</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={windowData.min_credits}
                                    onChange={(e) => setWindowData({ ...windowData, min_credits: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Maximum Credits Allowed</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={windowData.max_credits}
                                    onChange={(e) => setWindowData({ ...windowData, max_credits: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors"
                            >
                                {actionLoading ? 'Saving...' : 'Save Window Configuration'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── 3. OVERRIDE & BULK TAB ───────────────────────────────────────────── */}
            {activeTab === 'override' && (
                <div className="max-w-xl bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Admin Force Register / Drop Override</h3>
                        <p className="text-xs text-gray-500">Bypass registration window, prerequisites, and seat limits for exceptional student cases.</p>
                    </div>

                    <form onSubmit={handleOverrideSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Action Type</label>
                            <div className="flex space-x-4">
                                <label className="flex items-center space-x-2 text-sm font-semibold">
                                    <input
                                        type="radio"
                                        name="actionType"
                                        checked={overrideForm.actionType === 'register'}
                                        onChange={() => setOverrideForm({ ...overrideForm, actionType: 'register' })}
                                    />
                                    <span className="text-blue-600">Force Register</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm font-semibold">
                                    <input
                                        type="radio"
                                        name="actionType"
                                        checked={overrideForm.actionType === 'drop'}
                                        onChange={() => setOverrideForm({ ...overrideForm, actionType: 'drop' })}
                                    />
                                    <span className="text-red-600">Force Drop</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Student UUID / ID</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                                value={overrideForm.studentId}
                                onChange={(e) => setOverrideForm({ ...overrideForm, studentId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Course Allocation UUID / ID</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. 770e8400-e29b-41d4-a716-446655440000"
                                value={overrideForm.allocationId}
                                onChange={(e) => setOverrideForm({ ...overrideForm, allocationId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Override Justification (Audit Log Reason)</label>
                            <textarea
                                rows="2"
                                value={overrideForm.reason}
                                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className={`px-5 py-2.5 text-white font-bold text-sm rounded-lg shadow-sm transition-colors ${
                                    overrideForm.actionType === 'register'
                                        ? 'bg-blue-600 hover:bg-blue-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {actionLoading ? 'Executing...' : `Execute ${overrideForm.actionType.toUpperCase()} Override`}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── 4. AUDIT LOGS TAB ────────────────────────────────────────────────── */}
            {activeTab === 'audit' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                    <h3 className="text-base font-bold text-gray-800">Immutable Course Registration Audit Trail</h3>
                    <p className="text-xs text-gray-500">All student self-registrations, course drops, and admin override actions are recorded here.</p>

                    <div className="overflow-x-auto pt-2">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50 uppercase text-gray-500 font-bold border-y border-gray-200">
                                    <th className="py-3 px-3">Action</th>
                                    <th className="py-3 px-3">Student Name</th>
                                    <th className="py-3 px-3">Performed By</th>
                                    <th className="py-3 px-3">Reason</th>
                                    <th className="py-3 px-3">IP Address</th>
                                    <th className="py-3 px-3">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {auditLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-6 text-center text-gray-500">
                                            No audit logs found.
                                        </td>
                                    </tr>
                                ) : (
                                    auditLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="py-2.5 px-3">
                                                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 font-semibold text-gray-800">
                                                {log.student?.full_name || log.student_id}
                                            </td>
                                            <td className="py-2.5 px-3 text-gray-600">
                                                {log.performed_by_user?.full_name || 'System / Self'}
                                            </td>
                                            <td className="py-2.5 px-3 text-gray-600">
                                                {log.reason || 'N/A'}
                                            </td>
                                            <td className="py-2.5 px-3 font-mono text-gray-500">
                                                {log.ip_address || '127.0.0.1'}
                                            </td>
                                            <td className="py-2.5 px-3 text-gray-500">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseRegistrationAdmin;
