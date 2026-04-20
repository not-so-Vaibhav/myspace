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
    
    // Multi-Select for Batches and Subjects (NxM Matrix)
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]); 
    const [selectedFacultyId, setSelectedFacultyId] = useState('');

    // Modal State
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

    // ==========================================
    // 2. DATA FETCHING
    // ==========================================
    useEffect(() => {
        fetchCoreData();
    }, []);

    const fetchCoreData = async () => {
        setIsLoading(true);
        try {
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

            const { data: facData, error: facError } = await supabase
                .from('profiles')
                .select('id, full_name, email, role')
                .in('role', ['faculty', 'hod', 'instructor']);
            if (facError) throw facError;

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
    const activeDepartment = useMemo(() => departments.find(d => d.id === selectedDeptId), [departments, selectedDeptId]);
    const availableYears = useMemo(() => activeDepartment?.academic_years || [], [activeDepartment]);
    const activeYear = useMemo(() => availableYears.find(y => y.id === selectedYearId), [availableYears, selectedYearId]);
    const availableSemesters = useMemo(() => activeYear?.semesters || [], [activeYear]);
    const activeSemester = useMemo(() => availableSemesters.find(s => s.id === selectedSemesterId), [availableSemesters, selectedSemesterId]);
    
    // Sort batches alphabetically/numerically automatically
    const availableBatches = useMemo(() => {
        const sorted = [...(activeSemester?.batches || [])];
        sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        return sorted;
    }, [activeSemester]);
    
    const rawSubjects = useMemo(() => activeDepartment?.subjects || [], [activeDepartment]);

    // Available subjects logic: Display all if at least one batch is selected
    const availableSubjects = useMemo(() => {
        if (selectedBatches.length === 0) return [];
        return rawSubjects.filter(sub => {
            // Return true if this subject is NOT assigned to at least one of the selected batches
            const isAssignedToAllSelected = selectedBatches.every(bId => 
                allocations.some(a => a.subject_id === sub.id && a.batch_id === bId)
            );
            return !isAssignedToAllSelected;
        });
    }, [rawSubjects, allocations, selectedBatches]);

    // Clean-up cascaded state loops
    useEffect(() => { setSelectedYearId(''); setSelectedSemesterId(''); setSelectedBatches([]); setSelectedSubjects([]); }, [selectedDeptId]);
    useEffect(() => { setSelectedSemesterId(''); setSelectedBatches([]); setSelectedSubjects([]); }, [selectedYearId]);
    useEffect(() => { setSelectedBatches([]); setSelectedSubjects([]); }, [selectedSemesterId]);
    useEffect(() => { setSelectedSubjects([]); }, [selectedBatches]);

    const toggleSubject = (subjectId) => {
        setSelectedSubjects(prev =>
            prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
        );
    };

    const toggleBatch = (batchId) => {
        setSelectedBatches(prev => 
            prev.includes(batchId) ? prev.filter(id => id !== batchId) : [...prev, batchId]
        );
    };

    const handleSelectAllBatches = () => {
        if (selectedBatches.length === availableBatches.length) {
            setSelectedBatches([]);
        } else {
            setSelectedBatches(availableBatches.map(b => b.id));
        }
    };

    // ==========================================
    // 4. ACTION HANDLERS (Mutations)
    // ==========================================

    const handleBulkAllocate = async (e) => {
        e.preventDefault();
        setErrorMsg(''); setSuccessMsg('');

        if (selectedSubjects.length === 0 || selectedBatches.length === 0) {
            return showError('Please select at least one subject and one batch.');
        }

        setIsSubmitting(true);
        try {
            // Build NxM Cartesian Product for mapping
            const insertionData = [];
            selectedSubjects.forEach(subId => {
                selectedBatches.forEach(batchId => {
                    // Check if mapping already exists to prevent duplicate failures
                    const isExisting = allocations.some(a => a.subject_id === subId && a.batch_id === batchId);
                    if (!isExisting) {
                        insertionData.push({
                            subject_id: subId,
                            batch_id: batchId,
                            semester_id: selectedSemesterId,
                            faculty_id: selectedFacultyId
                        });
                    }
                });
            });

            if (insertionData.length === 0) {
                setIsSubmitting(false);
                return showError('These specific associations already exist. No new mappings were needed.');
            }

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

            if (error) throw error;

            setAllocations([...data, ...allocations]);
            showSuccess(`Successfully allocated ${data.length} association(s)!`);

            setSelectedSubjects([]);
            setSelectedBatches([]);
            setSelectedFacultyId('');
        } catch (err) {
            showError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateFaculty = async (allocationId, newFacultyId) => {
        if (!newFacultyId) return;
        const backupTarget = allocations.find(a => a.id === allocationId);
        const backupFaculty = backupTarget.faculty; 

        setAllocations(allocations.map(a =>
            a.id === allocationId ? { ...a, faculty_id: newFacultyId, faculty: facultyList.find(f => f.id === newFacultyId) } : a
        ));

        try {
            const { error } = await supabase.from('subject_allocations').update({ faculty_id: newFacultyId }).eq('id', allocationId);
            if (error) throw error;
            showSuccess('Faculty reassigned successfully.');
        } catch (err) {
            showError('Failed to reassign: ' + err.message);
            setAllocations(allocations.map(a => a.id === allocationId ? { ...a, faculty_id: backupFaculty.id, faculty: backupFaculty } : a));
        }
    };

    const handleDelete = async (allocationId) => {
        if (!window.confirm('Permanently wipe this module allocation?')) return;
        const backupAllocations = [...allocations];
        setAllocations(allocations.filter(a => a.id !== allocationId)); 

        try {
            const { error } = await supabase.from('subject_allocations').delete().eq('id', allocationId);
            if (error) throw error;
            showSuccess('Allocation wiped from active semester logs.');
        } catch (err) {
            showError('Failed to remove: ' + err.message);
            setAllocations(backupAllocations);
        }
    };

    const handleDeleteSubject = async (subjectId) => {
        if (!window.confirm('WARNING: Deleting this Course will permanently wipe ALL connected student allocations and dependencies. Continue?')) return;
        try {
            const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
            if (error) throw error;
            showSuccess('Course entirely purged from the system.');
            fetchCoreData(); 
        } catch (err) {
            showError('Failed to remove course: ' + err.message);
        }
    };

    if (isLoading) return <div className="p-8 text-center font-bold text-gray-500 tracking-widest uppercase">Loading Core ERP Hierarchy...</div>;

    return (
        <div className="p-8 sm:p-12 space-y-10 font-sans">
            <div className="mb-4">
                <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">Academic Mapping Core</h1>
                <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">NxM Batch Matrix Allocation</p>
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

            {/* 1. MAPPING FORM */}
            <div className="bg-white rounded-[2rem] p-8 border border-[var(--color-border-light)] shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                    <Layers className="w-6 h-6 text-[#ef4444]" />
                    <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight">Course Allocation</h2>
                </div>

                <form onSubmit={handleBulkAllocate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                        {/* Dropdowns Column (3 spans) */}
                        <div className="col-span-1 md:col-span-3 border-r border-gray-100 pr-6 space-y-5">
                            <div>
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">1. Department</label>
                                <select
                                    value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)}
                                    className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none"
                                    required
                                >
                                    <option value="">-- Select --</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">2. Year</label>
                                <select
                                    value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)} disabled={!selectedDeptId}
                                    className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none disabled:opacity-50"
                                    required
                                >
                                    <option value="">-- Select --</option>
                                    {availableYears.map(y => <option key={y.id} value={y.id}>{y.year_level}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">3. Semester</label>
                                <select
                                    value={selectedSemesterId} onChange={(e) => setSelectedSemesterId(e.target.value)} disabled={!selectedYearId}
                                    className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none disabled:opacity-50"
                                    required
                                >
                                    <option value="">-- Select --</option>
                                    {availableSemesters.map(s => <option key={s.id} value={s.id}>Sem {s.term_number}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Batches Selector (3 spans) */}
                        <div className="col-span-1 md:col-span-3 border-r border-gray-100 pr-6">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest">4. Target Batches</label>
                                {availableBatches.length > 0 && (
                                    <button 
                                      type="button" 
                                      onClick={handleSelectAllBatches}
                                      className="text-[12px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                                    >
                                        {selectedBatches.length === availableBatches.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                )}
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 h-[200px] overflow-y-auto space-y-1">
                                {!selectedSemesterId ? (
                                    <p className="text-[12px] p-2 font-bold text-gray-400 uppercase text-center mt-6">Select Semester First</p>
                                ) : availableBatches.length === 0 ? (
                                    <p className="text-[12px] p-2 font-bold text-red-400 uppercase text-center mt-6">No batches exist for this sem.</p>
                                ) : (
                                    availableBatches.map(b => (
                                        <label key={b.id} className="flex items-center gap-3 p-2 bg-white border border-gray-100 rounded-lg cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
                                            <input
                                                type="checkbox"
                                                checked={selectedBatches.includes(b.id)}
                                                onChange={() => toggleBatch(b.id)}
                                                className="w-4 h-4 text-[#ef4444] rounded outline-none"
                                            />
                                            <span className="font-bold text-[#1a1b4b] text-sm">{b.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Selection & Submit Area (6 spans) */}
                        <div className="col-span-1 md:col-span-6 space-y-6 flex flex-col">
                            {/* Filtered Subjects */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <BookOpen className="w-3.5 h-3.5 text-[#1a1b4b]" /> 5. Select Course(s) to Map
                                    </label>
                                    <button type="button" onClick={() => setIsSubjectModalOpen(true)} disabled={!selectedDeptId}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-[#1a1b4b] rounded-full text-[12px] font-black uppercase tracking-widest hover:bg-indigo-100"
                                    >
                                        <Plus size={12} strokeWidth={4} /> New Course
                                    </button>
                                </div>
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 h-[120px] overflow-y-auto space-y-2">
                                    {selectedBatches.length > 0 ? (
                                        availableSubjects.length === 0 ? (
                                            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest text-center mt-6">All linked.</p>
                                        ) : (
                                            availableSubjects.map(sub => (
                                                <label key={sub.id} className="flex items-center gap-3 p-2 bg-white border border-gray-100 rounded-lg cursor-pointer hover:border-gray-300">
                                                    <input type="checkbox" checked={selectedSubjects.includes(sub.id)} onChange={() => toggleSubject(sub.id)} className="w-4 h-4 text-[#ef4444] rounded" />
                                                    <span className="font-bold text-[#1a1b4b] text-sm flex-1">[{sub.code}] {sub.name}</span>
                                                    <span className="text-[12px] text-gray-400 uppercase font-bold">{sub.credits} CR</span>
                                                </label>
                                            ))
                                        )
                                    ) : (
                                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest text-center mt-6">Select target batches to unlock subjects.</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col xl:flex-row items-end gap-3 bg-[#f4f6fa]/60 p-4 rounded-xl border border-[#1a1b4b]/5">
                                <div className="flex-1 w-full">
                                    <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-[#1a1b4b]" /> 6. Designated Instructor
                                    </label>
                                    <select
                                        value={selectedFacultyId} onChange={(e) => setSelectedFacultyId(e.target.value)} disabled={selectedBatches.length === 0 || selectedSubjects.length === 0}
                                        className="w-full p-2.5 bg-white rounded-lg border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none disabled:opacity-50"
                                        required
                                    >
                                        <option value="">-- Assign Faculty --</option>
                                        {facultyList.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || selectedBatches.length === 0 || selectedSubjects.length === 0 || !selectedFacultyId}
                                    className="px-6 py-2.5 bg-[#1a1b4b] hover:bg-[#2d3a8c] text-white font-black uppercase tracking-widest text-xs rounded-lg transition-all disabled:opacity-50 h-[42px] whitespace-nowrap"
                                >
                                    {isSubmitting ? 'Syncing...' : `Map (${selectedBatches.length}x${selectedSubjects.length})`}
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
                                 <th className="p-4 pl-6 text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/4">Subject Code</th>
                                 <th className="p-4 text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/4">Full Name</th>
                                 <th className="p-4 text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/6">Credits</th>
                                 <th className="p-4 text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/12 text-center">Flush</th>
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
                                         <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[12px] font-black uppercase tracking-widest rounded shadow-[inset_0_0_0_1px_rgba(16,185,129,0.1)]">
                                             {sub.credits} CR
                                         </span>
                                     </td>
                                     <td className="p-4 text-center">
                                         <button
                                             onClick={() => handleDeleteSubject(sub.id)}
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

            {/* 2. LIVE ALLOCATION GRID */}
            <div className="bg-white rounded-[2rem] p-8 border border-[var(--color-border-light)] shadow-sm">
                <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight mb-6 flex justify-between items-center">
                    <span>Global Allocation Registry</span>
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{allocations.length} Active Records</span>
                </h2>

                <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead className="bg-[#f4f6fa]/80">
                            <tr>
                                <th className="p-4 pl-6 text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/4">Subject Code</th>
                                <th className="p-4 text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/6">Level</th>
                                <th className="p-4 text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/6">Target Batch</th>
                                <th className="p-4 text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/3">Assigned Faculty (Auto-Saves)</th>
                                <th className="p-4 text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-1/12 text-center">Flush</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allocations.map(alloc => (
                                <tr key={alloc.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50/80 group">
                                    <td className="p-4 pl-6">
                                        <p className="font-bold text-[#1a1b4b] text-sm tabular-nums">{alloc.subject?.code}</p>
                                        <p className="text-[12px] text-gray-400 uppercase tracking-widest truncate max-w-[200px]" title={alloc.subject?.name}>{alloc.subject?.name}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2.5 py-1 bg-blue-50/50 text-blue-600 text-[12px] font-black uppercase tracking-widest rounded shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)]">
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
                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {allocations.length === 0 && (
                                <tr><td colSpan="5" className="p-12 text-center">
                                    <p className="text-gray-400 uppercase tracking-widest text-xs font-bold leading-relaxed">No subject mappings have been actively deployed.<br />Use the Matrix Wizard to execute bindings.</p>
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
