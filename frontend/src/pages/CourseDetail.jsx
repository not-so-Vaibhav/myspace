import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  fetchCourseById,
  fetchModulesByCourseId,
  fetchLessonsByModuleId,
  checkEnrolled,
  enrollStudent,
  getCourseProgress,
  fetchCompletedLessonIds,
  markLessonComplete,
  createModule,
  createLesson,
  fetchCourseResources,
  getEnrolledCount,
} from '../services/courses';
import { fetchAssignmentsByCourseId, deleteAssignment } from '../services/assignments';
import { ArrowLeft, BookOpen, CheckCircle, Circle, Plus, Loader2, FileText, Upload, ClipboardList, Trash2, Calendar } from 'lucide-react';

const BUCKET_COURSE_RESOURCES = 'course-resources';

const CourseDetail = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const role = profile?.role?.toLowerCase();
  const isFaculty = role === 'instructor' || role === 'admin';

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessonsByModule, setLessonsByModule] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [enrolled, setEnrolled] = useState(false);
  const [progress, setProgress] = useState(null);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [resources, setResources] = useState([]);
  const [enrolledCount, setEnrolledCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Tab State
  const [activeTab, setActiveTab] = useState('modules'); // 'modules', 'assignments', 'resources'

  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [addingModule, setAddingModule] = useState(false);
  const [addingLessonModuleId, setAddingLessonModuleId] = useState(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const c = await fetchCourseById(id);
      setCourse(c);
      if (c.instructor_id !== profile?.id && !isFaculty) {
        const ok = await checkEnrolled(user?.id, id);
        setEnrolled(ok);
      }
      if (isFaculty) {
        setEnrolled(true);
        const count = await getEnrolledCount(id);
        setEnrolledCount(count);
      }

      // Load Modules
      const mods = await fetchModulesByCourseId(id);
      setModules(mods);
      const byModule = {};
      for (const m of mods) {
        const lessons = await fetchLessonsByModuleId(m.id);
        byModule[m.id] = lessons;
      }
      setLessonsByModule(byModule);

      // Load Assignments
      const assigns = await fetchAssignmentsByCourseId(id);
      setAssignments(assigns);

      // Load Progress (Students)
      if (user && !isFaculty) {
        const p = await getCourseProgress(user.id, id);
        setProgress(p);
        const ids = await fetchCompletedLessonIds(user.id, id);
        setCompletedIds(ids);
      }

      // Load Resources
      try {
        const res = await fetchCourseResources(id);
        setResources(res);
      } catch {
        setResources([]);
      }
    } catch (e) {
      setError(e.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, user?.id, profile?.id]);

  const handleEnroll = async () => {
    if (!user) return;
    setActionLoading('enroll');
    setError(null);
    try {
      await enrollStudent(user.id, id);
      setEnrolled(true);
      const p = await getCourseProgress(user.id, id);
      setProgress(p);
    } catch (e) {
      setError(e.message || 'Enrollment failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkComplete = async (lessonId) => {
    if (!user) return;
    setActionLoading(lessonId);
    setError(null);
    try {
      await markLessonComplete(user.id, lessonId);
      setCompletedIds((s) => new Set([...s, lessonId]));
      const p = await getCourseProgress(user.id, id);
      setProgress(p);
    } catch (e) {
      setError(e.message || 'Failed to update progress');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAssignment = async (assignId) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await deleteAssignment(assignId);
      setAssignments(assignments.filter(a => a.id !== assignId));
    } catch (e) {
      alert(e.message);
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;
    try {
      await createModule(id, newModuleTitle.trim(), modules.length);
      setNewModuleTitle('');
      setAddingModule(false);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to add module');
    }
  };

  const handleAddLesson = async (e, moduleId) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;
    try {
      const lessons = lessonsByModule[moduleId] || [];
      await createLesson(moduleId, newLessonTitle.trim(), null, null, lessons.length);
      setNewLessonTitle('');
      setAddingLessonModuleId(null);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to add lesson');
    }
  };

  const handleUploadResource = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const path = `${id}/${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from(BUCKET_COURSE_RESOURCES).upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('course_resources').insert({
        course_id: parseInt(id),
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        uploaded_by: user.id,
      });
      if (insErr) throw insErr;
      await load();
    } catch (e) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const getResourceUrl = (resource) => {
    const { data } = supabase.storage.from(BUCKET_COURSE_RESOURCES).getPublicUrl(resource.storage_path);
    return data?.publicUrl;
  };

  if (loading) {
    return (
      <div className="p-6 sm:p-8 flex items-center justify-center min-h-[40vh]">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
          <Loader2 size={24} className="animate-spin" /> Loading...
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="p-6 sm:p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/courses" className="text-[var(--color-primary)] font-medium hover:underline inline-flex items-center gap-2">
          <ArrowLeft size={18} /> Back to courses
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto">
      <Link to="/courses" className="inline-flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-6">
        <ArrowLeft size={18} /> Back to courses
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">{course?.title}</h1>
          <p className="text-[var(--color-text-muted)] mt-2 max-w-2xl">{course?.description || 'No description'}</p>
          {!isFaculty && progress && (
            <div className="mt-4 flex items-center gap-4">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--color-primary)]" style={{ width: `${progress.percent}%` }}></div>
              </div>
              <p className="text-sm font-medium text-[var(--color-text)]">{progress.percent}% Complete</p>
            </div>
          )}
        </div>
        {!isFaculty && !enrolled && user && (
          <button
            type="button"
            onClick={handleEnroll}
            disabled={actionLoading === 'enroll'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-button)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50 shadow-sm"
          >
            {actionLoading === 'enroll' ? <Loader2 size={18} className="animate-spin" /> : 'Enroll Now'}
          </button>
        )}
      </div>

      {!enrolled && !isFaculty ? (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border-light)] p-12 text-center max-w-2xl mx-auto mt-12">
          <BookOpen className="mx-auto text-[var(--color-text-muted)] mb-4" size={48} />
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">Join this Course</h2>
          <p className="text-[var(--color-text-muted)] mb-6">Enroll to access all modules, assignments, and resources.</p>
          <button type="button" onClick={handleEnroll} disabled={actionLoading === 'enroll'} className="px-8 py-3 bg-[var(--color-primary)] text-white rounded-[var(--radius-button)] font-medium hover:opacity-90">
            Enroll Now
          </button>
        </div>
      ) : (
        <>
          {/* TABS Navigation */}
          <div className="border-b border-[var(--color-border-light)] mb-8">
            <nav className="flex gap-8">
              <button
                onClick={() => setActiveTab('modules')}
                className={`pb-4 px-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'modules' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
              >
                <BookOpen size={18} /> Modules
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`pb-4 px-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'assignments' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
              >
                <ClipboardList size={18} /> Assignments
                <span className="bg-[var(--color-surface-muted)] text-[var(--color-text)] px-2 py-0.5 rounded-full text-xs">{assignments.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`pb-4 px-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'resources' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
              >
                <FileText size={18} /> Resources
                <span className="bg-[var(--color-surface-muted)] text-[var(--color-text)] px-2 py-0.5 rounded-full text-xs">{resources.length}</span>
              </button>
            </nav>
          </div>

          {/* TAB CONTENT: MODULES */}
          {activeTab === 'modules' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[var(--color-text)]">Course Content</h2>
                {isFaculty && (
                  !addingModule ? (
                    <button
                      onClick={() => setAddingModule(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-primary)] bg-[var(--color-surface-muted)] rounded-[var(--radius-button)] hover:bg-[var(--color-surface-hover)]"
                    >
                      <Plus size={16} /> New Module
                    </button>
                  ) : null
                )}
              </div>

              {isFaculty && addingModule && (
                <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-button)] border border-[var(--color-border)] mb-6">
                  <form onSubmit={handleAddModule} className="flex gap-3">
                    <input
                      type="text"
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      placeholder="Module title..."
                      className="flex-1 px-4 py-2 rounded-[var(--radius-button)] border border-[var(--color-border)]"
                      autoFocus
                    />
                    <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-[var(--radius-button)] font-medium">Add</button>
                    <button type="button" onClick={() => setAddingModule(false)} className="px-4 py-2 text-[var(--color-text-muted)]">Cancel</button>
                  </form>
                </div>
              )}

              {modules.length === 0 ? (
                <div className="text-center py-12 bg-[var(--color-surface-muted)] rounded-[var(--radius-card)]">
                  <p className="text-[var(--color-text-muted)]">No modules added yet.</p>
                </div>
              ) : (
                modules.map((mod) => (
                  <div key={mod.id} className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border-light)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-border-light)] flex items-center justify-between bg-gray-50/50">
                      <h3 className="font-bold text-[var(--color-text)]">{mod.title}</h3>
                      {isFaculty && (
                        <button
                          onClick={() => setAddingLessonModuleId(addingLessonModuleId === mod.id ? null : mod.id)}
                          className="text-xs font-medium text-[var(--color-primary)] hover:underline flex items-center gap-1"
                        >
                          <Plus size={14} /> Add Lesson
                        </button>
                      )}
                    </div>
                    <ul className="divide-y divide-[var(--color-border-light)]">
                      {(lessonsByModule[mod.id] || []).map((lesson) => {
                        const done = completedIds.has(lesson.id);
                        return (
                          <li key={lesson.id} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-hover)] transition-colors">
                            <div className="flex items-center gap-3">
                              {!isFaculty ? (
                                <button
                                  onClick={() => handleMarkComplete(lesson.id)}
                                  className={`text-[var(--color-primary)] ${done ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
                                >
                                  {done ? <CheckCircle size={20} /> : <Circle size={20} />}
                                </button>
                              ) : (
                                <FileText size={18} className="text-gray-400" />
                              )}
                              <span className={done ? 'line-through text-gray-400' : ''}>{lesson.title}</span>
                            </div>
                          </li>
                        );
                      })}
                      {addingLessonModuleId === mod.id && (
                        <li className="px-4 py-3 bg-gray-50">
                          <form onSubmit={(e) => handleAddLesson(e, mod.id)} className="flex gap-2">
                            <input
                              type="text"
                              value={newLessonTitle}
                              onChange={(e) => setNewLessonTitle(e.target.value)}
                              placeholder="Lesson title..."
                              className="flex-1 px-3 py-2 text-sm rounded-[var(--radius-button)] border border-[var(--color-border)]"
                              autoFocus
                            />
                            <button type="submit" className="px-3 py-2 bg-[var(--color-primary)] text-white text-sm rounded-[var(--radius-button)]">Add</button>
                            <button type="button" onClick={() => setAddingLessonModuleId(null)} className="px-3 py-2 text-sm text-[var(--color-text-muted)]">Cancel</button>
                          </form>
                        </li>
                      )}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB CONTENT: ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[var(--color-text)]">Assignments & Quizzes</h2>
                {isFaculty && (
                  <Link
                    to={`/courses/${id}/assignments/create`}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-[var(--radius-button)] hover:opacity-90"
                  >
                    <Plus size={16} /> Create Assignment
                  </Link>
                )}
              </div>

              {assignments.length === 0 ? (
                <div className="text-center py-12 bg-[var(--color-surface-muted)] rounded-[var(--radius-card)] border border-[var(--color-border-light)]">
                  <ClipboardList className="mx-auto text-[var(--color-text-muted)] mb-3" size={48} />
                  <p className="text-[var(--color-text-muted)] font-medium">No assignments yet.</p>
                  {isFaculty && <p className="text-sm text-[var(--color-text-muted)] mt-1">Create one to assess your students.</p>}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments.map(assign => (
                    <Link
                      key={assign.id}
                      to={`/courses/${id}/assignments/${assign.id}`}
                      className="group block bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-[var(--radius-card)] p-5 hover:shadow-md transition-all hover:border-[var(--color-primary)] relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${assign.type === 'quiz' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {assign.type}
                        </div>
                        {isFaculty && (
                          <button
                            onClick={(e) => { e.preventDefault(); handleDeleteAssignment(assign.id); }}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <h3 className="font-bold text-lg mb-1 group-hover:text-[var(--color-primary)] transition-colors">{assign.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mt-3">
                        <Calendar size={14} /> Due: {new Date(assign.due_date).toLocaleDateString()}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: RESOURCES */}
          {activeTab === 'resources' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[var(--color-text)]">Course Resources</h2>
                {isFaculty && (
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium cursor-pointer hover:bg-[var(--color-primary)]/20">
                    <input type="file" className="hidden" accept=".pdf,application/pdf,.doc,.docx,image/*" onChange={handleUploadResource} disabled={uploading} />
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} Upload File
                  </label>
                )}
              </div>

              {resources.length === 0 ? (
                <div className="text-center py-12 bg-[var(--color-surface-muted)] rounded-[var(--radius-card)] border border-[var(--color-border-light)]">
                  <FileText className="mx-auto text-[var(--color-text-muted)] mb-3" size={48} />
                  <p className="text-[var(--color-text-muted)]">No resources uploaded.</p>
                </div>
              ) : (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-[var(--radius-card)] divide-y divide-[var(--color-border-light)]">
                  {resources.map((r) => (
                    <div key={r.id} className="p-4 flex items-center justify-between hover:bg-[var(--color-surface-hover)]">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded">
                          <FileText size={20} />
                        </div>
                        <div className="truncate">
                          <p className="font-medium text-[var(--color-text)] truncate">{r.file_name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">Uploaded {new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <a
                        href={getResourceUrl(r)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded ml-4 flex-shrink-0"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CourseDetail;
