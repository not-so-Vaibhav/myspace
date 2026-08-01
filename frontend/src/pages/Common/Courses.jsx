import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  fetchCourses,
  enrollStudent,
  unenrollStudent,
  checkEnrolled,
  getCourseProgress,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
} from '../../services/courses';
import {
  GraduationCap,
  Plus,
  BookOpen,
  Loader2,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  DollarSign,
  CheckCircle
} from 'lucide-react';

const Courses = () => {
  const { user, profile } = useAuth();
  const role = profile?.role?.toLowerCase();
  const isFaculty = role === 'instructor' || role === 'faculty' || role === 'admin' || role === 'hod';
  const canCreate = role === 'admin' || role === 'hod'; // Only system admins/heads can manually create. Faculty receives automated ERP push.

  const [courses, setCourses] = useState([]);
  const [enrolledSet, setEnrolledSet] = useState(new Set());
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      // Students only see published courses
      let list = await fetchCourses({
        instructorId: isFaculty ? profile?.id : undefined,
        publishedOnly: !isFaculty,
        limit: 100
      });

      // AUTO-SYNC ERP ALLOCATIONS -> LMS WORKSPACES FOR FACULTY (THE BRIDGE)
      if (isFaculty && profile?.id) {
          const { data: allocations, error: allocError } = await supabase
              .from('subject_allocations')
              .select('id, subject:subjects(name, code), batch:batches(name), semester:semesters(term_number)')
              .eq('faculty_id', profile.id);

          if (!allocError && allocations?.length > 0) {
              let needRefetch = false;

              for (const alloc of allocations) {
                  // Format a unique LMS title bridging the ERP subject and the target batch
                  const lmsTitle = `[${alloc.subject.code}] ${alloc.subject.name} - ${alloc.batch.name}`;
                  
                  const exists = list.find(c => c.title === lmsTitle);
                  
                  if (!exists) {
                      // Seamlessly initialize the LMS Workspace so they can upload modules/assignments
                      try {
                          await createCourse(user.id, {
                              title: lmsTitle,
                              description: `Mapped ERP Curriculum for Semester ${alloc.semester.term_number}. Contains all Modules, Resources, and Assignments for Batch ${alloc.batch.name}.`,
                              is_published: false
                          });
                          needRefetch = true;
                      } catch (err) {
                          console.warn("Auto-map generation bypassed or failed:", err);
                      }
                  }
              }

              if (needRefetch) {
                  list = await fetchCourses({ instructorId: user.id, limit: 100 });
              }
          }
      }

      setCourses(list);

      if (user && !isFaculty) {
        const enrolled = new Set();
        const progress = {};
        for (const c of list) {
          const ok = await checkEnrolled(user.id, c.id);
          if (ok) enrolled.add(c.id);
          const p = await getCourseProgress(user.id, c.id);
          progress[c.id] = p;
        }
        setEnrolledSet(enrolled);
        setProgressMap(progress);
      }
    } catch (e) {
      setError(e.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id, profile?.id, isFaculty]);

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleEnroll = async (courseId, price) => {
    if (!user) return;
    setActionLoading(courseId);
    setError(null);
    try {
      // For paid courses, enrollment would need payment integration
      // For now, we'll set status to 'pending' for paid courses
      const paymentStatus = price > 0 ? 'pending' : 'free';

      await enrollStudent(user.id, courseId, paymentStatus);
      setEnrolledSet((s) => new Set([...s, courseId]));
      const p = await getCourseProgress(user.id, courseId);
      setProgressMap((m) => ({ ...m, [courseId]: p }));

      if (price > 0) {
        showSuccess('Enrollment pending payment. Please complete payment to access the course.');
      } else {
        showSuccess('Successfully enrolled in course!');
      }
    } catch (e) {
      setError(e.message || 'Enrollment failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnenroll = async (courseId) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to unenroll from this course?')) return;

    setActionLoading(courseId);
    setError(null);
    try {
      await unenrollStudent(user.id, courseId);
      setEnrolledSet((s) => { const n = new Set(s); n.delete(courseId); return n; });
      setProgressMap((m) => ({ ...m, [courseId]: { percent: 0, completed: 0, total: 0, lastActivity: null } }));
      showSuccess('Successfully unenrolled from course.');
    } catch (e) {
      setError(e.message || 'Unenroll failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateCourse = async () => {
    setError(null);

    // Simple dialog for course creation
    const title = window.prompt('Course title:');
    if (!title?.trim()) return;

    const description = window.prompt('Course description (optional):') || '';
    const priceStr = window.prompt('Course price (enter 0 for free):') || '0';
    const price = parseFloat(priceStr);

    if (isNaN(price) || price < 0) {
      setError('Invalid price. Please enter a valid number.');
      return;
    }

    const isPublished = window.confirm('Publish course immediately?');

    setLoading(true);
    try {
      // CRITICAL FIX: Use user.id instead of profile.id
      // user.id matches auth.uid() in database
      const id = await createCourse(user.id, {
        title: title.trim(),
        description: description.trim(),
        price,
        is_published: isPublished
      });
      await load();
      showSuccess('Course created successfully!');
      // Navigate to course detail page
      setTimeout(() => {
        window.location.href = `/courses/${id}`;
      }, 500);
    } catch (e) {
      setError(e.message || 'Create course failed');
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId, courseTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(courseId);
    setError(null);
    try {
      await deleteCourse(courseId, user.id);
      setCourses((prev) => prev.filter(c => c.id !== courseId));
      showSuccess('Course deleted successfully.');
    } catch (e) {
      setError(e.message || 'Delete course failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePublish = async (courseId, currentStatus) => {
    setActionLoading(courseId);
    setError(null);
    try {
      const newStatus = !currentStatus;
      await publishCourse(courseId, user.id, newStatus);
      setCourses((prev) => prev.map(c =>
        c.id === courseId ? { ...c, is_published: newStatus } : c
      ));
      showSuccess(`Course ${newStatus ? 'published' : 'unpublished'} successfully.`);
    } catch (e) {
      setError(e.message || 'Failed to update course status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditCourse = async (course) => {
    const title = window.prompt('Course title:', course.title);
    if (title === null) return; // User cancelled

    const description = window.prompt('Course description:', course.description || '');
    if (description === null) return;

    const priceStr = window.prompt('Course price:', course.price?.toString() || '0');
    if (priceStr === null) return;

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      setError('Invalid price. Please enter a valid number.');
      return;
    }

    setActionLoading(course.id);
    setError(null);
    try {
      await updateCourse(course.id, user.id, {
        title: title.trim(),
        description: description.trim(),
        price
      });
      setCourses((prev) => prev.map(c =>
        c.id === course.id
          ? { ...c, title: title.trim(), description: description.trim(), price }
          : c
      ));
      showSuccess('Course updated successfully.');
    } catch (e) {
      setError(e.message || 'Update course failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 sm:p-8 flex items-center justify-center min-h-[40vh]">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
          <Loader2 size={24} className="animate-spin" /> Loading courses...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {isFaculty ? 'My Courses' : 'Courses'}
          </h1>
          <p className="text-[var(--color-text-muted)] mt-1">
            {isFaculty
              ? 'Manage modules, lessons, and resources for your assigned curriculum.'
              : 'Browse and enroll in published courses.'}
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={handleCreateCourse}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-button)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={18} /> Create Course
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-[var(--radius-button)] bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-[var(--radius-button)] bg-green-50 text-green-700 border border-green-100 text-sm flex items-center gap-2">
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border-light)] p-12 text-center">
          <GraduationCap size={48} className="mx-auto text-[var(--color-text-subtle)] mb-4" />
          <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">No active mapping</h2>
          <p className="text-[var(--color-text-muted)] mt-2">
            {canCreate 
                ? 'Create a course to begin structuring your module ecosystem.' 
                : isFaculty 
                    ? 'You have no curriculum explicitly mapped to you right now. Speak with your HOD or Admin.' 
                    : 'No courses are available to enroll yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const enrolled = enrolledSet.has(course.id);
            const progress = progressMap[course.id];
            const busy = actionLoading === course.id;
            const isFree = !course.price || course.price === 0;
            const isPublished = course.is_published;

            return (
              <div
                key={course.id}
                className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] overflow-hidden card-hover flex flex-col"
              >
                <Link to={`/courses/${course.id}`} className="block p-6 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                      <BookOpen size={24} />
                    </div>
                    {isFaculty && (
                      <span className={`text-xs px-2 py-1 rounded-full ${isPublished
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                        }`}>
                        {isPublished ? 'Published' : 'Draft'}
                      </span>
                    )}
                  </div>

                  <h2 className="font-bold text-[var(--color-text)] mb-1 truncate">{course.title}</h2>
                  <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-3">
                    {course.description || 'No description'}
                  </p>

                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {isFree ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      <span className="text-[var(--color-primary)] flex items-center gap-1">
                        <DollarSign size={16} />
                        {course.price}
                      </span>
                    )}
                  </div>

                  {!isFaculty && progress && (
                    <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                      <span>Progress: {progress.percent}%</span>
                      {progress.lastActivity && (
                        <span>Last: {new Date(progress.lastActivity).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                </Link>

                {/* Faculty Actions */}
                {isFaculty && (
                  <div className="px-6 pb-6 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditCourse(course)}
                      disabled={busy}
                      className="flex-1 py-2 px-3 rounded-[var(--radius-button)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm font-medium hover:bg-[var(--color-primary)]/20 disabled:opacity-50 flex items-center justify-center gap-1"
                      title="Edit course"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(course.id, isPublished)}
                      disabled={busy}
                      className="py-2 px-3 rounded-[var(--radius-button)] bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                      title={isPublished ? 'Unpublish' : 'Publish'}
                    >
                      {isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCourse(course.id, course.title)}
                      disabled={busy}
                      className="py-2 px-3 rounded-[var(--radius-button)] bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                      title="Delete course"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                {/* Student Actions */}
                {!isFaculty && (
                  <div className="px-6 pb-6">
                    {enrolled ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-primary)] font-medium flex items-center gap-1">
                          <CheckCircle size={16} />
                          Enrolled
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUnenroll(course.id)}
                          disabled={busy}
                          className="text-sm text-[var(--color-text-muted)] hover:text-red-600 disabled:opacity-50"
                        >
                          Unenroll
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEnroll(course.id, course.price)}
                        disabled={busy}
                        className={`w-full py-2.5 rounded-[var(--radius-button)] font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${isFree
                          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20'
                          : 'bg-[var(--color-primary)] text-white hover:opacity-90'
                          }`}
                      >
                        {busy ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <>
                            {isFree ? 'Enroll Now' : 'Buy Now'}
                            {!isFree && <DollarSign size={16} />}
                          </>
                        )}
                      </button>
                    )}
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

export default Courses;
