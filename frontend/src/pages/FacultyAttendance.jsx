import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, Calendar as CalendarIcon, Clock, Save, ArrowLeft, Loader2, CheckCircle2, XCircle, CalendarCheck, History, Edit2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const FacultyAttendance = () => {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const preSelectedAllocation = searchParams.get('alloc');

  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedAllocation, setSelectedAllocation] = useState(preSelectedAllocation || '');
  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({}); // student_id -> 'present' | 'absent'
  const [sessionTopic, setSessionTopic] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // History & Edit Modes
  const [mode, setMode] = useState('create'); // 'create' | 'history' | 'edit'
  const [pastSessions, setPastSessions] = useState([]);
  const [editingSessionId, setEditingSessionId] = useState(null);

  useEffect(() => {
    fetchAllocations();
  }, [profile?.id]);

  useEffect(() => {
    if (selectedAllocation) {
      setMode('create');
      setEditingSessionId(null);
      fetchStudents(selectedAllocation);
      fetchHistory(selectedAllocation);
    } else {
      setStudents([]);
      setPastSessions([]);
    }
  }, [selectedAllocation]);

  // Update URL so a refresh keeps you on the same page
  useEffect(() => {
    if (selectedAllocation) {
        setSearchParams({ alloc: selectedAllocation });
    } else {
        setSearchParams({});
    }
  }, [selectedAllocation, setSearchParams]);

  const fetchAllocations = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subject_allocations')
        .select(`
          id,
          subject:subjects(name, code),
          batch:batches(name),
          semester:semesters(term_number)
        `)
        .eq('faculty_id', profile.id);

      if (error) throw error;
      setAllocations(data || []);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (allocationId) => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          profiles:profiles!student_id(full_name, id)
        `)
        .eq('allocation_id', allocationId);
        
      if (error) throw error;
      
      const enrolledStudents = data.map(d => ({
        id: d.profiles.id,
        name: d.profiles.full_name || 'Unknown Student'
      }));
      
      enrolledStudents.sort((a, b) => a.name.localeCompare(b.name));
      
      setStudents(enrolledStudents);
      
      // Default everyone to present
      const defaultState = {};
      enrolledStudents.forEach(s => {
        defaultState[s.id] = 'present';
      });
      setAttendanceState(defaultState);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (allocId) => {
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select(`
          id, topic, session_date, session_time, created_at,
          records:attendance_records(id, status)
        `)
        .eq('allocation_id', allocId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPastSessions(data || []);
    } catch (err) {
      console.error("Error fetching history:", err.message);
    }
  };

  const handleEditSession = async (session) => {
    setMode('edit');
    setEditingSessionId(session.id);
    setSessionTopic(session.topic || '');
    setSaveSuccess(false);

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('student_id, status')
        .eq('session_id', session.id);

      if (error) throw error;
      
      const newState = {};
      data.forEach(r => {
        newState[r.student_id] = r.status;
      });
      
      // Ensure all enrolled students exist in state (incase they enrolled after session creation)
      students.forEach(s => {
        if (!newState[s.id]) newState[s.id] = 'present';
      });

      setAttendanceState(newState);
      setError('');
    } catch(err) {
      setError("Failed to load session records.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAttendance = (studentId) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleMarkAll = (status) => {
    const newState = {};
    students.forEach(s => {
      newState[s.id] = status;
    });
    setAttendanceState(newState);
  };

  const handleSaveAttendance = async () => {
    if (!selectedAllocation || students.length === 0) return;
    setIsSaving(true);
    setError('');
    
    try {
      let sessionId = editingSessionId;

      if (mode === 'create') {
        const { data: sessionInfo, error: sessionError } = await supabase
          .from('attendance_sessions')
          .insert({
            allocation_id: selectedAllocation,
            faculty_id: profile.id,
            topic: sessionTopic || `Session on ${new Date().toLocaleDateString()}`
          })
          .select()
          .single();
          
        if (sessionError) {
          if (sessionError.code === '23505') throw new Error("A session was already created for this allocation just now. Wait a minute.");
          throw sessionError;
        }
        sessionId = sessionInfo.id;
      } else if (mode === 'edit') {
        const { error: updateError } = await supabase
          .from('attendance_sessions')
          .update({ topic: sessionTopic || 'Updated Session' })
          .eq('id', sessionId);
        if (updateError) throw updateError;
      }
      
      const recordsToUpsert = students.map(student => ({
        session_id: sessionId,
        student_id: student.id,
        status: attendanceState[student.id]
      }));
      
      // Upsert overwrites identical session_id + student_id combinations safely
      const { error: recordsError } = await supabase
        .from('attendance_records')
        .upsert(recordsToUpsert, { onConflict: 'session_id, student_id' });
        
      if (recordsError) throw recordsError;
      
      setSaveSuccess(true);
      fetchHistory(selectedAllocation); // Refresh history pool
      
      if (mode === 'create') {
        setSessionTopic('');
      } else {
        setTimeout(() => setMode('history'), 2000); // Auto revert back to history gracefully
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedAllocData = allocations.find(a => a.id === selectedAllocation);

  return (
    <div className="p-8 sm:p-12">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-8">
        {selectedAllocation ? (
            <button 
                onClick={() => setSelectedAllocation('')}
                className="inline-flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors w-max mb-2"
            >
                <ArrowLeft size={14} /> Back to Courses
            </button>
        ) : (
            <Link to="/faculty-dashboard" className="inline-flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors w-max mb-2">
                <ArrowLeft size={14} /> Back to Dashboard
            </Link>
        )}
        
        <div>
           <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
             {selectedAllocation ? `Record Attendance` : `Student Attendance`}
           </h1>
           <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
             {selectedAllocation ? `${selectedAllocData?.subject?.name} (${selectedAllocData?.subject?.code})` : 'Select a course to initiate session'}
           </p>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-8 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      {!selectedAllocation ? (
          /* COURSE SELECTION GRID */
          loading && !allocations.length ? (
              <div className="p-12 flex items-center justify-center">
                  <Loader2 className="animate-spin w-6 h-6 text-[#1a1b4b] mr-3" />
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Courses...</span>
              </div>
          ) : allocations.length === 0 ? (
             <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm max-w-xl mx-auto">
                <CalendarIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-black text-[#1a1b4b]">No Courses Assigned</h3>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-2">Wait for your HOD/Admin to assign you subjects.</p>
             </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {allocations.map(alloc => (
                      <button
                          key={alloc.id}
                          onClick={() => setSelectedAllocation(alloc.id)}
                          className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100/80 hover:shadow-md hover:-translate-y-1 hover:border-[#1a1b4b]/10 transition-all flex flex-col h-60 relative group text-left"
                      >
                          <div className="absolute inset-0 flex justify-center items-center pointer-events-none pb-8">
                             <div className="w-[84px] h-[84px] bg-gray-50/70 group-hover:bg-[#1a1b4b]/5 rounded-[2rem] flex justify-center items-center transition-colors">
                                <CalendarCheck size={36} className="text-[#1a1b4b]" strokeWidth={2} />
                             </div>
                          </div>
                          <div className="mt-auto flex items-end justify-between w-full relative z-10">
                              <div>
                                  <h3 className="text-3xl font-black text-[#1a1b4b] tracking-tighter mb-2 leading-none">
                                      {alloc.subject?.code}
                                  </h3>
                                  <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] font-black text-[#1a1b4b] bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-widest border border-indigo-100">
                                          {alloc.batch?.name || 'Class'}
                                      </span>
                                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                          Attendance
                                      </span>
                                  </div>
                              </div>
                              <div className="w-3.5 h-3.5 rounded-full bg-[#666885]"></div>
                          </div>
                      </button>
                  ))}
              </div>
          )
      ) : (
          /* WORKSPACE (New/Edit/History) */
          <div className="space-y-6">
              
              {/* Tab Navigation */}
              <div className="flex gap-4 border-b border-gray-100">
                 <button 
                   onClick={() => { setMode('create'); setSessionTopic(''); fetchStudents(selectedAllocation); }} 
                   className={`px-4 py-3 font-black text-xs uppercase tracking-widest transition-all ${mode==='create' ? 'text-[#1a1b4b] border-b-2 border-[#1a1b4b]' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   Take Attendance
                 </button>
                 <button 
                   onClick={() => setMode('history')} 
                   className={`px-4 py-3 font-black text-xs uppercase tracking-widest transition-all ${mode==='history' ? 'text-[#1a1b4b] border-b-2 border-[#1a1b4b]' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   History Log
                 </button>
                 {mode === 'edit' && (
                   <button className="px-4 py-3 font-black text-xs uppercase tracking-widest text-[#ef4444] border-b-2 border-[#ef4444]">
                     Editing Session Data
                   </button>
                 )}
              </div>

              {/* View: HISTORY LIST */}
              {mode === 'history' ? (
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                     <h3 className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest mb-6 flex items-center gap-2">
                        <History size={16} /> Past Class Sessions
                     </h3>
                     {pastSessions.length === 0 ? (
                        <div className="text-center p-8 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                           <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No past sessions found for this batch.</p>
                        </div>
                     ) : (
                        <div className="space-y-4">
                           {pastSessions.map(session => (
                              <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 hover:border-[#1a1b4b]/20 hover:shadow-md transition-all group">
                                 <div>
                                     <div className="font-black text-[#1a1b4b] text-base leading-tight mb-1">{session.topic || 'Unnamed Session'}</div>
                                     <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 flex flex-wrap gap-4 items-center">
                                        <span className="flex items-center gap-1"><CalendarIcon size={12} className="-mt-0.5" />{session.session_date}</span>
                                        <span className="flex items-center gap-1"><Clock size={12} className="-mt-0.5" />{session.session_time?.substring(0, 5)}</span>
                                        <span className="px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded-md">
                                           {session.records?.filter(r => r.status === 'present').length} Present
                                        </span>
                                        <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-md">
                                           {session.records?.filter(r => r.status === 'absent').length} Absent
                                        </span>
                                     </div>
                                 </div>
                                 <button onClick={() => handleEditSession(session)} className="mt-4 sm:mt-0 px-5 py-2.5 bg-white text-[#1a1b4b] font-black text-[10px] uppercase tracking-widest border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shrink-0 flex items-center gap-2 group-hover:border-[#1a1b4b]/30">
                                     <Edit2 size={12} /> Edit Register
                                 </button>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
              ) : (
                  /* View: CREATE / EDIT */
                  <>
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col md:flex-row gap-6 items-center justify-between shadow-sm">
                        <div className="flex-1 w-full relative">
                            <input
                            type="text"
                            placeholder="Topic Covered / Remarks (Optional)"
                            value={sessionTopic}
                            onChange={(e) => setSessionTopic(e.target.value)}
                            className="w-full sm:max-w-md p-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-[#1a1b4b]/20"
                            />
                        </div>
                        <div className="flex gap-4 shrink-0">
                            <div className="px-5 py-3 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <CalendarIcon size={14} /> {mode === 'edit' ? 'Editing Log' : new Date().toLocaleDateString('en-GB')}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                        {loading ? (
                        <div className="p-12 flex justify-center">
                            <Loader2 className="animate-spin w-6 h-6 text-[#1a1b4b]" />
                        </div>
                        ) : students.length === 0 ? (
                        <div className="p-16 text-center">
                            <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-lg font-black text-[#1a1b4b]">No Students Enrolled</h3>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-2">No students registered with this subject code yet.</p>
                        </div>
                        ) : (
                        <>
                            <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-xs font-black text-[#1a1b4b] uppercase tracking-widest">
                                    Class Roster ({students.length})
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button onClick={() => handleMarkAll('present')} className="flex-1 sm:flex-none text-[10px] font-black bg-green-50 text-green-700 px-4 py-2.5 rounded-xl uppercase tracking-widest hover:bg-green-100 transition-colors border border-green-200">
                                        Mark All Present
                                    </button>
                                    <button onClick={() => handleMarkAll('absent')} className="flex-1 sm:flex-none text-[10px] font-black bg-red-50 text-red-700 px-4 py-2.5 rounded-xl uppercase tracking-widest hover:bg-red-100 transition-colors border border-red-200">
                                        Mark All Absent
                                    </button>
                                </div>
                            </div>

                            <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                                {students.map((student, idx) => {
                                const isPresent = attendanceState[student.id] === 'present';
                                return (
                                    <div key={student.id} className="flex items-center justify-between p-4 sm:px-8 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-[#1a1b4b]/5 flex items-center justify-center text-[10px] font-black text-[#1a1b4b]">
                                        {idx + 1}
                                        </div>
                                        <span className="text-sm font-black text-[#1a1b4b] tracking-tight">{student.name}</span>
                                    </div>
                                    
                                    <button
                                        onClick={() => handleToggleAttendance(student.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-xs uppercase tracking-widest border ${
                                        isPresent 
                                            ? 'bg-green-50 border-green-200 text-green-700 shadow-[inset_0_2px_4px_rgba(34,197,94,0.1)]' 
                                            : 'bg-red-50 border-red-200 text-red-700 opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        {isPresent ? <CheckCircle2 size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                                        {isPresent ? 'Present' : 'Absent'}
                                    </button>
                                    </div>
                                );
                                })}
                            </div>
                            
                            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                    Net Registry: <span className="text-green-600 ml-2">{Object.values(attendanceState).filter(v => v === 'present').length} Present</span>
                                    <span className="text-red-500 ml-3">{Object.values(attendanceState).filter(v => v === 'absent').length} Absent</span>
                                </div>
                                
                                <button
                                onClick={handleSaveAttendance}
                                disabled={isSaving}
                                className={`flex items-center justify-center gap-2 px-8 py-3.5 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50 w-full sm:w-auto shadow-md ${mode === 'edit' ? 'bg-[#ef4444] hover:bg-red-700' : 'bg-[#1a1b4b] hover:bg-[#2d3a8c]'}`}
                                >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {isSaving ? 'Syncing...' : mode === 'edit' ? 'Update Records' : 'Submit Session'}
                                </button>
                            </div>
                            
                            {saveSuccess && (
                            <div className="m-6 p-4 bg-green-50 rounded-2xl border border-green-200 flex items-center justify-center gap-3">
                                <CheckCircle2 size={20} className="text-green-500" />
                                <span className="text-sm font-black text-green-800 tracking-tight">
                                    {mode === 'edit' ? 'Attendance records completely updated!' : 'New attendance session successfully recorded!'}
                                </span>
                            </div>
                            )}
                        </>
                        )}
                    </div>
                  </>
              )}
          </div>
      )}
    </div>
  );
};

export default FacultyAttendance;
