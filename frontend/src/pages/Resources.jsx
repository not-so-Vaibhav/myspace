import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { FolderOpen, FileText, Loader2, BookOpen, ExternalLink } from 'lucide-react';

const Resources = () => {
  const { profile } = useAuth();
  const role = profile?.role?.toLowerCase();
  const isFaculty = role === 'faculty' || role === 'instructor' || role === 'hod' || role === 'admin';

  const [materialsByCourse, setMaterialsByCourse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        if (!profile?.id) return;

        let allocIds = [];
        let allocationsMap = {};

        if (isFaculty) {
          // For faculty, get all their allocations
          const { data: allocData } = await supabase
            .from('subject_allocations')
            .select('id, banner_url, subject:subjects(name, code), batch:batches(name)')
            .eq('faculty_id', profile.id);
          
          if (allocData) {
            allocIds = allocData.map(a => a.id);
            allocData.forEach(a => allocationsMap[a.id] = a);
          }
        } else {
          // For students, get their enrollments
          const { data: enrollments } = await supabase
            .from('student_enrollments')
            .select('allocation_id, allocation:subject_allocations(id, banner_url, subject:subjects(name, code), batch:batches(name))')
            .eq('student_id', profile.id);

          if (enrollments) {
            allocIds = enrollments.map(e => e.allocation_id);
            enrollments.forEach(e => allocationsMap[e.allocation_id] = e.allocation);
          }
        }

        if (allocIds.length > 0) {
          const { data: matData, error: matErr } = await supabase
            .from('course_materials')
            .select('*')
            .in('allocation_id', allocIds)
            .in('type', ['Resource'])
            .order('created_at', { ascending: false });

          if (matErr) throw matErr;

          // Group by allocation
          const grouped = {};
          (matData || []).forEach(mat => {
            if (!grouped[mat.allocation_id]) grouped[mat.allocation_id] = [];
            grouped[mat.allocation_id].push(mat);
          });

          const coursesWithRes = Object.keys(allocationsMap).map(allocId => ({
            id: allocId,
            allocation: allocationsMap[allocId],
            resources: grouped[allocId] || []
          })).filter(c => c.resources.length > 0 || isFaculty); // Only show courses with resources to students

          if (!cancelled) setMaterialsByCourse(coursesWithRes);
        } else {
          if (!cancelled) setMaterialsByCourse([]);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load resources');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.id, isFaculty]);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin w-8 h-8 text-[#1a1b4b] mr-3" />
        <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Loading Resources...</span>
      </div>
    );
  }

  return (
    <div className="p-8 sm:p-12 space-y-8 bg-[#fcfdfe] min-h-screen">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
            Course Resources
          </h1>
          <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
            {isFaculty ? 'Manage Published Study Materials' : 'Access Your Course Materials'}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-bold uppercase tracking-widest">
          {error}
        </div>
      )}

      {materialsByCourse.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-16 text-center shadow-sm">
          <FolderOpen className="w-16 h-16 text-emerald-200 mx-auto mb-6" />
          <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight mb-2">No resources available</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 leading-relaxed max-w-md mx-auto">
            {isFaculty 
              ? 'You have not uploaded any resources yet. Head to your Faculty Dashboard to publish materials.' 
              : 'Your faculty have not uploaded any study materials for your enrolled courses yet.'}
          </p>
          {isFaculty ? (
             <Link to="/faculty-resources" className="inline-flex py-3 px-6 bg-[#1a1b4b] text-white rounded-xl font-black text-[12px] uppercase tracking-widest hover:bg-slate-800 transition-all">Go to Faculty Resources</Link>
          ) : (
             <Link to="/student-courses" className="inline-flex py-3 px-6 bg-emerald-500 text-white rounded-xl font-black text-[12px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100">Browse Courses</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {materialsByCourse.map((course) => {
            const isOpen = expandedId === course.id;
            
            return (
              <div key={course.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-lg group">
                {/* Cover Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  {course.allocation?.banner_url ? (
                    <img src={course.allocation.banner_url} alt={course.allocation.subject?.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-50">
                      <FolderOpen className="w-12 h-12 text-emerald-100" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col gap-4">
                  <div>
                    <h3 className="text-xl font-black text-[#1a1b4b] tracking-tight mb-4">{course.allocation?.subject?.name}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Duration (HH:MM:SS)</span>
                        <span className="text-[#1a1b4b]">0:0:0</span>
                      </div>
                      <div className="flex justify-between text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Class Code</span>
                        <span className="text-emerald-600 font-black">{course.allocation?.subject?.code}</span>
                      </div>
                      <div className="flex justify-between text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Batch</span>
                        <span className="text-gray-500 font-bold">{course.allocation?.batch?.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-50 mt-auto flex items-center justify-between">
                     <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-3 py-1 rounded-full uppercase tracking-widest">
                        {course.resources?.length} Resources
                     </span>
                     <button
                        onClick={() => setExpandedId(course.id)}
                        className="bg-[#1a1b4b] text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
                     >
                        View Resources
                     </button>
                  </div>
                </div>

                {/* Resources Modal */}
                {isOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1b4b]/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                      <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div>
                          <h3 className="text-xl font-black text-[#1a1b4b] tracking-tight">{course.allocation?.subject?.name}</h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Study Materials & Notes</p>
                        </div>
                        <button onClick={() => setExpandedId(null)} className="w-10 h-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                          <BookOpen className="rotate-45" size={20} />
                        </button>
                      </div>
                      
                      <div className="p-8 overflow-y-auto space-y-4">
                        {course.resources?.length === 0 ? (
                          <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                            <FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">No resources uploaded yet</p>
                          </div>
                        ) : (
                          course.resources.map(res => (
                            <div key={res.id} className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all group">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-50 text-gray-400">
                                  <FileText size={20} />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-[#1a1b4b]">{res.title}</p>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">
                                    {new Date(res.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </p>
                                </div>
                              </div>
                              {res.file_url && (
                                <a href={res.file_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-all">
                                  <ExternalLink size={18} />
                                </a>
                              )}
                            </div>
                          ))
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
  );
};

export default Resources;
