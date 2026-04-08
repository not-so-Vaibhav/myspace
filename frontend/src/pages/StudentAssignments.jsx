import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
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
        .select('*, allocation:subject_allocations(subject:subjects(name,code), batch:batches(name))')
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
        <div className="grid grid-cols-1 gap-6">
          {assignments.map(assignment => {
            const status = deadlineStatus(assignment.deadline);
            const submission = submissions[assignment.id];
            const isSubmitting = submittingId === assignment.id;
            
            return (
              <div key={assignment.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row gap-8">
                
                {/* Left: Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-12 h-12 bg-[#1a1b4b]/5 rounded-2xl flex items-center justify-center shrink-0">
                      <CheckSquare className="w-6 h-6 text-[#1a1b4b]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#1a1b4b] leading-tight">{assignment.title}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        [{assignment.allocation?.subject?.code}] {assignment.allocation?.subject?.name} · Batch {assignment.allocation?.batch?.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 items-center">
                    {assignment.deadline && (
                      <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${status.isPast ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                        <Clock size={14} /> {status.label} 
                        <span className="opacity-50 ml-1">· {new Date(assignment.deadline).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                      </div>
                    )}
                    {assignment.file_url && (
                        <a 
                          href={assignment.file_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-4 py-2 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 hover:bg-indigo-100 transition-colors border border-indigo-100"
                        >
                          <FileText size={14} /> Download Brief
                        </a>
                      )}
                  </div>
                </div>

                {/* Right: Submission Action */}
                <div className="md:w-72 lg:w-80 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center">
                  {submission ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                        <div className="flex items-center gap-2 text-green-700 mb-1">
                          <CheckSquare size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Submitted</span>
                        </div>
                        <p className="text-[9px] text-green-600 font-bold uppercase tracking-widest">
                          {new Date(submission.submitted_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <a 
                          href={submission.file_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex-1 py-3 bg-white border border-gray-200 text-[#1a1b4b] text-[10px] font-black uppercase tracking-widest rounded-xl text-center hover:bg-gray-50 transition-colors"
                        >
                          View Upload
                        </a>
                        {(!status?.isPast) && (
                          <button 
                            onClick={() => handleUnsubmit(assignment.id)}
                            disabled={isSubmitting}
                            className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {status?.isPast ? (
                        <div className="p-6 bg-gray-50 rounded-2xl text-center border border-dashed border-gray-200">
                          <AlertCircle size={24} className="text-gray-300 mx-auto mb-2" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-loose">
                            Submission period expired
                          </p>
                        </div>
                      ) : (
                        <div>
                          <input 
                            type="file" 
                            id={`file-${assignment.id}`}
                            className="hidden"
                            onChange={(e) => handleUpload(assignment.id, e.target.files[0])}
                            disabled={isSubmitting}
                          />
                          <label 
                            htmlFor={`file-${assignment.id}`}
                            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-[2rem] cursor-pointer hover:border-[#1a1b4b]/20 hover:bg-gray-50 transition-all ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            {isSubmitting ? (
                              <Loader2 size={24} className="animate-spin text-[#1a1b4b]" />
                            ) : (
                              <>
                                <Upload size={24} className="text-gray-300 mb-2" />
                                <span className="text-[10px] font-black text-[#1a1b4b] uppercase tracking-widest">Submit Work</span>
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">PDF, DOCX, ZIP</span>
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
