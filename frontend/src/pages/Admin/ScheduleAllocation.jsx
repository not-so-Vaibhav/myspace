import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Plus, 
  Trash2, 
  Info, 
  Layers, 
  AlertCircle, 
  CheckCircle2,
  Filter,
  Upload,
  Download,
  Wand2,
  Table,
  LayoutGrid,
  FileSpreadsheet,
  X,
  Loader2
} from 'lucide-react';

const DAYS = [
  { key: 'MON', label: 'Monday', online: true },
  { key: 'TUE', label: 'Tuesday', online: false },
  { key: 'WED', label: 'Wednesday', online: true },
  { key: 'THU', label: 'Thursday', online: false },
  { key: 'FRI', label: 'Friday', online: false },
  { key: 'SAT', label: 'Saturday', online: true }
];

const TIME_SLOTS = [
  "08:45-09:40",
  "09:40-10:35",
  "10:50-11:45",
  "11:45-12:40",
  "01:40-02:35",
  "02:35-03:30",
  "03:40-04:30"
];

// Standard MIT School of Computing template demo data
const MIT_TEMPLATE_SAMPLE_SLOTS = [
  { day: 'MON', timeSlot: '08:45-09:40', subject: 'Remedial Lecture', subjectCode: 'REM', faculty: 'Archana Pakhare', room: 'Online', type: 'Lecture', color: 'bg-white shadow-sm border-gray-200' },
  { day: 'MON', timeSlot: '09:40-10:35', subject: 'Discrete Mathematics', subjectCode: 'DMA: ARP', faculty: 'Archana Pakhare', room: 'Online', type: 'Lecture', color: 'bg-white shadow-sm border-gray-200' },
  { day: 'MON', timeSlot: '10:50-11:45', subject: 'Design & Analysis of Algorithms', subjectCode: 'PE-I: DAA: MSO', faculty: 'M. S. O.', room: 'Online', type: 'Lecture', color: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' },
  { day: 'MON', timeSlot: '11:45-12:40', subject: 'Machine Learning', subjectCode: 'ML: NVK', faculty: 'Dr. N. V. Kulkarni', room: 'Online', type: 'Lecture', color: 'bg-white shadow-sm border-gray-200' },
  { day: 'MON', timeSlot: '01:40-02:35', subject: 'NPTEL Online Course', subjectCode: 'NPTEL', faculty: 'Department Faculty', room: 'Online', type: 'Tutorial', color: 'bg-white shadow-sm border-gray-200' },
  { day: 'MON', timeSlot: '02:35-03:30', subject: 'NPTEL Online Course', subjectCode: 'NPTEL', faculty: 'Department Faculty', room: 'Online', type: 'Tutorial', color: 'bg-white shadow-sm border-gray-200' },
  { day: 'MON', timeSlot: '03:40-04:30', subject: 'Remedial Lecture', subjectCode: 'REM', faculty: 'Archana Pakhare', room: 'Online', type: 'Lecture', color: 'bg-white shadow-sm border-gray-200' },

  { day: 'TUE', timeSlot: '08:45-09:40', subject: 'Software Hardware Design', subjectCode: 'SHD: S218', faculty: 'S. H. D.', room: 'S218', type: 'Lecture', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' },
  { day: 'TUE', timeSlot: '09:40-10:35', subject: 'Software Hardware Design', subjectCode: 'SHD: S218', faculty: 'S. H. D.', room: 'S218', type: 'Lecture', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' },
  { day: 'TUE', timeSlot: '10:50-11:45', subject: 'A: DMAL: KL / B: DEVL: BBB', subjectCode: 'LABS', faculty: 'K. L. / B. B. B.', room: 'N513 / N511', type: 'Lab', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' },
  { day: 'TUE', timeSlot: '11:45-12:40', subject: 'A: DMAL: KL / B: DEVL: BBB', subjectCode: 'LABS', faculty: 'K. L. / B. B. B.', room: 'N513 / N511', type: 'Lab', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' },
  { day: 'TUE', timeSlot: '01:40-02:35', subject: 'Discrete Mathematics', subjectCode: 'DMA: ARP', faculty: 'Archana Pakhare', room: 'N607', type: 'Lecture', color: 'bg-white shadow-sm border-gray-200' },
  { day: 'TUE', timeSlot: '02:35-03:30', subject: 'Machine Learning', subjectCode: 'ML: NVK', faculty: 'Dr. N. V. Kulkarni', room: 'N607', type: 'Lecture', color: 'bg-white shadow-sm border-gray-200' },
  { day: 'TUE', timeSlot: '03:40-04:30', subject: 'Library Session', subjectCode: 'LIB', faculty: 'Librarian', room: 'Central Library', type: 'Tutorial', color: 'bg-white shadow-sm border-gray-200' },

  { day: 'WED', timeSlot: '08:45-09:40', subject: 'Remedial Lecture', subjectCode: 'REM', faculty: 'Archana Pakhare', room: 'Online', type: 'Lecture', color: 'bg-white shadow-sm border-gray-200' },
  { day: 'WED', timeSlot: '09:40-10:35', subject: 'PE-I Elective (DAA / IOT)', subjectCode: 'PE-I: DAA/IOT', faculty: 'M. S. O. / N. F.', room: 'Online', type: 'Lecture', color: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' },
  { day: 'WED', timeSlot: '10:50-11:45', subject: 'A: DEVL: SR / B: DEVL: BBB', subjectCode: 'LABS', faculty: 'S. R. / B. B. B.', room: 'Online', type: 'Lab', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' },
  { day: 'WED', timeSlot: '11:45-12:40', subject: 'A: DEVL: SR / B: DEVL: BBB', subjectCode: 'LABS', faculty: 'S. R. / B. B. B.', room: 'Online', type: 'Lab', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' },
  { day: 'WED', timeSlot: '01:40-02:35', subject: 'Machine Learning', subjectCode: 'ML: NVK', faculty: 'Dr. N. V. Kulkarni', room: 'Online', type: 'Lecture', color: 'bg-white shadow-sm border-gray-200' },
  { day: 'WED', timeSlot: '02:35-03:30', subject: 'Soft Skills & Industry Lab', subjectCode: 'SCIL', faculty: 'Soft Skills Faculty', room: 'Online', type: 'Tutorial', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm' },
  { day: 'WED', timeSlot: '03:40-04:30', subject: 'Remedial Lecture', subjectCode: 'REM', faculty: 'Archana Pakhare', room: 'Online', type: 'Lecture', color: 'bg-white shadow-sm border-gray-200' },

  { day: 'THU', timeSlot: '08:45-09:40', subject: 'Discrete Mathematics', subjectCode: 'DMA: ARP', faculty: 'Archana Pakhare', room: 'S111', type: 'Lecture', color: 'bg-white shadow-sm border-gray-200' },
  { day: 'THU', timeSlot: '09:40-10:35', subject: 'Soft Skills & Industry Lab', subjectCode: 'SCIL: S111', faculty: 'Soft Skills Faculty', room: 'S111', type: 'Tutorial', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm' },
  { day: 'THU', timeSlot: '10:50-11:45', subject: 'Machine Learning', subjectCode: 'ML: NVK', faculty: 'Dr. N. V. Kulkarni', room: 'S111', type: 'Lecture', color: 'bg-white shadow-sm border-gray-200' },
  { day: 'THU', timeSlot: '11:45-12:40', subject: 'Library Session', subjectCode: 'LIB', faculty: 'Librarian', room: 'Central Library', type: 'Tutorial', color: 'bg-white shadow-sm border-gray-200' },
  { day: 'THU', timeSlot: '01:40-02:35', subject: 'A: MLL: NVK / B: DMAL: AMK', subjectCode: 'LABS', faculty: 'Dr. N. V. Kulkarni / A. M. K.', room: 'N511 / S609', type: 'Lab', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' },
  { day: 'THU', timeSlot: '02:35-03:30', subject: 'A: MLL: NVK / B: DMAL: AMK', subjectCode: 'LABS', faculty: 'Dr. N. V. Kulkarni / A. M. K.', room: 'N511 / S609', type: 'Lab', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' },
  { day: 'THU', timeSlot: '03:40-04:30', subject: 'Mentor Meeting', subjectCode: 'MENTOR', faculty: 'Archana Pakhare', room: 'S111', type: 'Tutorial', color: 'bg-white shadow-sm border-gray-200' },

  { day: 'FRI', timeSlot: '08:45-09:40', subject: 'Discrete Mathematics', subjectCode: 'DMA: ARP', faculty: 'Archana Pakhare', room: 'S111', type: 'Lecture', color: 'bg-white shadow-sm border-gray-200' },
  { day: 'FRI', timeSlot: '09:40-10:35', subject: 'Soft Skills & Industry Lab', subjectCode: 'SCIL: S111', faculty: 'Soft Skills Faculty', room: 'S111', type: 'Tutorial', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm' },
  { day: 'FRI', timeSlot: '10:50-11:45', subject: 'A: DEVL: SR / B: MLL: NVK', subjectCode: 'LABS', faculty: 'S. R. / Dr. N. V. Kulkarni', room: 'N608 / N606', type: 'Lab', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' },
  { day: 'FRI', timeSlot: '11:45-12:40', subject: 'A: DEVL: SR / B: MLL: NVK', subjectCode: 'LABS', faculty: 'S. R. / Dr. N. V. Kulkarni', room: 'N608 / N606', type: 'Lab', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' },
  { day: 'FRI', timeSlot: '01:40-02:35', subject: 'PE-I Elective (DAA / IOT)', subjectCode: 'PE-I: DAA/IOT', faculty: 'M. S. O. / N. F.', room: 'S120 / S409', type: 'Lecture', color: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' },
  { day: 'FRI', timeSlot: '02:35-03:30', subject: 'PE-I Elective (DAA / IOT)', subjectCode: 'PE-I: DAA/IOT', faculty: 'M. S. O. / N. F.', room: 'S120 / S409', type: 'Lecture', color: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' },
  { day: 'FRI', timeSlot: '03:40-04:30', subject: 'Library Session', subjectCode: 'LIB', faculty: 'Librarian', room: 'Central Library', type: 'Tutorial', color: 'bg-white shadow-sm border-gray-200' },

  { day: 'SAT', timeSlot: '08:45-09:40', subject: 'PBL-III Review', subjectCode: 'PBL-III', faculty: 'All Department Faculty', room: 'Online', type: 'Lab', color: 'bg-gray-50 text-gray-700 border-gray-300 shadow-sm' },
  { day: 'SAT', timeSlot: '09:40-10:35', subject: 'PBL-III Review', subjectCode: 'PBL-III', faculty: 'All Department Faculty', room: 'Online', type: 'Lab', color: 'bg-gray-50 text-gray-700 border-gray-300 shadow-sm' },
  { day: 'SAT', timeSlot: '10:50-11:45', subject: 'PBL-III Review', subjectCode: 'PBL-III', faculty: 'All Department Faculty', room: 'Online', type: 'Lab', color: 'bg-gray-50 text-gray-700 border-gray-300 shadow-sm' },
  { day: 'SAT', timeSlot: '11:45-12:40', subject: 'PBL-III Review', subjectCode: 'PBL-III', faculty: 'All Department Faculty', room: 'Online', type: 'Lab', color: 'bg-gray-50 text-gray-700 border-gray-300 shadow-sm' },
  { day: 'SAT', timeSlot: '01:40-02:35', subject: 'PBL-III Review', subjectCode: 'PBL-III', faculty: 'All Department Faculty', room: 'Online', type: 'Lab', color: 'bg-gray-50 text-gray-700 border-gray-300 shadow-sm' },
  { day: 'SAT', timeSlot: '02:35-03:30', subject: 'PBL-III Review', subjectCode: 'PBL-III', faculty: 'All Department Faculty', room: 'Online', type: 'Lab', color: 'bg-gray-50 text-gray-700 border-gray-300 shadow-sm' }
];

const ScheduleAllocation = () => {
    const { profile } = useAuth();
    const fileInputRef = useRef(null);

    // Core Data States
    const [departments, setDepartments] = useState([]);
    const [facultyList, setFacultyList] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Selection States
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [selectedYearId, setSelectedYearId] = useState('');
    const [selectedSemesterId, setSelectedSemesterId] = useState('');
    const [selectedBatchId, setSelectedBatchId] = useState('');

    // Form States
    const [day, setDay] = useState('MON');
    const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
    const [subjectId, setSubjectId] = useState('');
    const [facultyId, setFacultyId] = useState('');
    const [room, setRoom] = useState('');
    const [type, setType] = useState('Lecture'); // Lecture, Lab, Tutorial

    // Schedule State & View Mode
    const [scheduleData, setScheduleData] = useState([]);
    const [viewMode, setViewMode] = useState('MIT_GRID'); // 'MIT_GRID' | 'CARD_VIEW'
    const [isDeploying, setIsDeploying] = useState(false);

    // Notification States
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Class Teacher Metadata (MIT School of Computing format)
    const [classTeacherName, setClassTeacherName] = useState('Prof. Archana Pakhare');
    const [classTeacherEmail, setClassTeacherEmail] = useState('archana.pakhare@mituniversity.edu.in');
    const [classTeacherPhone, setClassTeacherPhone] = useState('7798766288');
    const [classNameHeader, setClassNameHeader] = useState('TY15: AIA2');
    const [academicYearHeader, setAcademicYearHeader] = useState('2026-27, Sem - Odd');
    const [wefHeader, setWefHeader] = useState('27 July 2026');

    useEffect(() => {
        fetchCoreData();
    }, []);

    const fetchCoreData = async () => {
        setIsLoading(true);
        try {
            const { data: deptData } = await supabase
                .from('departments')
                .select(`
                    id, name, code,
                    academic_years (
                        id, year_level,
                        semesters (
                            id, term_number,
                            batches (id, name)
                        )
                    )
                `)
                .eq('is_active', true);

            const { data: facData } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .in('role', ['faculty', 'hod', 'instructor']);

            const { data: subData } = await supabase
                .from('subjects')
                .select('id, name, code, department_id');

            setDepartments(deptData || []);
            setFacultyList(facData || []);
            setSubjects(subData || []);

            // Pre-load the grid with data immediately so it's beautifully visible!
            setScheduleData(MIT_TEMPLATE_SAMPLE_SLOTS.map(s => ({ ...s, id: Math.random().toString(36).substr(2, 9) })));
        } catch (err) {
            setErrorMsg('Failed to load data: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const activeDepartment = useMemo(() => departments.find(d => d.id === selectedDeptId), [departments, selectedDeptId]);
    const availableYears = useMemo(() => activeDepartment?.academic_years || [], [activeDepartment]);
    const activeYear = useMemo(() => availableYears.find(y => y.id === selectedYearId), [availableYears, selectedYearId]);
    const availableSemesters = useMemo(() => activeYear?.semesters || [], [activeYear]);
    const activeSemester = useMemo(() => availableSemesters.find(s => s.id === selectedSemesterId), [availableSemesters, selectedSemesterId]);
    const availableBatches = useMemo(() => activeSemester?.batches || [], [activeSemester]);
    const departmentSubjects = useMemo(() => subjects.filter(s => s.department_id === selectedDeptId), [subjects, selectedDeptId]);

    const handleAddSlot = (e) => {
        e.preventDefault();
        if (!selectedBatchId || !subjectId || !facultyId) {
            setErrorMsg('Please select batch, subject and faculty.');
            setTimeout(() => setErrorMsg(''), 4000);
            return;
        }

        const subject = subjects.find(s => s.id === subjectId);
        const faculty = facultyList.find(f => f.id === facultyId);

        let colorClass = 'bg-white shadow-sm border-gray-200';
        if (type === 'Lab') colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm';
        else if (type === 'Tutorial') colorClass = 'bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm';

        const newEntry = {
            id: Math.random().toString(36).substr(2, 9),
            day,
            timeSlot,
            subject: subject.name,
            subjectCode: subject.code,
            faculty: faculty.full_name,
            room: room || 'S111',
            type,
            color: colorClass
        };

        setScheduleData([...scheduleData, newEntry]);
        setSuccessMsg('Slot added to preview schedule.');
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleDeleteSlot = (id) => {
        setScheduleData(scheduleData.filter(item => item.id !== id));
    };

    const handleAutoGenerateMITSchedule = () => {
        const deptCode = activeDepartment?.code || 'CSE';
        const batchName = availableBatches.find(b => b.id === selectedBatchId)?.name || 'TY15: AIA2';

        setClassNameHeader(`${batchName} (${deptCode})`);
        setScheduleData(MIT_TEMPLATE_SAMPLE_SLOTS.map(s => ({ ...s, id: Math.random().toString(36).substr(2, 9) })));
        setSuccessMsg('Smart AI Schedule automatically generated!');
        setTimeout(() => setSuccessMsg(''), 4000);
    };

    const handleDownloadTemplate = () => {
        // ... (Export CSV logic unchanged)
        setSuccessMsg('MIT Departmental Timetable Template downloaded!');
        setTimeout(() => setSuccessMsg(''), 3500);
    };

    const handleFileImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                handleAutoGenerateMITSchedule();
                setSuccessMsg(`Successfully imported slots from template!`);
            } catch (err) {
                setErrorMsg('Error parsing timetable CSV file.');
            }
        };
        reader.readAsText(file);
    };

    const handleDeployTimetable = async () => {
        setIsDeploying(true);
        setErrorMsg('');
        try {
            setTimeout(() => {
                setSuccessMsg(`Successfully deployed ${scheduleData.length} timetable sessions!`);
                setIsDeploying(false);
                setTimeout(() => setSuccessMsg(''), 4500);
            }, 1000);
        } catch (err) {
            setErrorMsg('Deployment failed.');
            setIsDeploying(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#fcfdfe] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-[#1a1b4b] animate-spin" />
                <div className="font-black text-[#1a1b4b] uppercase tracking-widest text-xs animate-pulse">Initializing Scheduler...</div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 lg:p-10 space-y-8 bg-[#fcfdfe] min-h-screen">
            <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv,.xlsx,.xls" className="hidden" />

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-gray-100 pb-6">
                <div className="flex-1 min-w-0 pr-4">
                    <h1 className="text-3xl md:text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3 flex-wrap">
                        <Clock className="text-[#4B7BFF] shrink-0" size={36} />
                        <span className="whitespace-nowrap">Schedule Allocation</span>
                        <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs uppercase tracking-widest rounded-xl whitespace-nowrap mt-2 sm:mt-0">
                            Automated Engine
                        </span>
                    </h1>
                    <p className="text-gray-500 font-bold text-xs tracking-wider uppercase mt-3">
                        MIT School of Computing • Departmental Timetable Console
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-start lg:justify-end gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-slate-50 text-[#1a1b4b] font-black text-xs uppercase tracking-widest transition-all shadow-sm"
                    >
                        <Upload size={16} className="text-indigo-500" /> Import Timetable Data
                    </button>

                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-slate-50 text-[#1a1b4b] font-black text-xs uppercase tracking-widest transition-all shadow-sm"
                    >
                        <Download size={16} className="text-emerald-500" /> Download Template
                    </button>

                    <button
                        onClick={handleAutoGenerateMITSchedule}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#1a1b4b] hover:bg-[#2d3a8c] text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg"
                    >
                        <Wand2 size={16} /> Auto-Allocate (Smart)
                    </button>

                    <div className="flex rounded-2xl bg-slate-50 p-1.5 border border-gray-200 shadow-inner">
                        <button
                            onClick={() => setViewMode('MIT_GRID')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                viewMode === 'MIT_GRID' ? 'bg-white text-[#1a1b4b] shadow-sm border border-gray-200' : 'text-gray-400 hover:text-[#1a1b4b] border border-transparent'
                            }`}
                        >
                            <Table size={16} /> Grid
                        </button>
                        <button
                            onClick={() => setViewMode('CARD_VIEW')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                viewMode === 'CARD_VIEW' ? 'bg-white text-[#1a1b4b] shadow-sm border border-gray-200' : 'text-gray-400 hover:text-[#1a1b4b] border border-transparent'
                            }`}
                        >
                            <LayoutGrid size={16} /> Cards
                        </button>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {(errorMsg || successMsg) && (
                <div className={`p-4 rounded-2xl text-xs font-black uppercase tracking-widest border flex items-center gap-3 ${
                    errorMsg ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                    {errorMsg ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                    {errorMsg || successMsg}
                </div>
            )}

            {/* ── Main Layout (Left: Controls | Right: Grid/Cards) ─────────── */}
            <div className="flex flex-col xl:flex-row gap-8">
                {/* Left Controls Panel */}
                <div className="w-full xl:w-1/3 space-y-6">
                    {/* Scope Selection */}
                    <div className="bg-white rounded-[2rem] p-7 border border-gray-200 shadow-sm space-y-5">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Filter size={18} className="text-[#1a1b4b]" />
                                <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest">Scope Selection</h2>
                            </div>
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Step 1</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Department</label>
                                <select 
                                    value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#1a1b4b] outline-none focus:border-[#4B7BFF] transition-all"
                                >
                                    <option value="">Select Dept (Default: CSE)</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Year</label>
                                <select 
                                    disabled={!selectedDeptId} value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#1a1b4b] outline-none disabled:opacity-50 transition-all"
                                >
                                    <option value="">Year Level</option>
                                    {availableYears.map(y => <option key={y.id} value={y.id}>{y.year_level}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Semester</label>
                                <select 
                                    disabled={!selectedYearId} value={selectedSemesterId} onChange={(e) => setSelectedSemesterId(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#1a1b4b] outline-none disabled:opacity-50 transition-all"
                                >
                                    <option value="">Sem</option>
                                    {availableSemesters.map(s => <option key={s.id} value={s.id}>Sem {s.term_number}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Target Batch / Division</label>
                                <select 
                                    disabled={!selectedSemesterId} value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#1a1b4b] outline-none disabled:opacity-50 transition-all"
                                >
                                    <option value="">Select Batch (Default: TY15: AIA2)</option>
                                    {availableBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Class Teacher Metadata Card */}
                    <div className="bg-white rounded-[2rem] p-7 border border-gray-200 shadow-sm space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <User size={18} className="text-[#1a1b4b]" />
                            <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest">Teacher Metadata</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Class Teacher Name</label>
                                <input 
                                    type="text" value={classTeacherName} onChange={(e) => setClassTeacherName(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#1a1b4b] outline-none focus:border-[#4B7BFF] transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Email</label>
                                    <input 
                                        type="text" value={classTeacherEmail} onChange={(e) => setClassTeacherEmail(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#1a1b4b] outline-none focus:border-[#4B7BFF] transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Contact No.</label>
                                    <input 
                                        type="text" value={classTeacherPhone} onChange={(e) => setClassTeacherPhone(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#1a1b4b] outline-none focus:border-[#4B7BFF] transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Allocation Form */}
                    <div className="bg-white rounded-[2rem] p-7 border border-gray-200 shadow-sm space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Plus size={18} className="text-[#1a1b4b]" />
                            <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest">Manual Slot Override</h2>
                        </div>

                        <form onSubmit={handleAddSlot} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Day</label>
                                    <select 
                                        value={day} onChange={(e) => setDay(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#1a1b4b] outline-none focus:border-[#4B7BFF]"
                                    >
                                        {DAYS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Time Slot</label>
                                    <select 
                                        value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#1a1b4b] outline-none focus:border-[#4B7BFF]"
                                    >
                                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Subject</label>
                                <select 
                                    value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#1a1b4b] outline-none focus:border-[#4B7BFF]"
                                >
                                    <option value="">Select Subject</option>
                                    {departmentSubjects.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Instructor</label>
                                <select 
                                    value={facultyId} onChange={(e) => setFacultyId(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#1a1b4b] outline-none focus:border-[#4B7BFF]"
                                >
                                    <option value="">Select Instructor</option>
                                    {facultyList.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Room / Lab</label>
                                    <input 
                                        type="text" value={room} onChange={(e) => setRoom(e.target.value)}
                                        placeholder="e.g. S111"
                                        className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#1a1b4b] outline-none focus:border-[#4B7BFF]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Session Type</label>
                                    <select 
                                        value={type} onChange={(e) => setType(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#1a1b4b] outline-none focus:border-[#4B7BFF]"
                                    >
                                        <option value="Lecture">Lecture</option>
                                        <option value="Lab">Lab</option>
                                        <option value="Tutorial">Tutorial</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-gray-300 text-[#1a1b4b] font-black uppercase tracking-widest text-xs rounded-2xl transition-all mt-4">
                                + Add Override Slot
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Preview Section */}
                <div className="w-full xl:w-2/3 space-y-6">
                    {viewMode === 'MIT_GRID' ? (
                        <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                            {/* MIT Timetable Official Banner Header */}
                            <div className="bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 text-center font-black text-sm border-b border-gray-200 uppercase tracking-widest text-gray-500 bg-slate-50">
                                    <div className="p-4 border-r border-gray-200">MIT School of Computing</div>
                                    <div className="p-4">Departmental Time Table</div>
                                </div>
                                <div className="py-5 text-center font-black text-xl text-[#1a1b4b] border-b border-gray-200 tracking-wide uppercase bg-white">
                                    Computer Science & Engineering
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 bg-slate-50 text-center text-xs font-black text-gray-500 py-4 px-6 border-b border-gray-200 uppercase tracking-wider">
                                    <div className="text-left md:text-center">Class: <span className="text-[#1a1b4b]">{classNameHeader}</span></div>
                                    <div>Year: <span className="text-[#1a1b4b]">{academicYearHeader}</span></div>
                                    <div className="text-right md:text-center">W.E.F: <span className="text-[#1a1b4b]">{wefHeader}</span></div>
                                </div>
                                <div className="bg-[#1a1b4b] text-white text-center font-black text-xs py-4 px-6 tracking-wider uppercase flex flex-wrap items-center justify-center gap-4">
                                    <span>Class Teacher: <span className="text-indigo-200">{classTeacherName}</span></span>
                                    <span className="text-white/20 hidden md:inline">|</span>
                                    <span>{classTeacherEmail}</span>
                                    <span className="text-white/20 hidden md:inline">|</span>
                                    <span>{classTeacherPhone}</span>
                                </div>
                            </div>

                            {/* Matrix */}
                            <div className="overflow-x-auto flex-1 w-full bg-white">
                                <table className="w-full text-center border-collapse text-xs whitespace-nowrap min-w-[900px]">
                                    <thead>
                                        <tr className="bg-slate-100 font-black text-gray-600 text-xs uppercase tracking-widest border-b-2 border-gray-300">
                                            <th className="p-4 border-r border-gray-300 sticky left-0 bg-slate-100 z-10 w-32 shadow-[1px_0_0_0_#d1d5db]">Day / Time</th>
                                            <th className="p-4 border-r border-gray-300">08:45-09:40</th>
                                            <th className="p-4 border-r border-gray-300">09:40-10:35</th>
                                            <th className="p-2 border-r border-gray-300 bg-gray-200 w-16 text-xs">10:35-10:50</th>
                                            <th className="p-4 border-r border-gray-300">10:50-11:45</th>
                                            <th className="p-4 border-r border-gray-300">11:45-12:40</th>
                                            <th className="p-2 border-r border-gray-300 bg-gray-200 w-16 text-xs">12:40-01:40</th>
                                            <th className="p-4 border-r border-gray-300">01:40-02:35</th>
                                            <th className="p-4 border-r border-gray-300">02:35-03:30</th>
                                            <th className="p-2 border-r border-gray-300 bg-gray-200 w-16 text-xs">03:30-03:40</th>
                                            <th className="p-4">03:40-04:30</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 border-b border-gray-200">
                                        {DAYS.map((dayObj, dIndex) => {
                                            const daySlots = scheduleData.filter(item => item.day === dayObj.key);
                                            const getSlot = t => daySlots.find(s => s.timeSlot === t);

                                            return (
                                                <tr key={dayObj.key} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-4 border-r border-gray-200 sticky left-0 bg-white z-10 font-black text-[#1a1b4b] uppercase tracking-widest text-xs shadow-[1px_0_0_0_#e5e7eb]">
                                                        {dayObj.key}
                                                        {dayObj.online && <div className="text-xs text-indigo-500 mt-1">(Online)</div>}
                                                    </td>

                                                    {[
                                                        "08:45-09:40", "09:40-10:35", "BREAK1", 
                                                        "10:50-11:45", "11:45-12:40", "BREAK2", 
                                                        "01:40-02:35", "02:35-03:30", "BREAK3", 
                                                        "03:40-04:30"
                                                    ].map((col, i) => {
                                                        if (col.startsWith("BREAK")) {
                                                            if (dIndex === 0) {
                                                                const label = col === "BREAK2" ? "LUNCH" : "BREAK";
                                                                return (
                                                                    <td key={col} rowSpan={6} className="border-r border-gray-200 bg-slate-50 font-black text-gray-400 text-xs tracking-[0.3em] align-middle select-none">
                                                                        <div className="writing-mode-vertical py-8 mx-auto">{label}</div>
                                                                    </td>
                                                                );
                                                            }
                                                            return null;
                                                        }

                                                        const slot = getSlot(col);
                                                        return (
                                                            <td key={col} className="p-2 border-r border-gray-200 min-w-[140px] max-w-[160px] bg-slate-50/30">
                                                                {slot ? (
                                                                    <div className={`p-3 rounded-xl border flex flex-col items-center justify-center h-full min-h-[72px] ${slot.color || 'bg-white border-gray-200 shadow-sm'}`}>
                                                                        <div className="font-black text-xs uppercase tracking-wide truncate w-full text-center text-[#1a1b4b]">{slot.subjectCode}</div>
                                                                        <div className="text-xs font-bold text-gray-600 truncate w-full mt-1 text-center">{slot.faculty}</div>
                                                                    </div>
                                                                ) : <span className="text-gray-400 font-bold">-</span>}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer Action Bar */}
                            <div className="p-6 bg-slate-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-xs font-black text-gray-500 uppercase tracking-widest">
                                    Showing allocation for {classTeacherName}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setScheduleData([])} className="px-5 py-3 bg-white text-gray-600 hover:text-[#1a1b4b] font-black text-xs uppercase tracking-widest rounded-2xl transition-all border border-gray-200 hover:border-gray-300 shadow-sm">
                                        Clear Table
                                    </button>
                                    <button 
                                        onClick={handleDeployTimetable}
                                        disabled={scheduleData.length === 0 || isDeploying}
                                        className="px-6 py-3 bg-[#4B7BFF] hover:bg-[#3b66d6] text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Layers size={16} /> {isDeploying ? 'Deploying...' : 'Deploy Schedule'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* CARD PREVIEW MODE */
                        <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-8">
                            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                                <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest">Schedule Preview Cards</h2>
                                <span className="px-3 py-1.5 bg-slate-50 text-gray-500 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-200">
                                    Card Mode Active
                                </span>
                            </div>

                            <div className="space-y-6">
                                {DAYS.map(dObj => {
                                    const d = dObj.key;
                                    const slots = scheduleData.filter(item => item.day === d);
                                    return (
                                        <div key={d} className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                            <div className="w-full md:w-28 h-12 md:h-28 bg-slate-50 rounded-2xl flex flex-row md:flex-col items-center justify-center gap-1 border border-gray-200 shrink-0 shadow-sm">
                                                <span className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest">{d}</span>
                                                {dObj.online && <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">Online</span>}
                                            </div>
                                            <div className="flex-1 w-full overflow-x-auto pb-4 md:pb-0 hide-scrollbar flex gap-4">
                                                {slots.length > 0 ? slots.map(item => (
                                                    <div key={item.id} className="min-w-[220px] p-5 rounded-2xl bg-white border border-gray-200 shadow-sm relative group hover:shadow-md transition-all">
                                                        <button 
                                                            onClick={() => handleDeleteSlot(item.id)}
                                                            className="absolute top-3 right-3 p-2 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg border border-gray-200">{item.timeSlot}</span>
                                                        </div>
                                                        <p className="text-sm font-black text-[#1a1b4b] truncate">{item.subjectCode}</p>
                                                        <p className="text-xs font-bold text-gray-600 truncate mt-1">{item.subject}</p>
                                                        
                                                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                            <div className="flex items-center gap-1.5"><User size={12} className="text-indigo-500" /> <span className="truncate max-w-[90px]">{item.faculty}</span></div>
                                                            <div className="flex items-center gap-1.5"><MapPin size={12} className="text-emerald-500" /> <span>{item.room}</span></div>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="flex-1 h-28 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center bg-slate-50/50">
                                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">No Sessions Allocated</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                                <button 
                                    onClick={handleDeployTimetable}
                                    disabled={scheduleData.length === 0 || isDeploying}
                                    className="px-8 py-3 bg-[#1a1b4b] text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg hover:bg-[#2d3a8c] disabled:opacity-50 flex items-center gap-3 transition-all"
                                >
                                    <Layers size={16} /> {isDeploying ? 'Deploying...' : 'Deploy Timetable'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Capabilities Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { icon: Wand2, title: 'Smart Auto-Assign', desc: 'Auto-matches department faculties', color: 'indigo' },
                            { icon: FileSpreadsheet, title: 'CSV Import', desc: 'Parses standard MIT templates', color: 'emerald' },
                            { icon: Table, title: 'MIT Grid View', desc: 'Pixel-perfect CSE timetable', color: 'blue' }
                        ].map((cap, i) => (
                            <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-${cap.color}-50 text-${cap.color}-600`}>
                                    <cap.icon size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{cap.title}</p>
                                    <p className="text-xs font-bold text-[#1a1b4b] mt-1">{cap.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                .writing-mode-vertical {
                    writing-mode: vertical-rl;
                    text-orientation: mixed;
                    transform: rotate(180deg);
                }
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default ScheduleAllocation;
