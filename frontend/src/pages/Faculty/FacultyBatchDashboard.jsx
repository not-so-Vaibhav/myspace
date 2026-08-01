import React, { useState, useEffect } from 'react';
import {
    Users,
    Layers,
    Building2,
    CheckCircle2,
    AlertCircle,
    UserCheck,
    RefreshCw,
    Search,
    BookOpen,
    ClipboardList
} from 'lucide-react';
import { batchApi } from '../../api/batchApi';

export default function FacultyBatchDashboard() {
    const [allocations, setAllocations] = useState([]);
    const [selectedAlloc, setSelectedAlloc] = useState(null);
    const [roster, setRoster] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadFacultyAllocations();
    }, []);

    const loadFacultyAllocations = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await batchApi.listFacultyAllocations();
            const data = res.data || res || [];
            setAllocations(data);
            if (data.length > 0) {
                handleSelectAllocation(data[0]);
            }
        } catch (err) {
            console.error('Error loading faculty allocations:', err);
            setError(err.message || 'Failed to fetch allocated classes & practical batches');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAllocation = async (alloc) => {
        setSelectedAlloc(alloc);
        setRosterLoading(true);
        try {
            const res = await batchApi.getAttendanceRoster({
                classId: alloc.class_id,
                batchId: alloc.batch_id,
                sessionType: alloc.allocation_type
            });
            setRoster(res.data?.roster || res.roster || []);
        } catch (err) {
            console.error('Error loading roster:', err);
        } finally {
            setRosterLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text)] p-6 md:p-10 transition-colors duration-300">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[var(--color-border)] gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                        <Building2 className="w-4 h-4" />
                        <span>Faculty Portal • Class & Practical Batch Management</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight mt-1 bg-gradient-to-r from-[var(--color-primary)] to-purple-500 bg-clip-text text-transparent">
                        My Allocated Classes & Batches
                    </h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        Inspect student rosters for Theory (Entire Class) and Practical Lab sessions (Specific Batch) with attendance shortcuts.
                    </p>
                </div>
                <div>
                    <button
                        onClick={loadFacultyAllocations}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-muted)] transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Roster
                    </button>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                {/* Left Col: Allocated Classes & Batches */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
                        Allocated Sessions
                    </h3>

                    {allocations.map((alloc) => {
                        const isSelected = selectedAlloc?.allocation_id === alloc.allocation_id;
                        return (
                            <div
                                key={alloc.allocation_id}
                                onClick={() => handleSelectAllocation(alloc)}
                                className={`p-4 rounded-2xl border transition cursor-pointer ${
                                    isSelected
                                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md'
                                        : 'border-[var(--color-border)] bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-muted)]'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-[var(--color-text)]">
                                        {alloc.subject_name}
                                    </span>
                                    <span
                                        className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                            alloc.allocation_type === 'THEORY'
                                                ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                                : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                                        }`}
                                    >
                                        {alloc.allocation_type}
                                    </span>
                                </div>
                                <div className="text-xs text-[var(--color-text-muted)] mt-1">
                                    Class: <span className="font-semibold text-[var(--color-text)]">{alloc.class_name}</span> • Batch: <span className="font-semibold text-purple-500">{alloc.batch_name}</span>
                                </div>
                            </div>
                        );
                    })}

                    {allocations.length === 0 && !loading && (
                        <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] text-sm">
                            No classes or practical batches allocated to you yet.
                        </div>
                    )}
                </div>

                {/* Right Col: Student Roster Inspector */}
                <div className="lg:col-span-2">
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold">
                                    {selectedAlloc
                                        ? `${selectedAlloc.class_name} — ${selectedAlloc.batch_name} Roster`
                                        : 'Student Roster Inspector'}
                                </h3>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                    {selectedAlloc?.allocation_type === 'THEORY'
                                        ? 'Whole Class attendance roster (all active students in class)'
                                        : 'Practical Lab attendance roster (strictly assigned batch students)'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    {roster.length} Enrolled
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--color-border)] text-xs font-semibold uppercase text-[var(--color-text-muted)] bg-[var(--color-surface-muted)]">
                                        <th className="p-4">#</th>
                                        <th className="p-4">Student Name</th>
                                        <th className="p-4">Email / ID</th>
                                        <th className="p-4">Class Section</th>
                                        <th className="p-4">Lab Batch</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)] text-sm">
                                    {roster.map((student, idx) => (
                                        <tr key={student.allocation_id || idx} className="hover:bg-[var(--color-surface-muted)]/50 transition">
                                            <td className="p-4 font-mono text-xs text-[var(--color-text-muted)]">{idx + 1}</td>
                                            <td className="p-4 font-bold">{student.student_name}</td>
                                            <td className="p-4 text-xs text-[var(--color-text-muted)]">{student.student_email}</td>
                                            <td className="p-4 font-medium text-blue-500">{student.class_name}</td>
                                            <td className="p-4 font-medium text-purple-500">{student.batch_name}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                    {student.allocation_status || 'ACTIVE'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {roster.length === 0 && !rosterLoading && (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-[var(--color-text-muted)]">
                                                Select a class or batch on the left to inspect the enrolled student roster.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
