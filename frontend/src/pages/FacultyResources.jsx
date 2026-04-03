import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FolderOpen, Plus, Trash2, ExternalLink, Loader2, BookOpen, Film, File } from 'lucide-react';

const typeConfig = {
  Module:   { label: 'Module',   bg: 'bg-indigo-50',  text: 'text-indigo-700',  icon: BookOpen, btn: 'bg-indigo-600 hover:bg-indigo-700' },
  Resource: { label: 'Resource', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: FolderOpen, btn: 'bg-emerald-600 hover:bg-emerald-700' },
};

const FacultyResources = () => {
  const { profile } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('Resource'); // 'Module' | 'Resource'

  const [form, setForm] = useState({ title: '', allocation_id: '', type: 'Resource', file: null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.id) fetchData();
  }, [profile?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: allocData } = await supabase
        .from('subject_allocations')
        .select('id, subject:subjects(name, code), batch:batches(name), semester:semesters(term_number)')
        .eq('faculty_id', profile.id);

      setAllocations(allocData || []);

      if (allocData?.length) {
        const ids = allocData.map(a => a.id);
        const { data: matData } = await supabase
          .from('course_materials')
          .select('*, allocation:subject_allocations(subject:subjects(name,code), batch:batches(name))')
          .in('allocation_id', ids)
          .in('type', ['Module', 'Resource'])
          .order('created_at', { ascending: false });

        setMaterials(matData || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.allocation_id) return;
    setSubmitting(true);
    setError('');
    try {
      let fileUrl = null;
      if (form.file) {
        const ext = form.file.name.split('.').pop();
        const path = `resources/${form.allocation_id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('resources').upload(path, form.file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('resources').getPublicUrl(path);
        fileUrl = urlData?.publicUrl;
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('course_materials')
        .insert({
          allocation_id: form.allocation_id,
          uploaded_by: profile.id,
          title: form.title.trim(),
          type: form.type,
          file_url: fileUrl,
        })
        .select('*, allocation:subject_allocations(subject:subjects(name,code), batch:batches(name))')
        .single();

      if (insertErr) throw insertErr;

      setMaterials(prev => [inserted, ...prev]);
      setForm({ title: '', allocation_id: '', type: form.type, file: null });
      showSuccess('Material published successfully!');
    } catch (err) {
      setError('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this material?')) return;
    await supabase.from('course_materials').delete().eq('id', id);
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const filtered = materials.filter(m => m.type === activeTab);

  if (loading) return (
    <div className="p-12 flex items-center justify-center">
      <Loader2 className="animate-spin w-6 h-6 text-[#1a1b4b] mr-3" />
      <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Resources...</span>
    </div>
  );

  const cfg = typeConfig[form.type];

  return (
    <div className="p-8 sm:p-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">Modules & Resources</h1>
        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
          Upload Study Material for Your Assigned Courses
        </p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-700">{error}</div>}
      {success && <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-xs font-bold text-green-700">{success}</div>}

      {/* Upload Panel */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight mb-6 flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-emerald-500" />
          Upload New Material
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Type Toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
            {['Module', 'Resource'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  form.type === t
                    ? 'bg-white text-[#1a1b4b] shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                {form.type} Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={form.type === 'Module' ? 'e.g. Unit 2 — Linked Lists' : 'e.g. Reference Notes — Trees'}
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-[#1a1b4b]/20 placeholder:text-gray-300"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Target Course / Batch</label>
              <select
                value={form.allocation_id}
                onChange={e => setForm(f => ({ ...f, allocation_id: e.target.value }))}
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-[#1a1b4b]/20"
                required
              >
                <option value="">-- Select Course --</option>
                {allocations.map(a => (
                  <option key={a.id} value={a.id}>
                    [{a.subject?.code}] {a.subject?.name} · {a.batch?.name} · Sem {a.semester?.term_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              Attach File (PDF, PPTX, Video — Optional)
            </label>
            <input
              type="file"
              onChange={e => setForm(f => ({ ...f, file: e.target.files[0] }))}
              className="w-full p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-[#1a1b4b] file:text-white cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !form.title.trim() || !form.allocation_id}
            className={`inline-flex items-center gap-2 px-6 py-3 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors disabled:opacity-50 ${cfg.btn}`}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={3} />}
            Publish {form.type}
          </button>
        </form>
      </div>

      {/* Materials List with Tab Filter */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight">Published Materials</h2>
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            {['Module', 'Resource'].map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === t
                    ? 'bg-white text-[#1a1b4b] shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t}s ({materials.filter(m => m.type === t).length})
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">No {activeTab}s published yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(mat => {
              const matCfg = typeConfig[mat.type];
              const Icon = matCfg.icon;
              return (
                <div key={mat.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50/60 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${matCfg.bg} rounded-xl flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${matCfg.text}`} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#1a1b4b]">{mat.title}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        [{mat.allocation?.subject?.code}] {mat.allocation?.subject?.name} · Batch {mat.allocation?.batch?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {mat.file_url && (
                      <a href={mat.file_url} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-[#1a1b4b] hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-100">
                        <ExternalLink size={15} />
                      </a>
                    )}
                    <button onClick={() => handleDelete(mat.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyResources;
