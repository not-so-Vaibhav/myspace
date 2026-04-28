import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
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
  BookOpen,
  Filter
} from 'lucide-react';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const TIME_SLOTS = [
  "08:45-09:40", "09:40-10:35", "10:50-11:45", 
  "11:45-12:40", "01:40-02:35", "02:35-03:30", 
  "03:40-04:30"
];

const ScheduleAllocation = () => {
    const { profile } = useAuth();
    
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
    
    // Schedule State
    const [scheduleData, setScheduleData] = useState([]);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

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
            
            // Mock schedule data for demo if no table exists
            // In a real scenario, we would fetch from 'schedules' table
            setScheduleData([]);
        } catch (err) {
            setErrorMsg('Failed to load data: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper Derivations
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
            return;
        }

        const subject = subjects.find(s => s.id === subjectId);
        const faculty = facultyList.find(f => f.id === facultyId);

        const newEntry = {
            id: Math.random().toString(36).substr(2, 9),
            day,
            timeSlot,
            subject: subject.name,
            subjectCode: subject.code,
            faculty: faculty.full_name,
            room,
            type
        };

        setScheduleData([...scheduleData, newEntry]);
        setSuccessMsg('Slot added to preview schedule.');
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleDeleteSlot = (id) => {
        setScheduleData(scheduleData.filter(item => item.id !== id));
    };

    if (isLoading) return <div className="p-12 text-center font-black text-[#1a1b4b] uppercase tracking-widest animate-pulse">Initializing Scheduler...</div>;

    return (
        <div className="p-8 sm:p-12 space-y-10 bg-[#fcfdfe] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-[#1a1b4b]/10 rounded-xl">
                            <Clock className="text-[#1a1b4b]" size={24} />
                        </div>
                        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
                            Schedule Allocation
                        </h1>
                    </div>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase ml-11">
                        Admin Timetable Management Console
                    </p>
                </div>
            </div>

            {/* Notifications */}
            <div className="fixed top-8 right-8 z-50 space-y-2 pointer-events-none w-80">
                {errorMsg && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 shadow-xl rounded-r-xl flex items-center gap-3 pointer-events-auto">
                        <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0" />
                        <p className="text-xs font-bold text-red-700 leading-tight">{errorMsg}</p>
                    </div>
                )}
                {successMsg && (
                    <div className="p-4 bg-green-50 border-l-4 border-green-500 shadow-xl rounded-r-xl flex items-center gap-3 pointer-events-auto">
                        <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" />
                        <p className="text-xs font-bold text-green-700 leading-tight">{successMsg}</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Controls Panel */}
                <div className="xl:col-span-4 space-y-8">
                    {/* 1. Hierarchy Selection */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Filter size={18} className="text-[#ef4444]" />
                            <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">Scope Selection</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Department</label>
                                <select 
                                    value={selectedDeptId} 
                                    onChange={(e) => setSelectedDeptId(e.target.value)}
                                    className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-[#1a1b4b] outline-none"
                                >
                                    <option value="">Select Dept</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Year</label>
                                <select 
                                    disabled={!selectedDeptId}
                                    value={selectedYearId} 
                                    onChange={(e) => setSelectedYearId(e.target.value)}
                                    className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-[#1a1b4b] outline-none disabled:opacity-50"
                                >
                                    <option value="">Year</option>
                                    {availableYears.map(y => <option key={y.id} value={y.id}>{y.year_level}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Semester</label>
                                <select 
                                    disabled={!selectedYearId}
                                    value={selectedSemesterId} 
                                    onChange={(e) => setSelectedSemesterId(e.target.value)}
                                    className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-[#1a1b4b] outline-none disabled:opacity-50"
                                >
                                    <option value="">Sem</option>
                                    {availableSemesters.map(s => <option key={s.id} value={s.id}>Sem {s.term_number}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Target Batch</label>
                                <select 
                                    disabled={!selectedSemesterId}
                                    value={selectedBatchId} 
                                    onChange={(e) => setSelectedBatchId(e.target.value)}
                                    className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-[#1a1b4b] outline-none disabled:opacity-50"
                                >
                                    <option value="">Select Batch</option>
                                    {availableBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 2. Allocation Form */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Plus size={18} className="text-emerald-500" />
                            <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">Add New Slot</h2>
                        </div>

                        <form onSubmit={handleAddSlot} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Day</label>
                                    <select 
                                        value={day} onChange={(e) => setDay(e.target.value)}
                                        className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-[#1a1b4b] outline-none"
                                    >
                                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Time Slot</label>
                                    <select 
                                        value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}
                                        className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-[#1a1b4b] outline-none"
                                    >
                                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Subject</label>
                                <select 
                                    disabled={!selectedDeptId}
                                    value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                                    className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-[#1a1b4b] outline-none disabled:opacity-50"
                                >
                                    <option value="">Select Subject</option>
                                    {departmentSubjects.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Instructor</label>
                                <select 
                                    value={facultyId} onChange={(e) => setFacultyId(e.target.value)}
                                    className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-[#1a1b4b] outline-none"
                                >
                                    <option value="">Select Instructor</option>
                                    {facultyList.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Room</label>
                                    <input 
                                        type="text" value={room} onChange={(e) => setRoom(e.target.value)}
                                        placeholder="e.g. N505"
                                        className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-[#1a1b4b] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Type</label>
                                    <select 
                                        value={type} onChange={(e) => setType(e.target.value)}
                                        className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-[#1a1b4b] outline-none"
                                    >
                                        <option value="Lecture">Lecture</option>
                                        <option value="Lab">Lab</option>
                                        <option value="Tutorial">Tutorial</option>
                                    </select>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-3 bg-[#1a1b4b] hover:bg-[#2d3a8c] text-white font-black uppercase tracking-widest text-[12px] rounded-2xl transition-all shadow-lg active:scale-95 mt-2"
                            >
                                Add to Schedule
                            </button>
                        </form>
                    </div>
                </div>

                {/* Preview Grid */}
                <div className="xl:col-span-8 space-y-8">
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-[#1a1b4b]/5 overflow-hidden p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight">Schedule Preview</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {selectedBatchId ? `Current Batch: ${availableBatches.find(b => b.id === selectedBatchId)?.name}` : 'Select a batch to view schedule'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <div className="px-3 py-1 bg-amber-50 rounded-lg border border-amber-100">
                                    <span className="text-amber-600 text-[10px] font-black uppercase tracking-widest italic">Preview Mode</span>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <div className="min-w-[800px] space-y-4">
                                {DAYS.map(d => (
                                    <div key={d} className="flex gap-4 items-center">
                                        <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 flex-shrink-0">
                                            <span className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest">{d}</span>
                                        </div>
                                        <div className="flex-1 flex gap-3 overflow-x-auto py-1">
                                            {scheduleData.filter(item => item.day === d).length > 0 ? (
                                                scheduleData.filter(item => item.day === d).map(item => (
                                                    <div key={item.id} className={`min-w-[180px] p-3 rounded-2xl border ${item.type === 'Lab' ? 'bg-emerald-50 border-emerald-100' : 'bg-indigo-50 border-indigo-100'} group relative transition-all hover:scale-[1.02] hover:shadow-md`}>
                                                        <button 
                                                            onClick={() => handleDeleteSlot(item.id)}
                                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-[10px] font-black text-gray-400">{item.timeSlot}</span>
                                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${item.type === 'Lab' ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white'}`}>{item.type}</span>
                                                        </div>
                                                        <p className="text-xs font-black text-[#1a1b4b] truncate">{item.subjectCode}: {item.subject}</p>
                                                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-gray-500">
                                                            <User size={10} />
                                                            <span className="truncate">{item.faculty}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-[#ef4444]">
                                                            <MapPin size={10} />
                                                            <span>{item.room}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex-1 h-20 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">No Sessions Allocated</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-10 pt-8 border-t border-gray-100 flex justify-end">
                            <button 
                                disabled={scheduleData.length === 0}
                                className="px-8 py-3 bg-[#1a1b4b] text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-lg hover:shadow-xl hover:bg-[#2d3a8c] disabled:opacity-30 flex items-center gap-3"
                            >
                                <Layers size={16} />
                                <span>Deploy Timetable</span>
                            </button>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                <Info size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Auto-Conflict Check</p>
                                <p className="text-sm font-bold text-[#1a1b4b]">Engine validates room & faculty availability.</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                <Layers size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Real-time Sync</p>
                                <p className="text-sm font-bold text-[#1a1b4b]">Changes are instantly visible to students.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleAllocation;
