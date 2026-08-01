import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { FileText, ExternalLink, Loader2, CheckSquare, Clock, Upload, Trash2, AlertCircle } from 'lucide-react';

const deadlineStatus = (dl) => {
  if (!dl) return null;
  const now = new Date();
  const due = new Date(dl);
  const diffMs = due - now;
  const isPast = diffMs < 0;
  
  if (isPast) return { label: 'Deadline Passed', cls: 'bg-red-100 text-red-600', isPast: true };
  
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 24) return { label: `Due in ${Math.round(diffHours)}h`, cls: 'bg-amber-100 text-amber-600', isPast: false };
  
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return { label: `${Math.ceil(diffDays)}d remaining`, cls: 'bg-green-100 text-green-600', isPast: false };
};

const StudentAssignments = () => {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({}); // material_id -> submission object
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (profile?.id) fetchData();
  }, [profile?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get student enrollments
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('allocation_id');
      
      if (!enrollments?.length) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      const allocIds = enrollments.map(e => e.allocation_id);

      // 2. Get assignments for these allocations
      const { data: assignmentData } = await supabase
        .from('course_materials')
        .select('*, allocation:subject_allocations(banner_url, subject:subjects(name,code), batch:batches(name))')
        .in('allocation_id', allocIds)
        .eq('type', 'Assignment')
        .order('created_at', { ascending: false });

      setAssignments(assignmentData || []);

      // 3. Get student's existing submissions
      const { data: submissionData } = await supabase
        .from('student_submissions')
        .select('*')
        .eq('student_id', profile.id);

      const subMap = {};
      submissionData?.forEach(s => {
        subMap[s.material_id] = s;
      });
      setSubmissions(subMap);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (materialId, file) => {
    if (!file) return;
    setSubmittingId(materialId);
    setError('');

    try {
      // 1. Check deadline again (frontend check)
      const assignment = assignments.find(a => a.id === materialId);
      if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
        throw new Error('Deadline has passed. Cannot submit.');
      }

      // 2. Upload file to 'submissions' bucket
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const path = `${materialId}/${profile.id}/${fileName}`;
      
      const { error: uploadErr } = await supabase.storage
        .from('submissions')
        .upload(path, file);
      
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(path);

      const fileUrl = urlData.publicUrl;

      // 3. Create record in student_submissions table
      const { data: submission, error: subErr } = await supabase
        .from('student_submissions')
        .upsert({
          material_id: materialId,
          student_id: profile.id,
          file_url: fileUrl,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (subErr) throw subErr;

      setSubmissions(prev => ({ ...prev, [materialId]: submission }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleUnsubmit = async (materialId) => {
    const sub = submissions[materialId];
    if (!sub) return;

    if (!window.confirm('Are you sure you want to unsubmit? You can resubmit before the deadline.')) return;

    setSubmittingId(materialId);
    try {
      // 1. Check deadline
      const assignment = assignments.find(a => a.id === materialId);
      if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
        throw new Error('Deadline has passed. Cannot unsubmit.');
      }

      // 2. Delete record
      const { error: delErr } = await supabase
        .from('student_submissions')
        .delete()
        .eq('id', sub.id);

      if (delErr) throw delErr;

      setSubmissions(prev => {
        const next = { ...prev };
        delete next[materialId];
        return next;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) return (
    <div className="p-12 flex items-center justify-center">
      <Loader2 className="animate-spin w-6 h-6 text-[#1a1b4b] mr-3" />
      <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Syncing Assignments...</span>
    </div>
  );

  return (
    <div className="p-8 sm:p-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">My Assignments</h1>
        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
          Upload and Manage Your Subject Submissions
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
          <AlertCircle size={18} />
          <p className="text-xs font-bold leading-none uppercase tracking-widest">{error}</p>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-16 text-center shadow-sm">
          <FileText className="w-12 h-12 text-gray-100 mx-auto mb-4" />
          <h3 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tighter">No Assignments Found</h3>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-2">You don't have any pending assignments for your enrolled courses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {assignments.map(assignment => {
            const status = deadlineStatus(assignment.deadline);
            const submission = submissions[assignment.id];
            const isSubmitting = submittingId === assignment.id;
            const isOpen = expandedId === assignment.id;
            
            return (
              <div key={assignment.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-lg group">
                {/* Cover Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  {assignment.allocation?.banner_url ? (
                    <img src={assignment.allocation.banner_url} alt={assignment.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                      <CheckSquare className="w-12 h-12 text-indigo-100" />
                    </div>
                  )}
                  {submission && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full shadow-lg">
                      <CheckSquare size={16} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col gap-4">
                  <div>
                    <h3 className="text-xl font-black text-[#1a1b4b] tracking-tight mb-4">{assignment.title}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Subject</span>
                        <span className="text-[#1a1b4b] truncate max-w-[150px]">{assignment.allocation?.subject?.name}</span>
                      </div>
                      <div className="flex justify-between text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Class Code</span>
                        <span className="text-indigo-600 font-black">{assignment.allocation?.subject?.code}</span>
                      </div>
                      <div className="flex justify-between text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Due</span>
                        <span className={`font-bold ${status.isPast ? 'text-red-500' : 'text-gray-500'}`}>{status.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-50 mt-auto flex items-center justify-between">
                     <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${submission ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {submission ? 'Submitted' : 'Pending'}
                     </span>
                     <button
                        onClick={() => setExpandedId(assignment.id)}
                        className="bg-[#1a1b4b] text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
                     >
                        View Details
                     </button>
                  </div>
                </div>

                {/* Assignment Modal */}
                {isOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1b4b]/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                      <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div>
                          <h3 className="text-xl font-black text-[#1a1b4b] tracking-tight">{assignment.title}</h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Assignment Submission & Brief</p>
                        </div>
                        <button onClick={() => setExpandedId(null)} className="w-10 h-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                          <CheckSquare className="rotate-45" size={20} />
                        </button>
                      </div>
                      
                      <div className="p-8 overflow-y-auto space-y-8">
                        {/* Info Section */}
                        <div className="flex flex-col sm:flex-row gap-6">
                           <div className="flex-1 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                  <span className={`text-xs font-black uppercase tracking-widest ${submission ? 'text-green-600' : 'text-amber-600'}`}>{submission ? 'Turned In' : 'Missing'}</span>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Due Date</p>
                                  <span className="text-xs font-black text-[#1a1b4b] uppercase tracking-widest">{new Date(assignment.deadline).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</span>
                                </div>
                              </div>
                              {assignment.file_url && (
                                <a href={assignment.file_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 w-full p-4 bg-indigo-50 text-indigo-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all">
                                  <FileText size={16} /> Download Assignment Brief
                                </a>
                              )}
                           </div>

                           <div className="sm:w-64">
                              {submission ? (
                                <div className="space-y-4">
                                   <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-center">
                                      <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">My Submission</p>
                                      <a href={submission.file_url} target="_blank" rel="noreferrer" className="inline-block mb-3 p-3 bg-white rounded-xl text-green-600 shadow-sm"><FileText size={20} /></a>
                                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">{new Date(submission.submitted_at).toLocaleDateString('en-IN')}</p>
                                   </div>
                                   {!status.isPast && (
                                     <button onClick={() => handleUnsubmit(assignment.id)} className="w-full p-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                                       {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Unsubmit
                                     </button>
                                   )}
                                </div>
                              ) : (
                                <div>
                                  {status.isPast ? (
                                    <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
                                      <AlertCircle size={20} className="text-gray-300 mx-auto mb-2" />
                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Locked</p>
                                    </div>
                                  ) : (
                                    <div>
                                      <input type="file" id={`modal-file-${assignment.id}`} className="hidden" onChange={(e) => handleUpload(assignment.id, e.target.files[0])} />
                                      <label htmlFor={`modal-file-${assignment.id}`} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-100 rounded-2xl cursor-pointer hover:bg-indigo-50 transition-all group">
                                         {isSubmitting ? (
                                           <Loader2 size={24} className="animate-spin text-indigo-600" />
                                         ) : (
                                           <>
                                             <Upload size={24} className="text-indigo-300 group-hover:text-indigo-600 mb-2" />
                                             <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Turn In Work</span>
                                           </>
                                         )}
                                      </label>
                                    </div>
                                  )}
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
