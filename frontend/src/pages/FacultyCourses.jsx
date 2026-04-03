import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Upload, FileText, Layers, ChevronDown, ChevronUp, Plus, Loader2, Trash2, ExternalLink } from 'lucide-react';

const FacultyCourses = () => {
  const { profile, user } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Resource Upload State
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadForm, setUploadForm] = useState({ title: '', type: 'Module', file: null });
  const [resources, setResources] = useState({}); // keyed by allocation_id

  useEffect(() => {
    fetchAllocations();
  }, [profile?.id]);

  const fetchAllocations = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subject_allocations')
        .select(`
          id,
          subject:subjects(id, name, code, credits, type),
          batch:batches(id, name),
          semester:semesters(id, term_number),
          faculty:profiles(id, full_name)
        `)
        .eq('faculty_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllocations(data || []);

      // Fetch resources for each allocation
      if (data?.length) {
        const allIds = data.map(a => a.id);
        const { data: resData } = await supabase
          .from('course_materials')
          .select('*')
          .in('allocation_id', allIds)
          .order('created_at', { ascending: false });

        // Group by allocation_id
        const grouped = {};
        (resData || []).forEach(r => {
          if (!grouped[r.allocation_id]) grouped[r.allocation_id] = [];
          grouped[r.allocation_id].push(r);
        });
        setResources(grouped);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
    setUploadingId(null); // reset upload panel
  };

  const handleUpload = async (allocationId) => {
    if (!uploadForm.title.trim()) return;
    setUploadingId('loading');

    try {
      let fileUrl = null;

      if (uploadForm.file) {
        const ext = uploadForm.file.name.split('.').pop();
        const filePath = `course-materials/${allocationId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, uploadForm.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);
        fileUrl = urlData?.publicUrl || null;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('course_materials')
        .insert({
          allocation_id: allocationId,
          uploaded_by: profile.id,
          title: uploadForm.title.trim(),
          type: uploadForm.type,
          file_url: fileUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Optimistically append
      setResources(prev => ({
        ...prev,
        [allocationId]: [inserted, ...(prev[allocationId] || [])]
      }));
      setUploadForm({ title: '', type: 'Module', file: null });
      setUploadingId(null);
    } catch (err) {
      setError('Upload failed: ' + err.message);
      setUploadingId(null);
    }
  };

  const handleDelete = async (allocationId, materialId) => {
    if (!window.confirm('Delete this material?')) return;
    await supabase.from('course_materials').delete().eq('id', materialId);
    setResources(prev => ({
      ...prev,
      [allocationId]: (prev[allocationId] || []).filter(r => r.id !== materialId)
    }));
  };

  const typeColor = (type) => {
    if (type === 'Module') return 'bg-indigo-50 text-indigo-700';
    if (type === 'Resource') return 'bg-emerald-50 text-emerald-700';
    if (type === 'Assignment') return 'bg-amber-50 text-amber-700';
    return 'bg-gray-100 text-gray-600';
  };

  if (loading) return (
    <div className="p-12 flex items-center justify-center">
      <Loader2 className="animate-spin w-6 h-6 text-[#1a1b4b] mr-3" />
      <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Your Curriculum...</span>
    </div>
  );

  return (
    <div className="p-8 sm:p-12 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">My Courses</h1>
        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
          ERP-Assigned Curriculum · {allocations.length} Subject{allocations.length !== 1 ? 's' : ''} Mapped
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-700">{error}</div>
      )}

      {allocations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h2 className="text-lg font-black text-[#1a1b4b] mb-2">No Courses Assigned Yet</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Ask your Admin or HOD to assign you a subject in the Allocation Dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {allocations.map(alloc => {
            const isOpen = expandedId === alloc.id;
            const materialList = resources[alloc.id] || [];
            const isUploading = uploadingId === alloc.id;

            return (
              <div key={alloc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header Row */}
                <button
                  onClick={() => toggleExpand(alloc.id)}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-5 text-left">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-[#1a1b4b]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black bg-[#1a1b4b] text-white px-2.5 py-1 rounded-md uppercase tracking-widest">
                          {alloc.subject?.code}
                        </span>
                        <span className="text-xs font-black text-gray-300 uppercase tracking-widest">
                          Sem {alloc.semester?.term_number}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-[#1a1b4b] tracking-tight leading-none">{alloc.subject?.name}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Batch: <span className="text-[#ef4444]">{alloc.batch?.name}</span> · {alloc.subject?.credits} Credits · {alloc.subject?.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      {materialList.length} Materials
                    </span>
                    {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </button>

                {/* Expanded Panel */}
                {isOpen && (
                  <div className="border-t border-gray-100 p-6 space-y-6 bg-gray-50/50">

                    {/* Upload Form */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Upload size={13} /> Add Material
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={uploadForm.title}
                          onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="Material title..."
                          className="sm:col-span-1 p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-[#1a1b4b]/20 placeholder:text-gray-300"
                        />
                        <select
                          value={uploadForm.type}
                          onChange={e => setUploadForm(f => ({ ...f, type: e.target.value }))}
                          className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-[#1a1b4b]/20"
                        >
                          <option value="Module">Module</option>
                          <option value="Resource">Resource</option>
                          <option value="Assignment">Assignment</option>
                        </select>
                        <input
                          type="file"
                          onChange={e => setUploadForm(f => ({ ...f, file: e.target.files[0] }))}
                          className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-[#1a1b4b] file:text-white cursor-pointer"
                        />
                      </div>
                      <button
                        onClick={() => handleUpload(alloc.id)}
                        disabled={!uploadForm.title.trim() || uploadingId === 'loading'}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a1b4b] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#2d3a8c] transition-colors disabled:opacity-50"
                      >
                        {uploadingId === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={3} />}
                        Publish Material
                      </button>
                    </div>

                    {/* Material List */}
                    {materialList.length === 0 ? (
                      <p className="text-center text-xs font-bold text-gray-300 uppercase tracking-widest py-4">No materials yet. Add your first module above.</p>
                    ) : (
                      <div className="space-y-2">
                        {materialList.map(mat => (
                          <div key={mat.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 group">
                            <div className="flex items-center gap-3">
                              <FileText size={16} className="text-gray-400 shrink-0" />
                              <div>
                                <p className="text-sm font-bold text-[#1a1b4b]">{mat.title}</p>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${typeColor(mat.type)}`}>{mat.type}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {mat.file_url && (
                                <a href={mat.file_url} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-[#1a1b4b] hover:bg-gray-100 rounded-lg transition-colors">
                                  <ExternalLink size={15} />
                                </a>
                              )}
                              <button onClick={() => handleDelete(alloc.id, mat.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
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

export default FacultyCourses;
