// frontend/src/pages/Faculty/FacultyRegistrationDashboard.jsx
// Enterprise Faculty Registration Management Dashboard
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { registrationApi } from '../../api/registrationApi';
import {
    BookOpen, Users, Search, Filter, Download, FileText,
    Printer, CheckCircle, Clock, ExternalLink, Loader2,
    Award, BarChart2, ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FacultyRegistrationDashboard = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [courses, setCourses] = useState([]);
    const [selectedAllocation, setSelectedAllocation] = useState(null);
    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (profile?.id) {
            loadFacultyCourses();
        }
    }, [profile?.id]);

    const loadFacultyCourses = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await registrationApi.getFacultyCourses(profile.id);
            if (res?.success) {
                const list = res.courses || [];
                setCourses(list);
                if (list.length > 0) {
                    handleSelectCourse(list[0]);
                }
            }
        } catch (err) {
            console.error('Failed to load faculty registration courses:', err);
            setError('Failed to load allocated courses. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCourse = async (course) => {
        setSelectedAllocation(course);
        setStudentsLoading(true);
        try {
            const res = await registrationApi.getFacultyCourseStudents(course.allocation_id);
            if (res?.success) {
                setStudents(res.students || []);
            }
        } catch (err) {
            console.error('Failed to load registered students:', err);
        } finally {
            setStudentsLoading(false);
        }
    };

    const filteredStudents = students.filter((s) => {
        const query = searchQuery.toLowerCase();
        return (
            !searchQuery ||
            s.student?.full_name?.toLowerCase().includes(query) ||
            s.student?.email?.toLowerCase().includes(query) ||
            s.student?.enrollment_no?.toLowerCase().includes(query)
        );
    });

    // Exports
    const exportCSV = () => {
        const headers = ['Enrollment No', 'Student Name', 'Email', 'Department', 'Semester', 'Status', 'Registered At'];
        const rows = filteredStudents.map(s => [
            s.student?.enrollment_no || 'N/A',
            s.student?.full_name || '',
            s.student?.email || '',
            s.student?.department || '',
            s.student?.semester || 1,
            s.status,
            new Date(s.registered_at).toLocaleDateString()
        ]);
        const csv = [headers, ...rows].map(e => e.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `roster_${selectedAllocation?.subject_code || 'course'}.csv`;
        link.click();
    };

    const exportExcel = () => {
        const tableHtml = `
            <table border="1">
                <thead>
                    <tr>
                        <th>Enrollment No</th>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th>Semester</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredStudents.map(s => `
                        <tr>
                            <td>${s.student?.enrollment_no || 'N/A'}</td>
                            <td>${s.student?.full_name || ''}</td>
                            <td>${s.student?.email || ''}</td>
                            <td>${s.student?.department || ''}</td>
                            <td>${s.student?.semester || 1}</td>
                            <td>${s.status}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `roster_${selectedAllocation?.subject_code || 'course'}.xls`;
        link.click();
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600 font-medium">Loading Faculty Registration Dashboard...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 space-y-6">
            {/* ── HEADER ───────────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800">Faculty Registration Management</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Monitor course strength, capacity utilization, and manage enrolled student rosters.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => navigate('/faculty-attendance')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" /> Attendance Shortcut
                    </button>
                </div>
            </div>

            {/* ── COURSES OVERVIEW CARDS ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {courses.map((c) => {
                    const isSelected = selectedAllocation?.allocation_id === c.allocation_id;
                    const occupancy = c.utilization_percentage || 0;
                    return (
                        <div
                            key={c.allocation_id}
                            onClick={() => handleSelectCourse(c)}
                            className={`cursor-pointer rounded-xl p-5 border transition-all bg-white shadow-sm ${
                                isSelected
                                    ? 'border-blue-600 ring-2 ring-blue-600/20'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase">
                                    {c.subject_code}
                                </span>
                                <span className="text-xs font-semibold text-gray-500">
                                    {c.subject_credits} Credits
                                </span>
                            </div>
                            <h3 className="text-base font-bold text-gray-800 mt-2 line-clamp-1">
                                {c.subject_name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Batch: {c.batch_name || 'All Batches'} &bull; {c.subject_category || 'Core'}
                            </p>

                            {/* Capacity Gauge */}
                            <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
                                <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                                    <span>Course Strength</span>
                                    <span>{c.enrolled_count || 0} / {c.capacity || 60} students ({occupancy}%)</span>
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
                    );
                })}
            </div>

            {/* ── REGISTERED STUDENTS ROSTER ───────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">
                            Registered Student Roster — {selectedAllocation?.subject_code} ({selectedAllocation?.subject_name})
                        </h2>
                        <p className="text-xs text-gray-500">
                            Showing {filteredStudents.length} registered student(s)
                        </p>
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
                            <Printer className="w-3.5 h-3.5 text-gray-600" /> Print
                        </button>
                    </div>
                </div>

                {/* Filter bar */}
                <div className="flex items-center space-x-4 pt-2">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by student name, email, or enrollment number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-y border-gray-200 text-xs font-bold uppercase text-gray-500">
                                <th className="py-3 px-4">Enrollment No</th>
                                <th className="py-3 px-4">Student Name</th>
                                <th className="py-3 px-4">Email</th>
                                <th className="py-3 px-4">Department</th>
                                <th className="py-3 px-4">Semester</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Registered On</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {studentsLoading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-500">
                                        <Loader2 className="h-6 w-6 animate-spin inline mr-2 text-blue-600" />
                                        Loading student roster...
                                    </td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-500">
                                        No registered students found matching search.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/70">
                                        <td className="py-3 px-4 font-semibold text-gray-800">
                                            {item.student?.enrollment_no || 'N/A'}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-gray-900">
                                            {item.student?.full_name}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                            {item.student?.email}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                            {item.student?.department || 'Computer Science'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                            Sem {item.student?.semester || 1}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <CheckCircle className="w-3 h-3" /> {item.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 text-xs">
                                            {new Date(item.registered_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FacultyRegistrationDashboard;
