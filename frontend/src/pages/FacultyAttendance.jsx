import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, Calendar as CalendarIcon, Clock, Save, ArrowLeft, Loader2, CheckCircle2, XCircle, CalendarCheck, History, Edit2, Download, Filter, FileText } from 'lucide-react';
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
  const [downloading, setDownloading] = useState(false);
  
  // Monthly Filter
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

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
  
  const handleDownloadSession = async (session, format = 'csv') => {
    setDownloading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`status, profiles:profiles!student_id(full_name)`)
        .eq('session_id', session.id);
      
      if (error) throw error;
      
      const rows = [
        ['Student Name', 'Status'],
        ...data.map(r => [r.profiles.full_name, r.status.toUpperCase()])
      ];

      if (format === 'pdf') {
        const printWindow = window.open('', '_blank');
        const html = `
          <html>
            <head>
              <title>Attendance Report - ${selectedAllocationData?.subject?.name}</title>
              <style>
                body { font-family: sans-serif; padding: 40px; color: #1a1b4b; }
                header { border-bottom: 2px solid #1a1b4b; margin-bottom: 20px; padding-bottom: 10px; }
                h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
                .meta { color: #666; font-size: 12px; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #eee; padding: 12px; text-align: left; font-size: 14px; }
                th { background: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 11px; }
                .present { color: #10b981; font-weight: bold; }
                .absent { color: #ef4444; font-weight: bold; }
              </style>
            </head>
            <body>
              <header>
                <h1>Attendance Session Report</h1>
                <div class="meta">Subject: ${selectedAllocationData?.subject?.name} (${selectedAllocationData?.subject?.code})</div>
                <div class="meta">Batch: ${selectedAllocationData?.batch?.name} · Session: ${session.topic}</div>
                <div class="meta">Date: ${new Date(session.session_date).toLocaleDateString()} · Time: ${session.session_time}</div>
              </header>
              <table>
                <thead><tr><th>Student Name</th><th>Attendance Status</th></tr></thead>
                <tbody>
                  ${data.map(r => `<tr><td>${r.profiles.full_name}</td><td class="${r.status}">${r.status.toUpperCase()}</td></tr>`).join('')}
                </tbody>
              </table>
              <footer style="margin-top: 40px; font-size: 10px; color: #ccc; text-align: center;">Verified Academic Ledger · Generated via MySpace EMS</footer>
            </body>
          </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
      } else {
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.href = encodeURI(csvContent);
        link.download = `Attendance_${session.topic.replace(/\s+/g, '_')}.csv`;
        link.click();
      }
    } catch (err) { alert("Download failed: " + err.message); }
    setDownloading(false);
  };

  const handleDownloadMonthlyReport = async (format = 'csv') => {
    setDownloading(true);
    try {
      const startDate = new Date(filterYear, filterMonth - 1, 1).toISOString();
      const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('attendance_sessions')
        .select(`
          id, topic, session_date,
          records:attendance_records(student_id, status, profiles:profiles!student_id(full_name))
        `)
        .eq('allocation_id', selectedAllocation)
        .gte('session_date', startDate)
        .lte('session_date', endDate);

      if (error) throw error;
      if (data.length === 0) throw new Error("No data found for the selected period.");

      // Pivot data: Rows = Students, Cols = Sessions
      const studentMap = {}; // id -> { name, attendance: { sessionId: status } }
      const sessions = data.sort((a, b) => new Date(a.session_date) - new Date(b.session_date));

      sessions.forEach(s => {
        s.records.forEach(r => {
          if (!studentMap[r.student_id]) {
            studentMap[r.student_id] = { name: r.profiles.full_name, attendance: {} };
          }
          studentMap[r.student_id].attendance[s.id] = r.status.charAt(0).toUpperCase();
        });
      });

      const header = ['Student Name', ...sessions.map(s => new Date(s.session_date).toLocaleDateString())];
      const rows = Object.values(studentMap).map(s => [
        s.name,
        ...sessions.map(sess => s.attendance[sess.id] || '-')
      ]);

      if (format === 'pdf') {
        const printWindow = window.open('', '_blank');
        const html = `
          <html>
            <head>
              <title>Monthly Report - ${filterMonth}/${filterYear}</title>
              <style>
                body { font-family: sans-serif; padding: 20px; color: #1a1b4b; }
                header { border-bottom: 2px solid #1a1b4b; margin-bottom: 20px; padding-bottom: 10px; }
                h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
                .meta { color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
                th, td { border: 1px solid #eee; padding: 8px; text-align: left; font-size: 10px; overflow: hidden; text-overflow: ellipsis; }
                th { background: #f8fafc; font-weight: bold; }
                .P { color: #10b981; font-weight: bold; }
                .A { color: #ef4444; font-weight: bold; }
              </style>
            </head>
            <body>
              <header>
                <h1>Monthly Compliance Ledger</h1>
                <div class="meta">Subject: ${selectedAllocationData?.subject?.name} · Period: ${filterMonth}/${filterYear}</div>
                <div class="meta">Batch: ${selectedAllocationData?.batch?.name}</div>
              </header>
              <table>
                <thead><tr><th>Student Name</th>${sessions.map(s => `<th>${new Date(s.session_date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })}</th>`).join('')}</tr></thead>
                <tbody>
                  ${Object.values(studentMap).map(s => `<tr><td>${s.name}</td>${sessions.map(sess => `<td class="${s.attendance[sess.id]}">${s.attendance[sess.id] || '-'}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>
            </body>
          </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
      } else {
        const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.href = encodeURI(csvContent);
        link.download = `Monthly_Attendance_${filterMonth}_${filterYear}.csv`;
        link.click();
      }
    } catch (err) { alert(err.message); }
    setDownloading(false);
  };

  const selectedAllocationData = allocations.find(a => a.id === selectedAllocation);

  const handleEditSession = async (session) => {
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
                className="inline-flex items-center gap-1.5 text-[12px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors w-max mb-2"
            >
                <ArrowLeft size={14} /> Back to Courses
            </button>
        ) : (
            <Link to="/faculty-dashboard" className="inline-flex items-center gap-1.5 text-[12px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors w-max mb-2">
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
                                      <span className="text-[12px] font-black text-[#1a1b4b] bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-widest border border-indigo-100">
                                          {alloc.batch?.name || 'Class'}
                                      </span>
                                      <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">
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
                  <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 border-2 border-[#f4f6fa] shadow-2xl shadow-indigo-100/20 relative overflow-hidden">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-[#1a1b4b] rounded-2xl flex items-center justify-center text-white shadow-lg">
                                  <History size={24} />
                              </div>
                              <div>
                                  <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter">Past Class Sessions</h2>
                                  <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Academic Audit Trail</p>
                              </div>
                          </div>

                          {/* Monthly Export Filters */}
                          <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-3xl border border-gray-100 shadow-inner">
                              <div className="flex items-center gap-2 px-3">
                                  <Filter size={14} className="text-[#1a1b4b]" />
                                  <select 
                                      value={filterMonth}
                                      onChange={(e) => setFilterMonth(Number(e.target.value))}
                                      className="bg-transparent text-[13px] font-black uppercase tracking-widest outline-none cursor-pointer"
                                  >
                                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                          <option key={i} value={i + 1}>{m}</option>
                                      ))}
                                  </select>
                                  <input 
                                      type="number" 
                                      value={filterYear}
                                      onChange={(e) => setFilterYear(Number(e.target.value))}
                                      className="bg-transparent w-16 text-[13px] font-black uppercase tracking-widest outline-none border-l border-gray-200 pl-2"
                                  />
                              </div>
                              <div className="flex items-center gap-1">
                                  <button
                                      disabled={downloading}
                                      onClick={() => handleDownloadMonthlyReport('csv')}
                                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-[#1a1b4b] rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
                                  >
                                      <Download size={14} /> .XLSX
                                  </button>
                                  <button
                                      disabled={downloading}
                                      onClick={() => handleDownloadMonthlyReport('pdf')}
                                      className="flex items-center gap-2 px-4 py-2 bg-white text-[#ef4444] rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-red-50 transition-all border border-red-100"
                                  >
                                      <FileText size={14} /> PDF
                                  </button>
                              </div>
                          </div>
                      </div>

                      {pastSessions.length === 0 ? (
                          <div className="text-center p-16 bg-gray-50/50 rounded-[2rem] border border-gray-100 border-dashed">
                             <p className="text-gray-400 text-sm font-black uppercase tracking-[0.2em]">No intelligence history recorded</p>
                          </div>
                      ) : (
                          <div className="space-y-4">
                             {pastSessions.map(session => (
                                <div key={session.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white rounded-[2rem] border-2 border-transparent hover:border-[#1a1b4b]/10 hover:shadow-2xl hover:shadow-indigo-50 transition-all duration-300">
                                   <div className="flex items-center gap-6">
                                       <div className="w-16 h-16 bg-gray-50 rounded-[1.5rem] flex flex-col items-center justify-center border border-gray-100 group-hover:bg-[#1a1b4b] group-hover:text-white transition-all duration-300">
                                            <p className="text-[13px] font-black uppercase opacity-40 leading-none mb-1">{new Date(session.session_date).toLocaleDateString('en-US', { month: 'short' })}</p>
                                            <p className="text-2xl font-black">{new Date(session.session_date).getDate()}</p>
                                       </div>
                                       <div>
                                           <div className="font-black text-[#1a1b4b] text-lg uppercase tracking-tight mb-1">{session.topic || 'General Session'}</div>
                                           <div className="text-[13px] text-gray-400 font-black uppercase tracking-[0.1em] mt-1 flex flex-wrap gap-4 items-center">
                                              <span className="flex items-center gap-1.5"><CalendarIcon size={12} className="text-indigo-400" />{session.session_date}</span>
                                              <span className="flex items-center gap-1.5"><Clock size={12} className="text-indigo-400" />{session.session_time?.substring(0, 5)}</span>
                                              <div className="flex items-center gap-3 ml-2">
                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-500 rounded-lg text-[13px] font-black border border-emerald-100">
                                                   {session.records?.filter(r => r.status === 'present').length} Present
                                                </span>
                                                <span className="px-3 py-1 bg-red-50 text-red-500 rounded-lg text-[13px] font-black border border-red-100">
                                                   {session.records?.filter(r => r.status === 'absent').length} Absent
                                                </span>
                                              </div>
                                           </div>
                                       </div>
                                   </div>
                                   <div className="flex items-center gap-2 mt-6 sm:mt-0">
                                       <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 p-1 group-hover:bg-[#1a1b4b]/5 transition-all">
                                            <button 
                                                onClick={() => handleDownloadSession(session, 'csv')}
                                                className="p-3 text-gray-400 hover:text-[#1a1b4b] hover:bg-white rounded-lg transition-all" 
                                                title="Download CSV"
                                            >
                                                <Download size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDownloadSession(session, 'pdf')}
                                                className="p-3 text-gray-400 hover:text-[#ef4444] hover:bg-white rounded-lg transition-all" 
                                                title="Print PDF"
                                            >
                                                <FileText size={18} />
                                            </button>
                                       </div>
                                       <button 
                                            onClick={() => handleEditSession(session)} 
                                            className="px-8 py-4 bg-white text-[#1a1b4b] font-black text-[13px] uppercase tracking-widest border-2 border-gray-100 rounded-2xl hover:bg-[#1a1b4b] hover:text-white transition-all shadow-md active:scale-95 flex items-center gap-2"
                                       >
                                           <Edit2 size={14} /> Edit Register
                                       </button>
                                   </div>
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
                                    <button onClick={() => handleMarkAll('present')} className="flex-1 sm:flex-none text-[12px] font-black bg-green-50 text-green-700 px-4 py-2.5 rounded-xl uppercase tracking-widest hover:bg-green-100 transition-colors border border-green-200">
                                        Mark All Present
                                    </button>
                                    <button onClick={() => handleMarkAll('absent')} className="flex-1 sm:flex-none text-[12px] font-black bg-red-50 text-red-700 px-4 py-2.5 rounded-xl uppercase tracking-widest hover:bg-red-100 transition-colors border border-red-200">
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
                                        <div className="w-8 h-8 rounded-full bg-[#1a1b4b]/5 flex items-center justify-center text-[12px] font-black text-[#1a1b4b]">
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
