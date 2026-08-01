// frontend/src/pages/Student/CourseRegistration.jsx
// Enterprise Course Registration & Discovery Portal for Students
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { registrationApi } from '../../api/registrationApi';
import {
    BookOpen, Search, Filter, Clock, CheckCircle2, AlertCircle,
    XCircle, Download, FileText, Printer, Shield, ChevronRight,
    Loader2, Users, Award, Calendar, Layers, Info
} from 'lucide-react';

const CourseRegistration = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Tab state
    const [activeTab, setActiveTab] = useState('available'); // 'available' | 'registered' | 'history'

    // Discovery state
    const [courses, setCourses] = useState([]);
    const [studentInfo, setStudentInfo] = useState(null);
    const [windowInfo, setWindowInfo] = useState(null);
    const [creditsSummary, setCreditsSummary] = useState({
        totalRegistered: 0,
        coreRegistered: 0,
        electiveRegistered: 0,
        minimumRequired: 12,
        maximumAllowed: 26,
        remainingElectiveCredits: 14
    });

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [creditFilter, setCreditFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState(''); // Theory / Practical

    // Confirmation Modal
    const [confirmModal, setConfirmModal] = useState({
        open: false,
        type: 'register', // 'register' | 'drop'
        course: null
    });

    useEffect(() => {
        if (profile?.id) {
            loadRegistrationData();
        }
    }, [profile?.id]);

    const loadRegistrationData = async () => {
        setLoading(true);
        setError('');
        try {
            const [discoveryRes, dashboardRes] = await Promise.all([
                registrationApi.getAvailableCourses(profile.id),
                registrationApi.getStudentDashboard(profile.id)
            ]);

            if (discoveryRes?.success) {
                setCourses(discoveryRes.courses || []);
                setStudentInfo(discoveryRes.student || {
                    full_name: profile.full_name,
                    program: 'B.Tech',
                    department: profile.department || 'Computer Science',
                    semester: profile.semester || 1,
                    batch: 'B1'
                });
            }
            if (dashboardRes?.success) {
                setWindowInfo(dashboardRes.window || { status: 'OPEN', min_credits: 12, max_credits: 26 });
                if (dashboardRes.credits) {
                    setCreditsSummary(dashboardRes.credits);
                }
            }
        } catch (err) {
            console.error('Failed to load registration data:', err);
            setError('Failed to load course registration portal. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Filtered courses
    const filteredCourses = courses.filter((c) => {
        const matchesSearch =
            !searchQuery ||
            c.subject_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.faculty_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !categoryFilter || c.subject_category === categoryFilter;
        const matchesCredit = !creditFilter || String(c.subject_credits) === creditFilter;
        const matchesType = !typeFilter || c.subject_type === typeFilter;
        return matchesSearch && matchesCategory && matchesCredit && matchesType;
    });

    // Register / Drop actions
    const handleRegister = async (course) => {
        setActionLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await registrationApi.registerCourse(profile.id, course.allocation_id);
            if (res?.success) {
                setSuccess(`Successfully registered for ${course.subject_code} - ${course.subject_name}`);
                setConfirmModal({ open: false, type: 'register', course: null });
                await loadRegistrationData();
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || 'Registration failed';
            setError(msg);
            setConfirmModal({ open: false, type: 'register', course: null });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDrop = async (course) => {
        setActionLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await registrationApi.dropCourse(profile.id, course.allocation_id);
            if (res?.success) {
                setSuccess(`Successfully dropped ${course.subject_code} - ${course.subject_name}`);
                setConfirmModal({ open: false, type: 'drop', course: null });
                await loadRegistrationData();
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || 'Drop course failed';
            setError(msg);
            setConfirmModal({ open: false, type: 'drop', course: null });
        } finally {
            setActionLoading(false);
        }
    };

    // Export Utilities
    const exportCSV = () => {
        const headers = ['Subject Code', 'Subject Name', 'Category', 'Credits', 'Faculty', 'Status', 'Utilization %'];
        const rows = courses.map((c) => [
            c.subject_code,
            c.subject_name,
            c.subject_category || 'Core',
            c.subject_credits,
            c.faculty_name || 'Unassigned',
            c.my_registration_status,
            `${c.utilization_percentage || 0}%`
        ]);
        const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `course_registrations_sem_${studentInfo?.semester || 1}.csv`;
        link.click();
    };

    const exportExcel = () => {
        const tableHtml = `
            <table border="1">
                <thead>
                    <tr>
                        <th>Subject Code</th>
                        <th>Subject Name</th>
                        <th>Category</th>
                        <th>Credits</th>
                        <th>Faculty</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${courses.map(c => `
                        <tr>
                            <td>${c.subject_code}</td>
                            <td>${c.subject_name}</td>
                            <td>${c.subject_category || 'Core'}</td>
                            <td>${c.subject_credits}</td>
                            <td>${c.faculty_name || 'Unassigned'}</td>
                            <td>${c.my_registration_status}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `course_registrations_sem_${studentInfo?.semester || 1}.xls`;
        link.click();
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600 font-medium">Loading Course Registration Portal...</span>
            </div>
        );
    }

    const isWindowOpen = windowInfo?.status === 'OPEN';

    return (
        <div className="min-h-screen bg-gray-50 p-6 space-y-6">
            {/* ── 1. REGISTRATION WINDOW STATUS BANNER ──────────────────────────────── */}
            <div className={`rounded-xl p-4 shadow-sm border flex items-center justify-between ${
                isWindowOpen
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-600'
                    : 'bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-600'
            }`}>
                <div className="flex items-center space-x-3">
                    <Clock className="h-6 w-6 animate-pulse" />
                    <div>
                        <h2 className="text-lg font-bold">
                            {isWindowOpen ? 'Course Registration Window is OPEN' : 'Course Registration is CLOSED'}
                        </h2>
                        <p className="text-sm opacity-90">
                            {isWindowOpen && windowInfo?.end_date
                                ? `Deadline: ${new Date(windowInfo.end_date).toLocaleDateString()} (${new Date(windowInfo.end_date).toLocaleTimeString()})`
                                : 'Check Academic Calendar for next scheduled registration period.'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                        Semester {studentInfo?.semester || 1}
                    </span>
                </div>
            </div>

            {/* ── 2. STUDENT COURSE DISCOVERY HEADER ───────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div>
                        <span className="text-xs text-gray-500 font-semibold uppercase">Program</span>
                        <p className="text-sm font-bold text-gray-800">{studentInfo?.program || 'B.Tech'}</p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 font-semibold uppercase">Department</span>
                        <p className="text-sm font-bold text-gray-800">{studentInfo?.department || 'Computer Science'}</p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 font-semibold uppercase">Academic Year</span>
                        <p className="text-sm font-bold text-gray-800">2026-2027</p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 font-semibold uppercase">Semester</span>
                        <p className="text-sm font-bold text-gray-800">Sem {studentInfo?.semester || 1}</p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 font-semibold uppercase">Division</span>
                        <p className="text-sm font-bold text-gray-800">Div A</p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 font-semibold uppercase">Batch</span>
                        <p className="text-sm font-bold text-gray-800">{studentInfo?.batch || 'B1'}</p>
                    </div>
                </div>

                {/* Credit Summary Bar */}
                <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-6">
                        <div>
                            <span className="text-xs text-gray-500">Total Credits Registered</span>
                            <div className="text-xl font-extrabold text-blue-600">
                                {creditsSummary.totalRegistered} <span className="text-xs text-gray-400 font-normal">/ {creditsSummary.maximumAllowed} max</span>
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500">Core Credits</span>
                            <div className="text-xl font-bold text-gray-800">{creditsSummary.coreRegistered}</div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500">Elective Credits</span>
                            <div className="text-xl font-bold text-gray-800">{creditsSummary.electiveRegistered}</div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5">
                            <Award className="w-4 h-4" /> Remaining Electives: {creditsSummary.remainingElectiveCredits} credits
                        </span>
                    </div>
                </div>
            </div>

            {/* ── ALERTS ───────────────────────────────────────────────────────────── */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-center justify-between text-red-700">
                    <div className="flex items-center space-x-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                    <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
                </div>
            )}
            {success && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-md flex items-center justify-between text-emerald-700">
                    <div className="flex items-center space-x-3">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{success}</span>
                    </div>
                    <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700 font-bold text-lg">&times;</button>
                </div>
            )}

            {/* ── 3. TOOLBAR & EXPORTS ─────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-2 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('available')}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                            activeTab === 'available'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Available Courses ({courses.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('registered')}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                            activeTab === 'registered'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        My Registrations ({courses.filter(c => ['REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE'].includes(c.my_registration_status)).length})
                    </button>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={exportExcel}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                        <Download className="w-3.5 h-3.5 text-emerald-600" /> Excel (.xls)
                    </button>
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                        <FileText className="w-3.5 h-3.5 text-blue-600" /> CSV
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                        <Printer className="w-3.5 h-3.5 text-gray-600" /> Print / PDF
                    </button>
                </div>
            </div>

            {/* ── 4. SEARCH & FILTERS BAR ──────────────────────────────────────────── */}
            {activeTab === 'available' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by code, subject name, or faculty..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Categories</option>
                        <option value="Core">Core</option>
                        <option value="Elective">Elective</option>
                        <option value="Open Elective">Open Elective</option>
                        <option value="Department Elective">Department Elective</option>
                        <option value="Minor">Minor</option>
                        <option value="Honours">Honours</option>
                    </select>
                    <select
                        value={creditFilter}
                        onChange={(e) => setCreditFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Credits</option>
                        <option value="1">1 Credit</option>
                        <option value="2">2 Credits</option>
                        <option value="3">3 Credits</option>
                        <option value="4">4 Credits</option>
                    </select>
                </div>
            )}

            {/* ── 5. SUBJECT CARDS GRID ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(activeTab === 'available'
                    ? filteredCourses
                    : filteredCourses.filter(c => ['REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE'].includes(c.my_registration_status))
                ).map((course) => {
                    const isRegistered = ['REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE'].includes(course.my_registration_status);
                    const occupancy = course.utilization_percentage || 0;
                    const seatsLeft = (course.capacity || 60) - (course.enrolled_count || 0);

                    return (
                        <div
                            key={course.allocation_id}
                            className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md flex flex-col justify-between ${
                                isRegistered ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-gray-200'
                            }`}
                        >
                            <div className="p-5 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase">
                                            {course.subject_code}
                                        </span>
                                        <h3 className="text-base font-bold text-gray-800 mt-2 line-clamp-2">
                                            {course.subject_name}
                                        </h3>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                                        {course.subject_credits} Credits
                                    </span>
                                </div>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700">
                                        {course.subject_category || 'Core'}
                                    </span>
                                    {course.batch_name && (
                                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700">
                                            Batch: {course.batch_name}
                                        </span>
                                    )}
                                </div>

                                {/* Faculty Info */}
                                <div className="text-xs text-gray-600 flex items-center space-x-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span>Faculty: <strong>{course.faculty_name || 'Unassigned'}</strong></span>
                                </div>

                                {/* Prerequisites Tag */}
                                {course.prerequisites && course.prerequisites.length > 0 && (
                                    <div className="bg-amber-50/70 border border-amber-200/60 rounded-lg p-2 text-xs text-amber-800">
                                        <span className="font-bold flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> Prerequisites:
                                        </span>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {course.prerequisites.map(p => (
                                                <span key={p.id} className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-medium">
                                                    {p.code}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Real-time Available Seats Gauge */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                                        <span>Seat Availability</span>
                                        <span>{seatsLeft > 0 ? `${seatsLeft} seats left` : 'FULL'} ({course.enrolled_count || 0}/{course.capacity || 60})</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                occupancy > 90 ? 'bg-red-500' : occupancy > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${Math.min(100, occupancy)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions Bar */}
                            <div className="p-4 bg-gray-50/50 border-t border-gray-100 rounded-b-xl flex items-center justify-between">
                                {isRegistered ? (
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Registered
                                        </span>
                                        <button
                                            onClick={() => setConfirmModal({ open: true, type: 'drop', course })}
                                            disabled={!isWindowOpen || actionLoading}
                                            className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            Drop Course
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-xs text-gray-500">
                                            {course.is_full ? 'No seats remaining' : 'Available for enrollment'}
                                        </span>
                                        <button
                                            onClick={() => setConfirmModal({ open: true, type: 'register', course })}
                                            disabled={!isWindowOpen || course.is_full || actionLoading}
                                            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        >
                                            Register
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── 6. CONFIRMATION MODAL ────────────────────────────────────────────── */}
            {confirmModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-800">
                            {confirmModal.type === 'register' ? 'Confirm Course Registration' : 'Confirm Drop Course'}
                        </h3>
                        <p className="text-sm text-gray-600">
                            {confirmModal.type === 'register' ? (
                                <>
                                    Are you sure you want to register for{' '}
                                    <strong className="text-gray-800">
                                        {confirmModal.course?.subject_code} - {confirmModal.course?.subject_name}
                                    </strong>
                                    ? This will allocate <strong>{confirmModal.course?.subject_credits} credits</strong> to your semester.
                                </>
                            ) : (
                                <>
                                    Are you sure you want to drop{' '}
                                    <strong className="text-gray-800">
                                        {confirmModal.course?.subject_code} - {confirmModal.course?.subject_name}
                                    </strong>
                                    ? You can re-register later only if seats remain available.
                                </>
                            )}
                        </p>
                        <div className="flex items-center justify-end space-x-3 pt-2">
                            <button
                                onClick={() => setConfirmModal({ open: false, type: 'register', course: null })}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() =>
                                    confirmModal.type === 'register'
                                        ? handleRegister(confirmModal.course)
                                        : handleDrop(confirmModal.course)
                                }
                                disabled={actionLoading}
                                className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm ${
                                    confirmModal.type === 'register'
                                        ? 'bg-blue-600 hover:bg-blue-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {actionLoading ? 'Processing...' : confirmModal.type === 'register' ? 'Confirm & Register' : 'Confirm Drop'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseRegistration;
