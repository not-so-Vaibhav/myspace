import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    fetchFacultyAllocations,
    fetchEvaluationSheet,
    saveBatchEvaluations,
    lockEvaluationSheet,
    exportToExcel,
    exportToCsv,
    parseExcelFile,
    DEFAULT_MAX_MARKS
} from '../../services/evaluationService';
import {
    FileSpreadsheet,
    Download,
    Upload,
    Save,
    Lock,
    Unlock,
    Search,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Sparkles,
    Filter,
    Users,
    Percent,
    Award,
    BookOpen,
    HelpCircle,
    ArrowUpDown,
    Check,
    X,
    FileText,
    TrendingUp,
    ChevronDown,
    SlidersHorizontal,
    Layers
} from 'lucide-react';

const FacultyEvaluation = () => {
    const { profile } = useAuth();
    const facultyId = profile?.id;

    // Allocations & Selection State
    const [allocations, setAllocations] = useState([]);
    const [selectedAllocId, setSelectedAllocId] = useState('');
    const [loadingAllocations, setLoadingAllocations] = useState(true);

    // Sheet State
    const [sheetData, setSheetData] = useState(null);
    const [students, setStudents] = useState([]);
    const [loadingSheet, setLoadingSheet] = useState(false);
    const [maxMarksConfig, setMaxMarksConfig] = useState(DEFAULT_MAX_MARKS);

    // UI & Action States
    const [searchQuery, setSearchQuery] = useState('');
    const [dirtyRows, setDirtyRows] = useState(new Set()); // Set of student_id modified
    const [isSaving, setIsSaving] = useState(false);
    const [isLocking, setIsLocking] = useState(false);
    const [notification, setNotification] = useState(null); // { type: 'success'|'error'|'info', message: '' }

    // Modal States
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState(null);
    const [importLoading, setImportLoading] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const fileInputRef = useRef(null);

    // Initial Load: Allocations
    useEffect(() => {
        if (!facultyId) return;
        loadAllocations();
    }, [facultyId]);

    const loadAllocations = async () => {
        setLoadingAllocations(true);
        try {
            const data = await fetchFacultyAllocations(facultyId);
            setAllocations(data || []);
            if (data && data.length > 0) {
                setSelectedAllocId(data[0].id);
            }
        } catch (err) {
            console.error('Failed to load allocations:', err);
            showNotify('error', 'Failed to load assigned subject allocations');
        } finally {
            setLoadingAllocations(false);
        }
    };

    // Load Sheet whenever selected allocation changes
    useEffect(() => {
        if (!selectedAllocId) return;
        loadSheet(selectedAllocId);
    }, [selectedAllocId]);

    const loadSheet = async (allocId) => {
        setLoadingSheet(true);
        setDirtyRows(new Set());
        try {
            const data = await fetchEvaluationSheet(allocId);
            setSheetData(data.allocation);
            setMaxMarksConfig(data.max_marks_config || DEFAULT_MAX_MARKS);
            setStudents(data.students || []);
        } catch (err) {
            console.error('Failed to load evaluation sheet:', err);
            showNotify('error', 'Failed to load student evaluation records');
        } finally {
            setLoadingSheet(false);
        }
    };

    const showNotify = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    // Current subject details
    const isPractical = sheetData?.is_practical || false;
    const subLabel = isPractical ? 'PAB' : 'TA';
    const examLabel = isPractical ? 'Practical Exam' : 'Theory Exam';
    const isLocked = sheetData?.is_locked || false;

    // ── INLINE CELL EDITING & RECALCULATION ──────────────────────────────────
    const handleCellChange = (studentId, field, rawValue) => {
        if (isLocked) return;

        let numVal = rawValue === '' ? 0 : parseFloat(rawValue);
        if (isNaN(numVal)) numVal = 0;

        // Apply max clamp
        if (field === 'ca_attendance_marks') numVal = Math.min(Math.max(0, numVal), maxMarksConfig.ca_attendance || 5);
        if (field === 'ca_sub_1') numVal = Math.min(Math.max(0, numVal), maxMarksConfig.ca_sub_1 || 10);
        if (field === 'ca_sub_2') numVal = Math.min(Math.max(0, numVal), maxMarksConfig.ca_sub_2 || 10);
        if (field === 'ca_sub_3') numVal = Math.min(Math.max(0, numVal), maxMarksConfig.ca_sub_3 || 15);
        if (field === 'exam_marks') numVal = Math.min(Math.max(0, numVal), maxMarksConfig.exam || 60);

        setStudents(prev => prev.map(st => {
            if (st.student_id !== studentId) return st;

            const updated = { ...st, [field]: numVal };
            const caTotal = Number(updated.ca_attendance_marks || 0) +
                            Number(updated.ca_sub_1 || 0) +
                            Number(updated.ca_sub_2 || 0) +
                            Number(updated.ca_sub_3 || 0);
            const grandTotal = caTotal + Number(updated.exam_marks || 0);

            // Grade logic
            let grade = 'F';
            let isPass = false;
            if (grandTotal >= 90) { grade = 'O'; isPass = true; }
            else if (grandTotal >= 80) { grade = 'A+'; isPass = true; }
            else if (grandTotal >= 70) { grade = 'A'; isPass = true; }
            else if (grandTotal >= 60) { grade = 'B+'; isPass = true; }
            else if (grandTotal >= 50) { grade = 'B'; isPass = true; }
            else if (grandTotal >= 40) { grade = 'C'; isPass = true; }

            updated.ca_total = caTotal;
            updated.total_marks = grandTotal;
            updated.grade = grade;
            updated.is_pass = isPass;

            return updated;
        }));

        setDirtyRows(prev => new Set(prev).add(studentId));
    };

    // ── AUTO-CALCULATE ATTENDANCE MARKS ──────────────────────────────────────
    const handleAutoCalculateAttendance = () => {
        if (isLocked) return;
        setStudents(prev => prev.map(st => {
            const attPct = st.attendance_pct || 0;
            // Scale: >=90% -> 5, >=80% -> 4, >=75% -> 3, >=65% -> 2, <65% -> 0
            const maxAtt = maxMarksConfig.ca_attendance || 5;
            let autoMarks = 0;
            if (attPct >= 90) autoMarks = maxAtt;
            else if (attPct >= 80) autoMarks = Math.round(maxAtt * 0.8);
            else if (attPct >= 75) autoMarks = Math.round(maxAtt * 0.6);
            else if (attPct >= 65) autoMarks = Math.round(maxAtt * 0.4);

            const caTotal = autoMarks + Number(st.ca_sub_1 || 0) + Number(st.ca_sub_2 || 0) + Number(st.ca_sub_3 || 0);
            const grandTotal = caTotal + Number(st.exam_marks || 0);
            const isPass = grandTotal >= 40;

            let grade = 'F';
            if (grandTotal >= 90) grade = 'O';
            else if (grandTotal >= 80) grade = 'A+';
            else if (grandTotal >= 70) grade = 'A';
            else if (grandTotal >= 60) grade = 'B+';
            else if (grandTotal >= 50) grade = 'B';
            else if (grandTotal >= 40) grade = 'C';

            return {
                ...st,
                ca_attendance_marks: autoMarks,
                ca_total: caTotal,
                total_marks: grandTotal,
                grade,
                is_pass: isPass
            };
        }));

        // Mark all as dirty
        const allIds = new Set(students.map(s => s.student_id));
        setDirtyRows(allIds);
        showNotify('info', 'Auto-calculated attendance marks from real attendance percentages.');
    };

    // ── FILL CONSTANT VALUE ──────────────────────────────────────────────────
    const handleFillColumn = (field, value) => {
        if (isLocked) return;
        const val = parseFloat(value) || 0;
        setStudents(prev => prev.map(st => {
            const updated = { ...st, [field]: val };
            const caTotal = Number(updated.ca_attendance_marks || 0) +
                            Number(updated.ca_sub_1 || 0) +
                            Number(updated.ca_sub_2 || 0) +
                            Number(updated.ca_sub_3 || 0);
            const grandTotal = caTotal + Number(updated.exam_marks || 0);

            let grade = 'F';
            let isPass = false;
            if (grandTotal >= 90) { grade = 'O'; isPass = true; }
            else if (grandTotal >= 80) { grade = 'A+'; isPass = true; }
            else if (grandTotal >= 70) { grade = 'A'; isPass = true; }
            else if (grandTotal >= 60) { grade = 'B+'; isPass = true; }
            else if (grandTotal >= 50) { grade = 'B'; isPass = true; }
            else if (grandTotal >= 40) { grade = 'C'; isPass = true; }

            return {
                ...updated,
                ca_total: caTotal,
                total_marks: grandTotal,
                grade,
                is_pass: isPass
            };
        }));
        setDirtyRows(new Set(students.map(s => s.student_id)));
        showNotify('info', `Filled column ${field} with ${val}`);
    };

    // ── SAVE BATCH EVALUATION ────────────────────────────────────────────────
    const handleSaveBatch = async () => {
        if (!selectedAllocId) return;
        setIsSaving(true);
        try {
            await saveBatchEvaluations(selectedAllocId, students, facultyId, maxMarksConfig);
            setDirtyRows(new Set());
            showNotify('success', 'Evaluation marks saved successfully!');
            // Refresh allocations overview
            loadAllocations();
        } catch (err) {
            console.error('Failed to save evaluations:', err);
            showNotify('error', `Save failed: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // ── LOCK / UNLOCK EVALUATION SHEET ───────────────────────────────────────
    const handleToggleLock = async () => {
        if (!selectedAllocId) return;
        const newLockState = !isLocked;
        if (newLockState) {
            const confirmLock = window.confirm(
                'Are you sure you want to LOCK and Finalize this evaluation sheet? Once locked, marks cannot be edited without administrative permission.'
            );
            if (!confirmLock) return;
        }

        setIsLocking(true);
        try {
            // First save any pending changes if locking
            if (dirtyRows.size > 0 && newLockState) {
                await saveBatchEvaluations(selectedAllocId, students, facultyId, maxMarksConfig);
                setDirtyRows(new Set());
            }

            await lockEvaluationSheet(selectedAllocId, facultyId, newLockState);
            setSheetData(prev => ({ ...prev, is_locked: newLockState }));
            showNotify('success', newLockState ? 'Evaluation sheet locked & finalized.' : 'Evaluation sheet unlocked for editing.');
            loadAllocations();
        } catch (err) {
            console.error('Failed to update lock status:', err);
            showNotify('error', `Lock action failed: ${err.message}`);
        } finally {
            setIsLocking(false);
        }
    };

    // ── EXCEL / CSV EXPORT ───────────────────────────────────────────────────
    const handleExportExcel = () => {
        if (!sheetData || students.length === 0) return;
        exportToExcel(sheetData, students, maxMarksConfig);
        showNotify('success', 'Downloaded Excel spreadsheet (.xlsx)');
    };

    const handleExportCsv = () => {
        if (!sheetData || students.length === 0) return;
        exportToCsv(sheetData, students, maxMarksConfig);
        showNotify('success', 'Downloaded CSV file');
    };

    // ── EXCEL / CSV IMPORT MODAL & PARSER ────────────────────────────────────
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportFile(file);
        setImportLoading(true);

        try {
            const parsedRows = await parseExcelFile(file);
            if (!parsedRows || parsedRows.length === 0) {
                throw new Error('No data found in the uploaded file');
            }

            // Match parsed rows to existing students by Enrollment Number or Name
            const studentMap = {};
            students.forEach(st => {
                if (st.enrollment_no) studentMap[st.enrollment_no.toLowerCase().trim()] = st;
                if (st.student_name) studentMap[st.student_name.toLowerCase().trim()] = st;
                if (st.student_id) studentMap[st.student_id] = st;
            });

            const matchedList = [];
            let matchedCount = 0;
            let unmatchedCount = 0;

            parsedRows.forEach((row, idx) => {
                // Find keys case-insensitively
                const getVal = (patterns) => {
                    for (const key of Object.keys(row)) {
                        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                        for (const pat of patterns) {
                            if (cleanKey.includes(pat.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
                                return row[key];
                            }
                        }
                    }
                    return null;
                };

                const rollNo = getVal(['enrollment', 'roll', 'regno', 'prn']) || '';
                const name = getVal(['name', 'studentname']) || '';

                const matchedStudent = (rollNo && studentMap[String(rollNo).toLowerCase().trim()]) ||
                                       (name && studentMap[String(name).toLowerCase().trim()]) ||
                                       null;

                const caAtt = parseFloat(getVal(['caattendance', 'attendance', 'attmarks'])) || 0;
                const ca1 = parseFloat(getVal(['ta1', 'pab1', 'sub1', 'ta-1', 'pab-1'])) || 0;
                const ca2 = parseFloat(getVal(['ta2', 'pab2', 'sub2', 'ta-2', 'pab-2'])) || 0;
                const ca3 = parseFloat(getVal(['ta3', 'pab3', 'sub3', 'ta-3', 'pab-3'])) || 0;
                const exam = parseFloat(getVal(['exam', 'theory', 'practical', 'endsem', 'extern'])) || 0;

                if (matchedStudent) {
                    matchedCount++;
                    matchedList.push({
                        student_id: matchedStudent.student_id,
                        student_name: matchedStudent.student_name,
                        enrollment_no: matchedStudent.enrollment_no,
                        old_marks: {
                            ca_att: matchedStudent.ca_attendance_marks,
                            ca_1: matchedStudent.ca_sub_1,
                            ca_2: matchedStudent.ca_sub_2,
                            ca_3: matchedStudent.ca_sub_3,
                            exam: matchedStudent.exam_marks
                        },
                        new_marks: {
                            ca_att: caAtt,
                            ca_1: ca1,
                            ca_2: ca2,
                            ca_3: ca3,
                            exam: exam
                        },
                        matched: true
                    });
                } else {
                    unmatchedCount++;
                    matchedList.push({
                        student_id: null,
                        student_name: name || `Row ${idx + 1}`,
                        enrollment_no: rollNo || 'N/A',
                        new_marks: { ca_att: caAtt, ca_1: ca1, ca_2: ca2, ca_3: ca3, exam: exam },
                        matched: false
                    });
                }
            });

            setImportPreview({
                totalRows: parsedRows.length,
                matchedCount,
                unmatchedCount,
                rows: matchedList
            });

        } catch (err) {
            console.error('Import parse error:', err);
            showNotify('error', `Import error: ${err.message}`);
        } finally {
            setImportLoading(false);
        }
    };

    const handleApplyImport = () => {
        if (!importPreview || !importPreview.rows) return;

        const importedMap = {};
        importPreview.rows.forEach(r => {
            if (r.matched && r.student_id) {
                importedMap[r.student_id] = r.new_marks;
            }
        });

        const newDirty = new Set(dirtyRows);

        setStudents(prev => prev.map(st => {
            const imp = importedMap[st.student_id];
            if (!imp) return st;

            newDirty.add(st.student_id);

            const caTotal = Number(imp.ca_att || 0) + Number(imp.ca_1 || 0) + Number(imp.ca_2 || 0) + Number(imp.ca_3 || 0);
            const grandTotal = caTotal + Number(imp.exam || 0);

            let grade = 'F';
            let isPass = false;
            if (grandTotal >= 90) { grade = 'O'; isPass = true; }
            else if (grandTotal >= 80) { grade = 'A+'; isPass = true; }
            else if (grandTotal >= 70) { grade = 'A'; isPass = true; }
            else if (grandTotal >= 60) { grade = 'B+'; isPass = true; }
            else if (grandTotal >= 50) { grade = 'B'; isPass = true; }
            else if (grandTotal >= 40) { grade = 'C'; isPass = true; }

            return {
                ...st,
                ca_attendance_marks: imp.ca_att || 0,
                ca_sub_1: imp.ca_1 || 0,
                ca_sub_2: imp.ca_2 || 0,
                ca_sub_3: imp.ca_3 || 0,
                ca_total: caTotal,
                exam_marks: imp.exam || 0,
                total_marks: grandTotal,
                grade,
                is_pass: isPass
            };
        }));

        setDirtyRows(newDirty);
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview(null);
        showNotify('success', `Imported marks applied for ${importPreview.matchedCount} students. Review and click "Save Evaluation".`);
    };

    // ── FILTERED STUDENTS ────────────────────────────────────────────────────
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;
        const q = searchQuery.toLowerCase().trim();
        return students.filter(s =>
            (s.student_name || '').toLowerCase().includes(q) ||
            (s.enrollment_no || '').toLowerCase().includes(q) ||
            (s.batch_name || '').toLowerCase().includes(q)
        );
    }, [students, searchQuery]);

    // ── SUMMARY STATS ────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total = students.length;
        if (total === 0) return { total: 0, graded: 0, avgAttendance: 0, avgCa: 0, passRate: 0 };

        const graded = students.filter(s => (s.total_marks || 0) > 0).length;
        const totalAttendance = students.reduce((acc, s) => acc + (s.attendance_pct || 0), 0);
        const totalCa = students.reduce((acc, s) => acc + (s.ca_total || 0), 0);
        const passed = students.filter(s => s.is_pass).length;

        return {
            total,
            graded,
            avgAttendance: (totalAttendance / total).toFixed(1),
            avgCa: (totalCa / total).toFixed(1),
            passRate: ((passed / total) * 100).toFixed(0)
        };
    }, [students]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Top Notification Banner */}
            {notification && (
                <div className={`p-4 rounded-2xl flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-4 ${
                    notification.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-500/20' :
                    notification.type === 'error' ? 'bg-rose-600 text-white shadow-rose-500/20' :
                    'bg-[#1a1b4b] text-white shadow-indigo-900/20'
                }`}>
                    <div className="flex items-center gap-3 font-semibold text-sm">
                        {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" /> :
                         notification.type === 'error' ? <AlertTriangle className="w-5 h-5 text-rose-200 shrink-0" /> :
                         <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />}
                        <span>{notification.message}</span>
                    </div>
                    <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/20 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header Title Banner */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-indigo-50/80 via-transparent to-transparent rounded-full pointer-events-none -mr-20 -mt-20" />
                
                <div className="space-y-2 z-10">
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest">
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Continuous Assessment & Marks Evaluation Engine</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Subject Marks Evaluation
                    </h1>
                    <p className="text-sm font-medium text-slate-500 max-w-2xl">
                        Record CA subunits (<span className="font-bold text-slate-700">Attendance, {subLabel}-1, {subLabel}-2, {subLabel}-3</span>) and{' '}
                        <span className="font-bold text-slate-700">{examLabel}</span> in an interactive Excel spreadsheet with live attendance sync.
                    </p>
                </div>

                {/* Allocation Selector */}
                <div className="z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative min-w-[280px]">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Assigned Subject
                        </label>
                        <select
                            value={selectedAllocId}
                            onChange={(e) => setSelectedAllocId(e.target.value)}
                            disabled={loadingAllocations || allocations.length === 0}
                            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-800 font-bold text-sm rounded-2xl px-4 py-3 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none appearance-none cursor-pointer pr-10"
                        >
                            {allocations.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.subject_code} - {a.subject_name} ({a.subject_type}) • {a.batch_name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 bottom-3.5 pointer-events-none" />
                    </div>

                    <button
                        onClick={() => loadSheet(selectedAllocId)}
                        title="Reload Data"
                        className="self-end sm:self-auto p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all"
                    >
                        <RefreshCw className={`w-5 h-5 ${loadingSheet ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Enrolled</p>
                        <p className="text-xl font-black text-slate-900">{stats.total} <span className="text-xs font-semibold text-slate-400">students</span></p>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Graded</p>
                        <p className="text-xl font-black text-slate-900">{stats.graded} <span className="text-xs font-semibold text-slate-400">/ {stats.total}</span></p>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 shrink-0">
                        <Percent className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Attendance</p>
                        <p className="text-xl font-black text-slate-900">{stats.avgAttendance}%</p>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg CA Score</p>
                        <p className="text-xl font-black text-slate-900">{stats.avgCa} <span className="text-xs font-semibold text-slate-400">/ {maxMarksConfig.ca_total || 40}</span></p>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 col-span-2 sm:col-span-1">
                    <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pass Rate</p>
                        <p className="text-xl font-black text-slate-900">{stats.passRate}%</p>
                    </div>
                </div>
            </div>

            {/* Main Interactive Spreadsheet Container */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                {/* Spreadsheet Toolbar */}
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Search & Filter */}
                    <div className="flex items-center gap-3 flex-1 max-w-md">
                        <div className="relative w-full">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            <input
                                type="text"
                                placeholder="Search by student name or roll number..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white text-slate-800 text-sm font-medium rounded-2xl pl-10 pr-4 py-2.5 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Subject Badge */}
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border shrink-0 ${
                            isPractical
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                            {sheetData?.subject_type || 'Theory'}
                        </div>
                    </div>

                    {/* Right: Actions Bar */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* 1-Click Auto Calculate Attendance */}
                        <button
                            onClick={handleAutoCalculateAttendance}
                            disabled={isLocked || students.length === 0}
                            title="Auto-calculate CA attendance marks based on real attendance percentage"
                            className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200/60 transition-all disabled:opacity-50"
                        >
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            <span>Auto-Fill Attendance CA</span>
                        </button>

                        {/* Import Excel / CSV */}
                        <button
                            onClick={() => setShowImportModal(true)}
                            disabled={isLocked}
                            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm transition-all disabled:opacity-50"
                        >
                            <Upload className="w-4 h-4 text-slate-500" />
                            <span>Import</span>
                        </button>

                        {/* Export Excel (.xlsx) */}
                        <button
                            onClick={handleExportExcel}
                            disabled={students.length === 0}
                            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200/80 transition-all"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <span>Export Excel</span>
                        </button>

                        {/* Export CSV */}
                        <button
                            onClick={handleExportCsv}
                            disabled={students.length === 0}
                            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm transition-all"
                        >
                            <Download className="w-4 h-4 text-slate-500" />
                            <span>CSV</span>
                        </button>

                        {/* Lock / Unlock */}
                        <button
                            onClick={handleToggleLock}
                            disabled={isLocking || students.length === 0}
                            className={`flex items-center gap-2 px-3.5 py-2.5 font-bold text-xs rounded-xl border transition-all ${
                                isLocked
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                            }`}
                        >
                            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            <span>{isLocked ? 'Locked' : 'Lock Sheet'}</span>
                        </button>

                        {/* Save Batch */}
                        <button
                            onClick={handleSaveBatch}
                            disabled={isSaving || isLocked || dirtyRows.size === 0}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                            <span>{isSaving ? 'Saving...' : dirtyRows.size > 0 ? `Save (${dirtyRows.size} Pending)` : 'Saved'}</span>
                        </button>
                    </div>
                </div>

                {/* Spreadsheet Table Container */}
                <div className="overflow-x-auto max-h-[680px]">
                    {loadingSheet ? (
                        <div className="p-16 flex flex-col items-center justify-center gap-4 text-slate-400">
                            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                            <p className="font-bold text-sm tracking-wide">Loading evaluation spreadsheet...</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 space-y-3">
                            <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300" />
                            <p className="font-bold text-base text-slate-600">No student records found</p>
                            <p className="text-xs text-slate-400">Ensure students are enrolled in this subject allocation.</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse text-left text-xs min-w-[1200px]">
                            {/* Grouped Header */}
                            <thead>
                                <tr className="bg-slate-100/80 text-[11px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 select-none">
                                    <th colSpan="4" className="py-2.5 px-4 border-r border-slate-200">
                                        Student Information
                                    </th>
                                    <th colSpan="1" className="py-2.5 px-4 text-center border-r border-slate-200 bg-cyan-50/50 text-cyan-800">
                                        Live Attendance System
                                    </th>
                                    <th colSpan="5" className="py-2.5 px-4 text-center border-r border-slate-200 bg-indigo-50/50 text-indigo-900">
                                        Continuous Assessment (CA / Internal)
                                    </th>
                                    <th colSpan="1" className="py-2.5 px-4 text-center border-r border-slate-200 bg-purple-50/50 text-purple-900">
                                        End-Sem Examination
                                    </th>
                                    <th colSpan="3" className="py-2.5 px-4 text-center bg-slate-100">
                                        Evaluation Result
                                    </th>
                                </tr>
                                <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 select-none">
                                    {/* Student Identity */}
                                    <th className="py-3 px-3 w-12 text-center text-slate-400">#</th>
                                    <th className="py-3 px-4 min-w-[200px]">Student Name</th>
                                    <th className="py-3 px-3 min-w-[130px]">Enrollment No</th>
                                    <th className="py-3 px-3 min-w-[90px] border-r border-slate-200">Batch</th>

                                    {/* Real Attendance % */}
                                    <th className="py-3 px-3 min-w-[140px] text-center border-r border-slate-200 bg-cyan-50/20">
                                        Attendance %
                                    </th>

                                    {/* CA Subunits */}
                                    <th className="py-3 px-2 min-w-[110px] text-center bg-indigo-50/10">
                                        Attendance <br />
                                        <span className="text-[10px] font-semibold text-slate-400">(Max {maxMarksConfig.ca_attendance || 5})</span>
                                    </th>
                                    <th className="py-3 px-2 min-w-[95px] text-center bg-indigo-50/10">
                                        {subLabel}-1 <br />
                                        <span className="text-[10px] font-semibold text-slate-400">(Max {maxMarksConfig.ca_sub_1 || 10})</span>
                                    </th>
                                    <th className="py-3 px-2 min-w-[95px] text-center bg-indigo-50/10">
                                        {subLabel}-2 <br />
                                        <span className="text-[10px] font-semibold text-slate-400">(Max {maxMarksConfig.ca_sub_2 || 10})</span>
                                    </th>
                                    <th className="py-3 px-2 min-w-[95px] text-center bg-indigo-50/10">
                                        {subLabel}-3 <br />
                                        <span className="text-[10px] font-semibold text-slate-400">(Max {maxMarksConfig.ca_sub_3 || 15})</span>
                                    </th>
                                    <th className="py-3 px-2 min-w-[100px] text-center border-r border-slate-200 bg-indigo-100/30 text-indigo-900 font-extrabold">
                                        CA Total <br />
                                        <span className="text-[10px] font-semibold text-indigo-500">(Max {maxMarksConfig.ca_total || 40})</span>
                                    </th>

                                    {/* Exam Marks */}
                                    <th className="py-3 px-3 min-w-[130px] text-center border-r border-slate-200 bg-purple-50/20 text-purple-900">
                                        {examLabel} <br />
                                        <span className="text-[10px] font-semibold text-purple-500">(Max {maxMarksConfig.exam || 60})</span>
                                    </th>

                                    {/* Totals & Grades */}
                                    <th className="py-3 px-3 min-w-[100px] text-center font-extrabold text-slate-800">
                                        Total (100)
                                    </th>
                                    <th className="py-3 px-3 min-w-[70px] text-center">Grade</th>
                                    <th className="py-3 px-3 min-w-[80px] text-center">Status</th>
                                </tr>
                            </thead>

                            {/* Spreadsheet Rows */}
                            <tbody className="divide-y divide-slate-100">
                                {filteredStudents.map((st, idx) => {
                                    const isDirty = dirtyRows.has(st.student_id);
                                    const attPct = st.attendance_pct || 0;

                                    return (
                                        <tr
                                            key={st.student_id}
                                            className={`hover:bg-slate-50/80 transition-colors ${
                                                isDirty ? 'bg-amber-50/30' : ''
                                            }`}
                                        >
                                            {/* # */}
                                            <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                                                {st.row_index || idx + 1}
                                            </td>

                                            {/* Student Name */}
                                            <td className="py-3 px-4 font-bold text-slate-800">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-600 text-[11px] shrink-0">
                                                        {(st.student_name || 'S').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="truncate max-w-[180px]">{st.student_name}</p>
                                                        <p className="text-[10px] font-normal text-slate-400">{st.department || 'B.Tech'}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Enrollment No */}
                                            <td className="py-3 px-3 font-mono font-bold text-slate-600 text-[11px]">
                                                {st.enrollment_no}
                                            </td>

                                            {/* Batch */}
                                            <td className="py-3 px-3 font-semibold text-slate-500 border-r border-slate-200">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                                                    {st.year_level} - {st.batch_name}
                                                </span>
                                            </td>

                                            {/* Live Attendance % */}
                                            <td className="py-3 px-3 text-center border-r border-slate-200 bg-cyan-50/10">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-tight"
                                                    style={{
                                                        backgroundColor: attPct >= 75 ? '#ecfdf5' : attPct >= 60 ? '#fffbeb' : '#fef2f2',
                                                        color: attPct >= 75 ? '#059669' : attPct >= 60 ? '#d97706' : '#dc2626',
                                                        border: `1px solid ${attPct >= 75 ? '#a7f3d0' : attPct >= 60 ? '#fde68a' : '#fecaca'}`
                                                    }}
                                                >
                                                    <span>{attPct}%</span>
                                                    <span className="text-[9px] font-normal opacity-75">({st.attended_sessions}/{st.total_sessions})</span>
                                                </div>
                                            </td>

                                            {/* CA: Attendance Marks (Input) */}
                                            <td className="py-2 px-1 text-center bg-indigo-50/5">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxMarksConfig.ca_attendance || 5}
                                                    step="0.5"
                                                    disabled={isLocked}
                                                    value={st.ca_attendance_marks === 0 ? '' : st.ca_attendance_marks}
                                                    placeholder="0"
                                                    onChange={(e) => handleCellChange(st.student_id, 'ca_attendance_marks', e.target.value)}
                                                    className="w-16 text-center font-bold text-slate-800 bg-white border border-slate-200 rounded-xl py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs transition-all disabled:bg-slate-50 disabled:text-slate-400"
                                                />
                                            </td>

                                            {/* CA: TA-1 / PAB-1 (Input) */}
                                            <td className="py-2 px-1 text-center bg-indigo-50/5">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxMarksConfig.ca_sub_1 || 10}
                                                    step="0.5"
                                                    disabled={isLocked}
                                                    value={st.ca_sub_1 === 0 ? '' : st.ca_sub_1}
                                                    placeholder="0"
                                                    onChange={(e) => handleCellChange(st.student_id, 'ca_sub_1', e.target.value)}
                                                    className="w-16 text-center font-bold text-slate-800 bg-white border border-slate-200 rounded-xl py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs transition-all disabled:bg-slate-50 disabled:text-slate-400"
                                                />
                                            </td>

                                            {/* CA: TA-2 / PAB-2 (Input) */}
                                            <td className="py-2 px-1 text-center bg-indigo-50/5">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxMarksConfig.ca_sub_2 || 10}
                                                    step="0.5"
                                                    disabled={isLocked}
                                                    value={st.ca_sub_2 === 0 ? '' : st.ca_sub_2}
                                                    placeholder="0"
                                                    onChange={(e) => handleCellChange(st.student_id, 'ca_sub_2', e.target.value)}
                                                    className="w-16 text-center font-bold text-slate-800 bg-white border border-slate-200 rounded-xl py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs transition-all disabled:bg-slate-50 disabled:text-slate-400"
                                                />
                                            </td>

                                            {/* CA: TA-3 / PAB-3 (Input) */}
                                            <td className="py-2 px-1 text-center bg-indigo-50/5">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxMarksConfig.ca_sub_3 || 15}
                                                    step="0.5"
                                                    disabled={isLocked}
                                                    value={st.ca_sub_3 === 0 ? '' : st.ca_sub_3}
                                                    placeholder="0"
                                                    onChange={(e) => handleCellChange(st.student_id, 'ca_sub_3', e.target.value)}
                                                    className="w-16 text-center font-bold text-slate-800 bg-white border border-slate-200 rounded-xl py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs transition-all disabled:bg-slate-50 disabled:text-slate-400"
                                                />
                                            </td>

                                            {/* CA Total (Auto) */}
                                            <td className="py-3 px-2 text-center font-black text-indigo-700 bg-indigo-50/30 border-r border-slate-200 font-mono text-xs">
                                                {st.ca_total || 0}
                                            </td>

                                            {/* Exam Marks (Input) */}
                                            <td className="py-2 px-2 text-center border-r border-slate-200 bg-purple-50/10">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxMarksConfig.exam || 60}
                                                    step="0.5"
                                                    disabled={isLocked}
                                                    value={st.exam_marks === 0 ? '' : st.exam_marks}
                                                    placeholder="0"
                                                    onChange={(e) => handleCellChange(st.student_id, 'exam_marks', e.target.value)}
                                                    className="w-20 text-center font-black text-purple-900 bg-white border border-purple-200 rounded-xl py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-xs transition-all disabled:bg-slate-50 disabled:text-slate-400"
                                                />
                                            </td>

                                            {/* Grand Total (Auto) */}
                                            <td className="py-3 px-3 text-center font-black text-slate-900 font-mono text-sm">
                                                {st.total_marks || 0}
                                            </td>

                                            {/* Grade */}
                                            <td className="py-3 px-3 text-center">
                                                <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs ${
                                                    st.grade === 'O' || st.grade === 'A+' ? 'bg-emerald-100 text-emerald-800' :
                                                    st.grade === 'A' || st.grade === 'B+' ? 'bg-indigo-100 text-indigo-800' :
                                                    st.grade === 'B' || st.grade === 'C' ? 'bg-amber-100 text-amber-800' :
                                                    'bg-rose-100 text-rose-800'
                                                }`}>
                                                    {st.grade || 'F'}
                                                </span>
                                            </td>

                                            {/* Pass/Fail Status */}
                                            <td className="py-3 px-3 text-center">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                    st.is_pass ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                                                }`}>
                                                    {st.is_pass ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                    {st.is_pass ? 'Pass' : 'Fail'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Spreadsheet Footer Status Bar */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
                    <div className="flex items-center gap-4">
                        <span>Showing <strong className="text-slate-800">{filteredStudents.length}</strong> of <strong className="text-slate-800">{students.length}</strong> students</span>
                        {dirtyRows.size > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                <AlertTriangle className="w-3.5 h-3.5" /> {dirtyRows.size} unsaved changes
                            </span>
                        )}
                        {isLocked && (
                            <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                <Lock className="w-3.5 h-3.5" /> Sheet is Locked
                            </span>
                        )}
                    </div>

                    <div className="text-[11px] text-slate-400 font-medium">
                        Keyboard shortcuts: <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono">Tab</kbd> to next cell • <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono">Enter</kbd> to next row
                    </div>
                </div>
            </div>

            {/* ── IMPORT MODAL ──────────────────────────────────────────────── */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Import Marks from Excel / CSV</h3>
                                    <p className="text-xs font-semibold text-slate-400">Match students by Enrollment Number or Name</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview(null); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5 overflow-y-auto flex-1">
                            {!importPreview ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 text-center cursor-pointer hover:bg-slate-50/80 transition-all space-y-3"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                                        <FileSpreadsheet className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-800 text-sm">Click or Drag & Drop Excel / CSV file</p>
                                        <p className="text-xs text-slate-400 mt-1">Supports standard .xlsx, .xls, and .csv files exported from ERP or custom sheets.</p>
                                    </div>
                                    {importLoading && (
                                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 pt-2">
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Parsing spreadsheet...</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Match Summary */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Rows</p>
                                            <p className="text-lg font-black text-slate-800">{importPreview.totalRows}</p>
                                        </div>
                                        <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200/60">
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase">Matched Students</p>
                                            <p className="text-lg font-black text-emerald-800">{importPreview.matchedCount}</p>
                                        </div>
                                        <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200/60">
                                            <p className="text-[10px] font-bold text-rose-600 uppercase">Unmatched</p>
                                            <p className="text-lg font-black text-rose-800">{importPreview.unmatchedCount}</p>
                                        </div>
                                    </div>

                                    {/* Preview Table */}
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase sticky top-0">
                                                <tr>
                                                    <th className="py-2 px-3">Status</th>
                                                    <th className="py-2 px-3">Student Name</th>
                                                    <th className="py-2 px-3">Roll No</th>
                                                    <th className="py-2 px-2 text-center">CA Att</th>
                                                    <th className="py-2 px-2 text-center">{subLabel}-1</th>
                                                    <th className="py-2 px-2 text-center">{subLabel}-2</th>
                                                    <th className="py-2 px-2 text-center">{subLabel}-3</th>
                                                    <th className="py-2 px-2 text-center">Exam</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {importPreview.rows.map((r, idx) => (
                                                    <tr key={idx} className={r.matched ? 'bg-white' : 'bg-rose-50/30'}>
                                                        <td className="py-2 px-3">
                                                            {r.matched ? (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                                    <Check className="w-3 h-3" /> Matched
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500">
                                                                    <X className="w-3 h-3" /> Not Found
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3 font-semibold text-slate-800">{r.student_name}</td>
                                                        <td className="py-2 px-3 font-mono text-slate-500">{r.enrollment_no}</td>
                                                        <td className="py-2 px-2 text-center font-bold">{r.new_marks.ca_att}</td>
                                                        <td className="py-2 px-2 text-center font-bold">{r.new_marks.ca_1}</td>
                                                        <td className="py-2 px-2 text-center font-bold">{r.new_marks.ca_2}</td>
                                                        <td className="py-2 px-2 text-center font-bold">{r.new_marks.ca_3}</td>
                                                        <td className="py-2 px-2 text-center font-bold">{r.new_marks.exam}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
                            <button
                                onClick={() => { setImportFile(null); setImportPreview(null); }}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                            >
                                {importPreview ? 'Choose Different File' : 'Cancel'}
                            </button>

                            {importPreview && (
                                <button
                                    onClick={handleApplyImport}
                                    disabled={importPreview.matchedCount === 0}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                                >
                                    Apply {importPreview.matchedCount} Matched Records to Grid
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyEvaluation;
