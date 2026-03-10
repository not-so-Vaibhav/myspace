import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchCourses, fetchCourseResources } from '../services/courses';
import { FolderOpen, FileText, Loader2 } from 'lucide-react';

const BUCKET_COURSE_RESOURCES = 'course-resources';

const Resources = () => {
  const { user, profile } = useAuth();
  const role = profile?.role?.toLowerCase();
  const isFaculty = role === 'instructor' || role === 'admin';

  const [coursesWithResources, setCoursesWithResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const courses = await fetchCourses({
          instructorId: isFaculty ? profile?.id : undefined,
          limit: 100,
        });
        if (isFaculty) {
          const withRes = await Promise.all(
            courses.map(async (c) => {
              const res = await fetchCourseResources(c.id);
              return { ...c, resources: res };
            })
          );
          if (!cancelled) setCoursesWithResources(withRes);
        } else {
          const { data: enrollments } = await supabase.from('enrollments').select('course_id').eq('user_id', user?.id);
          const ids = (enrollments || []).map((e) => e.course_id).filter(Boolean);
          const enrolledCourses = courses.filter((c) => ids.includes(c.id));
          const withRes = await Promise.all(
            enrolledCourses.map(async (c) => {
              const res = await fetchCourseResources(c.id);
              return { ...c, resources: res };
            })
          );
          if (!cancelled) setCoursesWithResources(withRes);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load resources');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, profile?.id, isFaculty]);

  const getResourceUrl = (path) => {
    const { data } = supabase.storage.from(BUCKET_COURSE_RESOURCES).getPublicUrl(path);
    return data?.publicUrl;
  };

  if (loading) {
    return (
      <div className="p-6 sm:p-8 flex items-center justify-center min-h-[40vh]">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
          <Loader2 size={24} className="animate-spin" /> Loading resources...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Resources</h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          {isFaculty ? 'Course materials you have uploaded.' : 'Course materials for your enrolled courses.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-[var(--radius-button)] bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
        </div>
      )}

      {coursesWithResources.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border-light)] p-12 text-center">
          <FolderOpen size={48} className="mx-auto text-[var(--color-text-subtle)] mb-4" />
          <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">No resources yet</h2>
          <p className="text-[var(--color-text-muted)] mb-4">
            {isFaculty ? 'Upload files from a course page (Courses → select course → Resources).' : 'Enroll in courses to see resources here.'}
          </p>
          {isFaculty && <Link to="/courses" className="text-[var(--color-primary)] font-medium hover:underline">Go to Courses</Link>}
        </div>
      ) : (
        <div className="space-y-6">
          {coursesWithResources.map((course) => (
            <div key={course.id} className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border-light)] overflow-hidden">
              <div className="p-4 border-b border-[var(--color-border-light)] flex items-center justify-between">
                <h2 className="font-bold text-[var(--color-text)]">{course.title}</h2>
                {isFaculty && (
                  <Link to={`/courses/${course.id}`} className="text-sm text-[var(--color-primary)] font-medium hover:underline">
                    Manage course
                  </Link>
                )}
              </div>
              <ul className="divide-y divide-[var(--color-border-light)]">
                {course.resources?.length === 0 ? (
                  <li className="px-4 py-6 text-center text-[var(--color-text-muted)] text-sm">No files</li>
                ) : (
                  (course.resources || []).map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <FileText size={20} className="text-[var(--color-text-subtle)] flex-shrink-0" />
                      <a href={getResourceUrl(r.storage_path)} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline truncate flex-1">
                        {r.file_name}
                      </a>
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
