import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Filter, Users, BookOpen, AlertCircle, CheckCircle2, Trash2, Edit2, Layers, Plus } from 'lucide-react';
import SubjectCreatorModal from '../components/Dashboard/SubjectCreatorModal';

const AllocationDashboard = () => {
    const { profile } = useAuth();

    // ==========================================
    // 1. STATE (SCALABLE ARCHITECTURE)
    // ==========================================
    const [departments, setDepartments] = useState([]);
    const [facultyList, setFacultyList] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Feedback States (Toast replacements)
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dependent Wizard States
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [selectedYearId, setSelectedYearId] = useState('');
    const [selectedSemesterId, setSelectedSemesterId] = useState('');
    const [selectedBatchId, setSelectedBatchId] = useState('');

    // Bulk Assignment States
    const [selectedSubjects, setSelectedSubjects] = useState([]); // Array of IDs for Bulk Mapping
    const [selectedFacultyId, setSelectedFacultyId] = useState('');

    // Modal State
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

    // ==========================================
    // 2. DATA FETCHING (Exactly 3 Queries Max)
    // ==========================================
    useEffect(() => {
        fetchCoreData();
    }, []);

    const fetchCoreData = async () => {
        setIsLoading(true);
        try {
            // Query 1: Deep Inner Join across all structure tables
            // This eliminates N+1 queries. It builds a localized memory tree.
            const { data: deptData, error: deptError } = await supabase
                .from('departments')
                .select(`
          id, name, code,
          academic_years (
            id, year_level,
            semesters (
              id, term_number,
              batches (id, name)
            )
          ),
          subjects (id, name, code, credits)
        `)
                .eq('is_active', true);
            if (deptError) throw deptError;

            // Query 2: Only grab legitimate faculty roles
            const { data: facData, error: facError } = await supabase
                .from('profiles')
                .select('id, full_name, email, role')
                .in('role', ['faculty', 'hod', 'instructor']); // Support both legacy and new role tags
            if (facError) throw facError;

            // Query 3: Grab live Subject Allocations for the DataGrid table
            const { data: allocData, error: allocError } = await supabase
                .from('subject_allocations')
                .select(`
          id, subject_id, batch_id, semester_id, faculty_id,
          subject:subjects(name, code),
          batch:batches(name),
          semester:semesters(term_number),
          faculty:profiles(full_name, email)
        `)
                .order('created_at', { ascending: false });
            if (allocError) throw allocError;

            setDepartments(deptData || []);
            setFacultyList(facData || []);
            setAllocations(allocData || []);
        } catch (err) {
            setErrorMsg('Failed to initialize ERP Engine: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };
    const showError = (msg) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 5000); };

    // ==========================================
    // 3. DEPENDENT O(1) DERIVATIONS
    // ==========================================
    // Memory extraction - Prevents re-calling Supabase API for nested dropdowns
    const activeDepartment = useMemo(() => departments.find(d => d.id === selectedDeptId), [departments, selectedDeptId]);
    const availableYears = useMemo(() => activeDepartment?.academic_years || [], [activeDepartment]);
    const activeYear = useMemo(() => availableYears.find(y => y.id === selectedYearId), [availableYears, selectedYearId]);
    const availableSemesters = useMemo(() => activeYear?.semesters || [], [activeYear]);
    const activeSemester = useMemo(() => availableSemesters.find(s => s.id === selectedSemesterId), [availableSemesters, selectedSemesterId]);
    const availableBatches = useMemo(() => activeSemester?.batches || [], [activeSemester]);
    const rawSubjects = useMemo(() => activeDepartment?.subjects || [], [activeDepartment]);

    // Determine subjects available for explicit batch (Exclude already assigned subjects to this batch)
    const availableSubjects = useMemo(() => {
        if (!selectedBatchId) return [];
        return rawSubjects.filter(sub => {
            // If allocating exists for this exact Subject + Batch combination, hide it!
            const isAlreadyAssigned = allocations.some(a => a.subject_id === sub.id && a.batch_id === selectedBatchId);
            return !isAlreadyAssigned;
        });
    }, [rawSubjects, allocations, selectedBatchId]);

    // Clean-up cascaded state loops when a parent changes
    useEffect(() => { setSelectedYearId(''); setSelectedSemesterId(''); setSelectedBatchId(''); setSelectedSubjects([]); }, [selectedDeptId]);
    useEffect(() => { setSelectedSemesterId(''); setSelectedBatchId(''); setSelectedSubjects([]); }, [selectedYearId]);
    useEffect(() => { setSelectedBatchId(''); setSelectedSubjects([]); }, [selectedSemesterId]);
    useEffect(() => { setSelectedSubjects([]); }, [selectedBatchId]);

    const toggleSubject = (subjectId) => {
        setSelectedSubjects(prev =>
            prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
        );
    };

    // ==========================================
    // 4. ACTION HANDLERS (Mutations & Bulk Sync)
    // ==========================================

    // BULK ALLOCATE FUNCTION
    const handleBulkAllocate = async (e) => {
        e.preventDefault();
        setErrorMsg(''); setSuccessMsg('');

        if (selectedSubjects.length === 0) {
            return showError('Please select at least one subject to map.');
        }

        setIsSubmitting(true);
        try {
            // Create array map for bulk insertion in one Supabase network request
            const insertionData = selectedSubjects.map(subId => ({
                subject_id: subId,
                batch_id: selectedBatchId,
                semester_id: selectedSemesterId,
                faculty_id: selectedFacultyId
            }));

            const { data, error } = await supabase
                .from('subject_allocations')
                .insert(insertionData)
                .select(`
          id, subject_id, batch_id, semester_id, faculty_id,
          subject:subjects(name, code),
          batch:batches(name),
          semester:semesters(term_number),
          faculty:profiles(full_name, email)
        `);

            // DB-Level triggers will block any corrupted data silently.
            if (error) throw error;

            // Optimistically push ALL results immediately into array
            setAllocations([...data, ...allocations]);
            showSuccess(`Successfully allocated ${data.length} subject(s)!`);

            // Reset form tier
            setSelectedSubjects([]);
            setSelectedFacultyId('');
        } catch (err) {
            showError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // OPTIMISTIC UPDATE FACULTY
    const handleUpdateFaculty = async (allocationId, newFacultyId) => {
        if (!newFacultyId) return;

        // 1. Clone array to update optimistically first
        const backupTarget = allocations.find(a => a.id === allocationId);
        const backupFaculty = backupTarget.faculty; // Save locally incase of revert

        // Temporarily mutate UI
        setAllocations(allocations.map(a =>
            a.id === allocationId
                ? { ...a, faculty_id: newFacultyId, faculty: facultyList.find(f => f.id === newFacultyId) }
                : a
        ));

        try {
            // 2. Network push (background)
            const { error } = await supabase
                .from('subject_allocations')
                .update({ faculty_id: newFacultyId })
                .eq('id', allocationId);

            if (error) throw error;
            showSuccess('Faculty reassigned successfully.');
        } catch (err) {
            showError('Failed to reassign: ' + err.message);
            // Rollback UI organically
            setAllocations(allocations.map(a =>
                a.id === allocationId ? { ...a, faculty_id: backupFaculty.id, faculty: backupFaculty } : a
            ));
        }
    };

    // OPTIMISTIC DELETE
    const handleDelete = async (allocationId) => {
        if (!window.confirm('Permanently wipe this module allocation?')) return;

        const backupAllocations = [...allocations];
        setAllocations(allocations.filter(a => a.id !== allocationId)); // Optimistic UI slice

        try {
            const { error } = await supabase.from('subject_allocations').delete().eq('id', allocationId);
            if (error) throw error;
            showSuccess('Allocation wiped from active semester logs.');
        } catch (err) {
            showError('Failed to remove: ' + err.message);
            setAllocations(backupAllocations); // Revert
        }
    };


    // OPTIMISTIC DELETE SUBJECT
    const handleDeleteSubject = async (subjectId) => {
        if (!window.confirm('WARNING: Deleting this Course will permanently wipe ALL connected student allocations and dependencies. Continue?')) return;

        try {
            const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
            if (error) throw error;
            showSuccess('Course entirely purged from the system.');
            fetchCoreData(); // Re-sync the core tree immediately to reflect cascaded changes
        } catch (err) {
            showError('Failed to remove course: ' + err.message);
        }
    };


    if (isLoading) return <div className="p-8 text-center font-bold text-gray-500 tracking-widest uppercase">Loading Core ERP Hierarchy...</div>;

    return (
        <div className="p-8 sm:p-12 space-y-10 font-sans">
            <div className="mb-4">
                <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">Academic Mapping Core</h1>
                <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">Bulk Subject & Faculty Allocation Matrix</p>
            </div>

            {/* Floating Alerts */}
            <div className="fixed top-8 right-8 z-50 space-y-2 pointer-events-none w-80">
                {errorMsg && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 shadow-xl rounded-r-xl flex items-center gap-3">
                        <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0" />
                        <p className="text-xs font-bold text-red-700 leading-tight">{errorMsg}</p>
                    </div>
                )}
                {successMsg && (
                    <div className="p-4 bg-green-50 border-l-4 border-green-500 shadow-xl rounded-r-xl flex items-center gap-3">
                        <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" />
                        <p className="text-xs font-bold text-green-700 leading-tight">{successMsg}</p>
                    </div>
                )}
            </div>

            {/* 1. DEPENDENT MAPPING FORM (O(1) Filtered) */}
            <div className="bg-white rounded-[2rem] p-8 border border-[var(--color-border-light)] shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                    <Layers className="w-6 h-6 text-[#ef4444]" />
                    <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight">Bulk Allocation Wizard</h2>
                </div>

                <form onSubmit={handleBulkAllocate} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                        <div className="col-span-1 border-r border-gray-100 pr-6 space-y-5">
                            {/* Dept */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">1. Department</label>
                                <select
                                    value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-[#1a1b4b]/20"
                                    required
                                >
                                    <option value="">-- Select --</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                                </select>
                            </div>

                            {/* Year */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">2. Year</label>
                                <select
                                    value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)} disabled={!selectedDeptId}
                                    className="w-full p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none disabled:opacity-50"
                                    required
                                >
                                    <option value="">-- Route --</option>
                                    {availableYears.map(y => <option key={y.id} value={y.id}>{y.year_level}</option>)}
                                </select>
                            </div>

                            {/* Semester */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">3. Semester</label>
                                <select
                                    value={selectedSemesterId} onChange={(e) => setSelectedSemesterId(e.target.value)} disabled={!selectedYearId}
                                    className="w-full p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none disabled:opacity-50"
                                    required
                                >
                                    <option value="">-- Route --</option>
                                    {availableSemesters.map(s => <option key={s.id} value={s.id}>Sem {s.term_number}</option>)}
                                </select>
                            </div>

                            {/* Batch */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">4. Target Batch</label>
                                <select
                                    value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)} disabled={!selectedSemesterId}
                                    className="w-full p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm font-black text-[#ef4444] outline-none disabled:opacity-50"
                                    required
                                >
                                    <option value="">-- Final Target --</option>
                                    {availableBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Selection Area (Spans remaining columns) */}
                        <div className="lg:col-span-3 space-y-6 flex flex-col pt-1 pl-2">

                            {/* Bulk Subjects Filtered Wrapper */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-[#1a1b4b]" /> 5. Select Curriculum Subjects
                                    </label>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsSubjectModalOpen(true)}
                                        disabled={!selectedDeptId}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-[#1a1b4b] rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                    >
                                        <Plus size={12} strokeWidth={4} /> New Course
                                    </button>
                                </div>

                                {selectedBatchId ? (
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-y-auto max-h-[180px] space-y-2 relative">
                                        {availableSubjects.length === 0 ? (
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mt-6">All mapped or No subjects attached.</p>
                                        ) : (
                                            availableSubjects.map(sub => (
                                                <label key={sub.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg cursor-pointer hover:border-gray-300 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSubjects.includes(sub.id)}
                                                        onChange={() => toggleSubject(sub.id)}
                                                        className="w-4 h-4 text-[#ef4444] rounded ring-0 outline-none"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="font-bold text-[#1a1b4b] text-sm block">[{sub.code}] {sub.name}</span>
                                                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{sub.credits} Credits</span>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 bg-gray-50/50 border border-gray-200 border-dashed rounded-xl flex items-center justify-center p-6 text-center">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select a valid Target Batch structure first to resolve missing linkages.</p>
                                    </div>
                                )}
                            </div>

                            {/* Faculty Assignment Bottom Row */}
                            <div className="flex items-end gap-6 bg-[#f4f6fa]/60 p-5 rounded-xl border border-[#1a1b4b]/5">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-[#1a1b4b]" /> 6. Assigned Instructor
                                    </label>
                                    <select
                                        value={selectedFacultyId} onChange={(e) => setSelectedFacultyId(e.target.value)} disabled={!selectedBatchId || selectedSubjects.length === 0}
                                        className="w-full p-3 bg-white rounded-lg border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none disabled:opacity-50"
                                        required
                                    >
                                        <option value="">-- Bind Faculty --</option>
                                        {facultyList.map(f => <option key={f.id} value={f.id}>{f.full_name} ({f.email})</option>)}
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !selectedBatchId || selectedSubjects.length === 0 || !selectedFacultyId}
                                    className="px-8 py-3 bg-[#1a1b4b] hover:bg-[#2d3a8c] text-white font-black uppercase tracking-widest text-xs rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 h-[46px]"
                                >
                                    {isSubmitting ? 'Syncing...' : `Map ${selectedSubjects.length} Subject(s)`}
                                </button>
                            </div>

                        </div>
                    </div>
                </form>
            </div>

            {/* 1.5 ACTIVE CURRICULUM REGISTRY */}
            {activeDepartment && rawSubjects.length > 0 && (
                 <div className="bg-white rounded-[2rem] p-8 border border-[var(--color-border-light)] shadow-sm">
                 <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight mb-6 flex justify-between items-center">
                     <span>{activeDepartment.code} Course Registry</span>
                     <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{rawSubjects.length} Courses Linked</span>
                 </h2>
 
                 <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]">
                     <table className="w-full text-left border-collapse min-w-[900px]">
                         <thead className="bg-[#f4f6fa]/80">
                             <tr>
                                 <th className="p-4 pl-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/4">Subject Code</th>
                                 <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/4">Full Name</th>
                                 <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/6">Credits</th>
                                 <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/12 text-center">Flush</th>
                             </tr>
                         </thead>
                         <tbody>
                             {rawSubjects.map(sub => (
                                 <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50/80 group">
                                     <td className="p-4 pl-6">
                                         <p className="font-bold text-[#1a1b4b] text-sm tabular-nums">{sub.code}</p>
                                     </td>
                                     <td className="p-4">
                                        <p className="text-[12px] text-gray-600 font-bold tracking-tight uppercase">{sub.name}</p>
                                     </td>
                                     <td className="p-4">
                                         <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded shadow-[inset_0_0_0_1px_rgba(16,185,129,0.1)]">
                                             {sub.credits} CR
                                         </span>
                                     </td>
                                     <td className="p-4 text-center">
                                         <button
                                             onClick={() => handleDeleteSubject(sub.id)}
                                             title="Permanently Delete Course"
                                             className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                         >
                                             <Trash2 className="w-4 h-4" />
                                         </button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
            )}

            {/* 2. LIVE ALLOCATION GRID (With Optimistic Updates) */}
            <div className="bg-white rounded-[2rem] p-8 border border-[var(--color-border-light)] shadow-sm">
                <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight mb-6 flex justify-between items-center">
                    <span>Global Allocation Registry</span>
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{allocations.length} Active Records</span>
                </h2>

                <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead className="bg-[#f4f6fa]/80">
                            <tr>
                                <th className="p-4 pl-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/4">Subject Code</th>
                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/6">Level</th>
                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/6">Target Batch</th>
                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/3">Assigned Faculty (Auto-Saves)</th>
                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/12 text-center">Flush</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allocations.map(alloc => (
                                <tr key={alloc.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50/80 group">
                                    <td className="p-4 pl-6">
                                        <p className="font-bold text-[#1a1b4b] text-sm tabular-nums">{alloc.subject?.code}</p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest truncate max-w-[200px]" title={alloc.subject?.name}>{alloc.subject?.name}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2.5 py-1 bg-blue-50/50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)]">
                                            Sem {alloc.semester?.term_number}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-[#ef4444] rounded-full shadow-[0_0_4px_rgba(239,68,68,0.5)]"></div>
                                            <span className="font-black text-gray-700 tracking-widest text-sm">{alloc.batch?.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 pt-4 pb-4">
                                        {/* INLINE FACULTY EDITOR: Automatically performs Optimistic Network updates */}
                                        <div className="relative">
                                            <select
                                                value={alloc.faculty_id}
                                                onChange={(e) => handleUpdateFaculty(alloc.id, e.target.value)}
                                                className="w-full bg-transparent border border-transparent group-hover:bg-white group-hover:border-gray-200 group-hover:shadow-sm px-3 py-1.5 rounded-md text-sm font-bold text-[#1a1b4b] transition-all outline-none cursor-pointer focus:ring-2 focus:ring-[#1a1b4b]/20"
                                            >
                                                {facultyList.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                                            </select>
                                            <Edit2 className="w-3 h-3 text-gray-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => handleDelete(alloc.id)}
                                            title="Revoke Mapping"
                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {allocations.length === 0 && (
                                <tr><td colSpan="5" className="p-12 text-center">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3"><BookOpen className="w-5 h-5 text-gray-300" /></div>
                                    <p className="text-gray-400 uppercase tracking-widest text-xs font-bold leading-relaxed">No subject mappings have been actively deployed.<br />Use the Wizard to execute bindings.</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <SubjectCreatorModal 
                isOpen={isSubjectModalOpen} 
                onClose={() => setIsSubjectModalOpen(false)} 
                targetDepartment={activeDepartment}
                onSubjectCreated={() => fetchCoreData()} 
            />

        </div>
    );
};

export default AllocationDashboard;
