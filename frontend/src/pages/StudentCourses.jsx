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
            banner_url,
            subject:subjects(id, name, code, credits, type),
            batch:batches(name),
            semester:semesters(term_number),
            faculty:profiles(full_name),
            student_enrollments:student_enrollments(count)
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
            <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Subject Code</label>
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
            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-4">
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
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                          Batch: <span className="text-[#ef4444]">{alloc.batch?.name}</span> · Sem {alloc.semester?.term_number} · Faculty: {alloc.faculty?.full_name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEnroll(alloc.id)}
                      className="px-5 py-2 bg-[#1a1b4b] text-white text-[12px] font-black uppercase tracking-widest rounded-lg hover:bg-[#2d3a8c] transition-colors"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {enrolledCourses.map((enrollment, idx) => {
              const alloc = enrollment.allocation;
              const isOpen = expandedId === enrollment.allocation_id;
              const matList = materials[enrollment.allocation_id] || [];
              
              return (
                <div key={enrollment.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-lg group">
                  {/* Cover Image */}
                  <div className="relative h-48 bg-gray-100 overflow-hidden">
                    {alloc?.banner_url ? (
                      <img src={alloc.banner_url} alt={alloc.subject?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                        <BookOpen className="w-12 h-12 text-indigo-200" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col gap-4">
                    <div>
                      <h3 className="text-lg font-black text-[#1a1b4b] tracking-tight mb-4">{alloc?.subject?.name}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                          <span>Duration</span>
                          <span className="text-[#1a1b4b] font-black">{(idx % 3 === 0) ? '15 hr' : (idx % 3 === 1) ? '16 hr' : '17 hr'}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                          <span>Class Code</span>
                          <span className="text-indigo-600 font-black">{alloc?.subject?.code}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-50 mt-auto flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUnenroll(enrollment.id, enrollment.allocation_id)}
                            className="w-10 h-10 rounded-xl bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all"
                            title="Unenroll"
                          >
                            <Unenroll size={16} />
                          </button>
                          <span className="text-xs font-black bg-gray-50 text-gray-500 px-3 py-1.5 rounded-full uppercase tracking-widest">
                            {matList.length} Materials
                          </span>
                       </div>
                       <button
                          onClick={() => toggleExpand(enrollment.allocation_id)}
                          className="bg-[#1a1b4b] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
                       >
                          Go to Course
                       </button>
                    </div>
                  </div>

                  {/* Material Drawer (Modal style) */}
                  {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1b4b]/40 backdrop-blur-sm">
                      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                          <div>
                            <h3 className="text-xl font-black text-[#1a1b4b] tracking-tight">{alloc?.subject?.name}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Course Materials & Resources</p>
                          </div>
                          <button onClick={() => setExpandedId(null)} className="w-10 h-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                            <Plus className="rotate-45" size={20} />
                          </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto space-y-4">
                          {matList.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                              <FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                              <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">No materials published yet</p>
                            </div>
                          ) : (
                            matList.map(mat => {
                              const ts = typeStyle(mat.type);
                              const Icon = ts.icon;
                              return (
                                <div key={mat.id} className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all group">
                                  <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ts.bg} ${ts.text}`}>
                                      <Icon size={20} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-[#1a1b4b]">{mat.title}</p>
                                      <span className={`text-[10px] font-black uppercase tracking-widest ${ts.text}`}>{mat.type}</span>
                                    </div>
                                  </div>
                                  {mat.file_url && (
                                    <a href={mat.file_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-all">
                                      <ExternalLink size={18} />
                                    </a>
                                  )}
                                </div>
                              );
                            })
                          )}
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
    </div>
  );
};

export default StudentCourses;
