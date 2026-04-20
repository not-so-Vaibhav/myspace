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
            .select('id, subject:subjects(name, code), batch:batches(name)')
            .eq('faculty_id', profile.id);
          
          if (allocData) {
            allocIds = allocData.map(a => a.id);
            allocData.forEach(a => allocationsMap[a.id] = a);
          }
        } else {
          // For students, get their enrollments
          const { data: enrollments } = await supabase
            .from('student_enrollments')
            .select('allocation_id, allocation:subject_allocations(id, subject:subjects(name, code), batch:batches(name))')
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
        <div className="space-y-8">
          {materialsByCourse.map((course) => (
            <div key={course.id} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                      <FolderOpen className="w-6 h-6 text-emerald-500" />
                   </div>
                   <div>
                     <h2 className="text-lg font-black text-[#1a1b4b] tracking-tight">{course.allocation?.subject?.name}</h2>
                     <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        [{course.allocation?.subject?.code}] · Batch {course.allocation?.batch?.name}
                     </p>
                   </div>
                </div>
                {isFaculty && (
                  <Link to={`/faculty-resources`} className="text-[12px] px-4 py-2 bg-white border border-gray-200 text-gray-500 hover:text-[#1a1b4b] rounded-lg font-black uppercase tracking-widest transition-all">
                    Manage
                  </Link>
                )}
              </div>
              <ul className="divide-y divide-gray-100">
                {course.resources?.length === 0 ? (
                  <li className="px-8 py-10 text-center">
                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">No resources uploaded for this batch</p>
                  </li>
                ) : (
                  (course.resources || []).map((r) => (
                    <li key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                         <FileText className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-sm font-black text-[#1a1b4b] truncate">{r.title}</p>
                         <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                         </p>
                      </div>
                      {r.file_url && (
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Resources;
