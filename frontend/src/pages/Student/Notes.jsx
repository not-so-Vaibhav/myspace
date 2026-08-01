import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { fetchModulesByCourseId } from '../../services/courses';
import { Plus, Trash2, FileText, Pencil, X, Upload, Download, Loader2 } from 'lucide-react';

const BUCKET_NOTES = 'student-notes';

const Notes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [noteFilesByNoteId, setNoteFilesByNoteId] = useState({});
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', content: '', course_id: null, module_id: null });
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotes();
    fetchCourses();
  }, [user]);

  useEffect(() => {
    if (!form.course_id) {
      setModules([]);
      setForm((f) => ({ ...f, module_id: null }));
      return;
    }
    let cancelled = false;
    fetchModulesByCourseId(form.course_id).then((m) => { if (!cancelled) setModules(m); }).catch(() => { if (!cancelled) setModules([]); });
    return () => { cancelled = true; };
  }, [form.course_id]);

  const fetchNotes = async () => {
    if (!user) return;
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setNotes(data || []);

      const { data: files } = await supabase.from('notes_files').select('*').eq('user_id', user.id);
      const byNote = {};
      (files || []).forEach((f) => {
        const nid = f.note_id || 'draft';
        if (!byNote[nid]) byNote[nid] = [];
        byNote[nid].push(f);
      });
      setNoteFilesByNoteId(byNote);
    } catch (e) {
      setError(e.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error: err } = await supabase.from('courses').select('id, title').order('title');
      if (err) throw err;
      setCourses(data || []);
    } catch (e) {
      console.error('Error fetching courses:', e);
    }
  };

  const resetForm = () => {
    setForm({ title: '', content: '', course_id: null, module_id: null });
    setEditingId(null);
    setIsCreating(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    try {
      const payload = {
        user_id: user.id,
        title: form.title,
        content: form.content,
      };
      if (form.course_id) payload.course_id = form.course_id;
      if (form.module_id) payload.module_id = form.module_id;

      if (editingId) {
        const { error: err } = await supabase.from('notes').update(payload).eq('id', editingId).eq('user_id', user.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('notes').insert([payload]);
        if (err) throw err;
      }
      resetForm();
      await fetchNotes();
    } catch (e) {
      setError(e.message || 'Failed to save note');
    }
  };

  const handleEdit = (note) => {
    setForm({
      title: note.title || '',
      content: note.content || '',
      course_id: note.course_id ?? null,
      module_id: note.module_id ?? null,
    });
    setEditingId(note.id);
    setIsCreating(false);
    setError(null);
  };

  const handleDeleteNote = async (id) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    setError(null);
    try {
      const { error: err } = await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id);
      if (err) throw err;
      await fetchNotes();
    } catch (e) {
      setError(e.message || 'Failed to delete note');
    }
  };

  const handleFileUpload = async (e, noteId) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      const path = `${user.id}/${noteId || 'draft'}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from(BUCKET_NOTES).upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: insertErr } = await supabase.from('notes_files').insert({
        user_id: user.id,
        note_id: noteId || null,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
      });
      if (insertErr) throw insertErr;
      await fetchNotes();
    } catch (e) {
      setError(e.message || 'Upload failed. Ensure bucket "student-notes" exists in Supabase Storage.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const getFileUrl = (path) => {
    const { data } = supabase.storage.from(BUCKET_NOTES).getPublicUrl(path);
    return data?.publicUrl;
  };

  const showForm = isCreating || editingId;

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">My Notes</h1>
          <p className="text-[var(--color-text-muted)] mt-1">Capture your ideas and link them to courses or modules.</p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setIsCreating(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-button)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} /> New Note
        </button>
      </div>

      {showForm && (
        <div className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-2.5 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-button)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none text-[var(--color-text)]"
                placeholder="Note title..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Content</label>
              <textarea
                required
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="w-full px-4 py-2.5 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-button)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none min-h-[120px] text-[var(--color-text)]"
                placeholder="What did you learn?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Course (optional)</label>
              <select
                value={form.course_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value ? Number(e.target.value) : null }))}
                className="w-full px-4 py-2.5 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-button)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none text-[var(--color-text)]"
              >
                <option value="">None</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Module (optional)</label>
              <select
                value={form.module_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, module_id: e.target.value ? Number(e.target.value) : null }))}
                className="w-full px-4 py-2.5 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-button)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none text-[var(--color-text)]"
                disabled={!form.course_id}
              >
                <option value="">None</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={resetForm} className="px-4 py-2.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] rounded-[var(--radius-button)] transition-colors inline-flex items-center gap-2">
                <X size={18} /> Cancel
              </button>
              <button type="submit" className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-[var(--radius-button)] hover:opacity-90 transition-opacity">
                {editingId ? 'Update Note' : 'Save Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && !showForm && (
        <div className="mb-6 p-4 rounded-[var(--radius-button)] bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-[var(--color-text-muted)] py-12">
          <Loader2 size={24} className="animate-spin" /> Loading notes...
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)]">
          <div className="w-16 h-16 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} />
          </div>
          <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">No notes yet</h3>
          <p className="text-[var(--color-text-muted)] mb-6">Create a note and optionally link it to a course.</p>
          <button type="button" onClick={() => { resetForm(); setIsCreating(true); }} className="text-[var(--color-primary)] font-medium hover:underline">
            Create a note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <div key={note.id} className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] card-hover group relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <label className="cursor-pointer p-1.5 text-[var(--color-text-subtle)] hover:text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-surface-muted)]" title="Upload PDF">
                    <input type="file" className="hidden" accept=".pdf,application/pdf,text/plain" onChange={(e) => handleFileUpload(e, note.id)} disabled={uploading} />
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  </label>
                  <button type="button" onClick={() => handleEdit(note)} className="p-1.5 text-[var(--color-text-subtle)] hover:text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-surface-muted)]" aria-label="Edit">
                    <Pencil size={18} />
                  </button>
                  <button type="button" onClick={() => handleDeleteNote(note.id)} className="p-1.5 text-[var(--color-text-subtle)] hover:text-[var(--color-accent-rose)] rounded-lg hover:bg-red-50" aria-label="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-[var(--color-text)] mb-2">{note.title}</h3>
              <p className="text-[var(--color-text-muted)] text-sm line-clamp-3">{note.content}</p>
              {(noteFilesByNoteId[note.id] || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(noteFilesByNoteId[note.id] || []).map((f) => (
                    <a key={f.id} href={getFileUrl(f.storage_path)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
                      <Download size={14} /> {f.file_name}
                    </a>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-[var(--color-border-light)] flex justify-between items-center text-xs text-[var(--color-text-subtle)]">
                <span>{new Date(note.created_at).toLocaleDateString()}</span>
                {(note.course_id || note.module_id) && <span>Linked to course/module</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notes;
