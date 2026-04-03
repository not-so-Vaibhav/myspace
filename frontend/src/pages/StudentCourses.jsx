import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap, Search, BookOpen, FileText, FolderOpen,
  CheckCircle, Loader2, XCircle, ChevronDown, ChevronUp,
  Clock, ExternalLink, LogOut as Unenroll
} from 'lucide-react';

const StudentCourses = () => {
  const { profile } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Enrollment form
  const [courseCode, setCourseCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null); // allocation matches

  // Expanded course panel
  const [expandedId, setExpandedId] = useState(null);
  const [materials, setMaterials] = useState({}); // keyed by allocation_id

  useEffect(() => {
    if (profile?.id) fetchEnrolled();
  }, [profile?.id]);

  const fetchEnrolled = async () => {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('student_enrollments')
        .select(`
          id, enrolled_at, allocation_id,
          allocation:subject_allocations(
            id,
            subject:subjects(id, name, code, credits, type),
            batch:batches(name),
            semester:semesters(term_number),
            faculty:profiles(full_name)
          )
        `)
        .eq('student_id', profile.id)
        .order('enrolled_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setEnrolledCourses(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };
  const showError = (msg) => { setError(msg); setTimeout(() => setError(''), 5000); };

  // Search by subject code
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!courseCode.trim()) return;
    setSearching(true);
    setSearchResult(null);
    setError('');

    try {
      // Find subject by code
      const { data: subjects, error: subErr } = await supabase
        .from('subjects')
        .select('id, name, code, credits, type')
        .ilike('code', courseCode.trim());

      if (subErr) throw subErr;
      if (!subjects || subjects.length === 0) {
        showError(`No subject found with code "${courseCode.toUpperCase()}". Check with your Admin.`);
        setSearching(false);
        return;
      }

      const subject = subjects[0];

      // Find all allocations for this subject (different batches/semesters)
      const { data: allocations, error: allocErr } = await supabase
        .from('subject_allocations')
        .select(`
          id,
          subject:subjects(id, name, code, credits, type),
          batch:batches(name),
          semester:semesters(term_number),
          faculty:profiles(full_name)
        `)
        .eq('subject_id', subject.id);

      if (allocErr) throw allocErr;

      if (!allocations || allocations.length === 0) {
        showError(`Subject "${subject.code}" exists but has no active batch allocations. Contact Admin.`);
        setSearching(false);
        return;
      }

      // Filter out already enrolled
      const enrolledAllocIds = new Set(enrolledCourses.map(e => e.allocation_id));
      const available = allocations.filter(a => !enrolledAllocIds.has(a.id));

      setSearchResult({ subject, allocations: available, allAllocations: allocations });
    } catch (err) {
      showError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleEnroll = async (allocationId) => {
    try {
      const { data, error: enrollErr } = await supabase
        .from('student_enrollments')
        .insert({ student_id: profile.id, allocation_id: allocationId })
        .select(`
          id, enrolled_at, allocation_id,
          allocation:subject_allocations(
            id,
            subject:subjects(id, name, code, credits, type),
            batch:batches(name),
            semester:semesters(term_number),
            faculty:profiles(full_name)
          )
        `)
        .single();

      if (enrollErr) {
        if (enrollErr.code === '23505') {
          showError('You are already enrolled in this course.');
          return;
        }
        throw enrollErr;
      }

      setEnrolledCourses(prev => [data, ...prev]);
      setCourseCode('');
      setSearchResult(null);
      showSuccess(`Successfully enrolled in [${data.allocation?.subject?.code}] ${data.allocation?.subject?.name}!`);
    } catch (err) {
      showError('Enrollment failed: ' + err.message);
    }
  };

  const handleUnenroll = async (enrollmentId, allocId) => {
    if (!window.confirm('Are you sure you want to unenroll from this course?')) return;
    try {
      const { error } = await supabase.from('student_enrollments').delete().eq('id', enrollmentId);
      if (error) throw error;
      setEnrolledCourses(prev => prev.filter(e => e.id !== enrollmentId));
      setMaterials(prev => { const copy = { ...prev }; delete copy[allocId]; return copy; });
      showSuccess('Successfully unenrolled.');
    } catch (err) {
      showError(err.message);
    }
  };

  // Expand/collapse and fetch materials
  const toggleExpand = async (allocId) => {
    if (expandedId === allocId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(allocId);

    if (!materials[allocId]) {
      const { data } = await supabase
        .from('course_materials')
        .select('*')
        .eq('allocation_id', allocId)
        .order('created_at', { ascending: false });
      setMaterials(prev => ({ ...prev, [allocId]: data || [] }));
    }
  };

  const typeStyle = (type) => {
    if (type === 'Module') return { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: BookOpen };
    if (type === 'Assignment') return { bg: 'bg-amber-50', text: 'text-amber-700', icon: FileText };
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: FolderOpen };
  };

  if (loading) return (
    <div className="p-12 flex items-center justify-center">
      <Loader2 className="animate-spin w-6 h-6 text-[#1a1b4b] mr-3" />
      <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Your Courses...</span>
    </div>
  );

  return (
    <div className="p-8 sm:p-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">My Courses</h1>
        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
          Enroll Using Subject Code · {enrolledCourses.length} Course{enrolledCourses.length !== 1 ? 's' : ''} Active
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
          <XCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-xs font-bold text-green-700 flex items-center gap-2">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Enrollment Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight mb-2 flex items-center gap-3">
          <GraduationCap className="w-5 h-5 text-[#ef4444]" />
          Enroll in a Course
        </h2>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
          Enter the Subject Code provided by your faculty or admin (e.g. CSE234)
        </p>

        <form onSubmit={handleSearch} className="flex items-end gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Subject Code</label>
            <div className="relative">
              <input
                type="text"
                value={courseCode}
                onChange={e => setCourseCode(e.target.value.toUpperCase())}
                placeholder="e.g. CSE234"
                className="w-full p-3.5 pl-11 bg-gray-50 rounded-xl border border-gray-200 text-sm font-black text-[#1a1b4b] uppercase outline-none focus:ring-2 focus:ring-[#1a1b4b]/20 focus:border-[#1a1b4b] placeholder:text-gray-300 placeholder:font-bold tracking-widest"
              />
              <Search className="w-4 h-4 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <button
            type="submit"
            disabled={!courseCode.trim() || searching}
            className="px-6 py-3.5 bg-[#1a1b4b] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#2d3a8c] transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Find Course
          </button>
        </form>

        {/* Search Results */}
        {searchResult && (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
              Found: [{searchResult.subject.code}] {searchResult.subject.name} · {searchResult.subject.credits} Credits
            </p>
            {searchResult.allocations.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs font-bold text-amber-700">
                You are already enrolled in all available batches for this course.
              </div>
            ) : (
              <div className="space-y-3">
                {searchResult.allocations.map(alloc => (
                  <div key={alloc.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-[#1a1b4b]" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#1a1b4b]">
                          [{alloc.subject?.code}] {alloc.subject?.name}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                          Batch: <span className="text-[#ef4444]">{alloc.batch?.name}</span> · Sem {alloc.semester?.term_number} · Faculty: {alloc.faculty?.full_name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEnroll(alloc.id)}
                      className="px-5 py-2 bg-[#1a1b4b] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#2d3a8c] transition-colors"
                    >
                      Enroll
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enrolled Courses */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight flex items-center gap-3">
          <span>Active Courses</span>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{enrolledCourses.length}</span>
        </h2>

        {enrolledCourses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
            <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-black text-[#1a1b4b] mb-2">No Courses Yet</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Enter a subject code above to enroll in your first course.
            </p>
          </div>
        ) : (
          enrolledCourses.map(enrollment => {
            const alloc = enrollment.allocation;
            const isOpen = expandedId === enrollment.allocation_id;
            const matList = materials[enrollment.allocation_id] || [];
            const modules = matList.filter(m => m.type === 'Module');
            const resources = matList.filter(m => m.type === 'Resource');
            const assignments = matList.filter(m => m.type === 'Assignment');

            return (
              <div key={enrollment.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleExpand(enrollment.allocation_id)}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-5 text-left">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-[#1a1b4b]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black bg-[#1a1b4b] text-white px-2.5 py-1 rounded-md uppercase tracking-widest">
                          {alloc?.subject?.code}
                        </span>
                        <span className="text-xs font-black text-gray-300 uppercase tracking-widest">
                          Sem {alloc?.semester?.term_number}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-[#1a1b4b] tracking-tight leading-none">{alloc?.subject?.name}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Batch: <span className="text-[#ef4444]">{alloc?.batch?.name}</span> · Faculty: {alloc?.faculty?.full_name} · {alloc?.subject?.credits} CR
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUnenroll(enrollment.id, enrollment.allocation_id); }}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Unenroll"
                    >
                      <Unenroll size={16} />
                    </button>
                    {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 p-6 bg-gray-50/30 space-y-6">

                    {/* Stats */}
                    <div className="flex gap-4">
                      {[
                        { label: 'Modules', count: modules.length, color: 'text-indigo-600 bg-indigo-50' },
                        { label: 'Resources', count: resources.length, color: 'text-emerald-600 bg-emerald-50' },
                        { label: 'Assignments', count: assignments.length, color: 'text-amber-600 bg-amber-50' },
                      ].map(s => (
                        <div key={s.label} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${s.color}`}>
                          {s.count} {s.label}
                        </div>
                      ))}
                    </div>

                    {/* Material List */}
                    {matList.length === 0 ? (
                      <p className="text-center text-xs font-bold text-gray-300 uppercase tracking-widest py-8">
                        No materials published by faculty yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {matList.map(mat => {
                          const ts = typeStyle(mat.type);
                          const Icon = ts.icon;
                          const isOverdue = mat.deadline && new Date(mat.deadline) < new Date();

                          return (
                            <div key={mat.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 group">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 ${ts.bg} rounded-lg flex items-center justify-center shrink-0`}>
                                  <Icon className={`w-4 h-4 ${ts.text}`} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-[#1a1b4b]">{mat.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${ts.bg} ${ts.text}`}>{mat.type}</span>
                                    {mat.deadline && (
                                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        <Clock size={9} />
                                        {isOverdue ? 'Overdue' : `Due: ${new Date(mat.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {mat.file_url && (
                                <a href={mat.file_url} target="_blank" rel="noreferrer" className="p-2 text-gray-300 hover:text-[#1a1b4b] hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                  <ExternalLink size={15} />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StudentCourses;
