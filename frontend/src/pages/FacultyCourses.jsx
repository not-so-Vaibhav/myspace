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
  const [uploadingBannerId, setUploadingBannerId] = useState(null);
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
          banner_url,
          subject:subjects(id, name, code, credits, type),
          batch:batches(id, name),
          semester:semesters(id, term_number),
          faculty:profiles(id, full_name),
          student_enrollments:student_enrollments(count)
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

  const handleBannerUpload = async (allocationId, file) => {
    if (!file) return;
    setUploadingBannerId(allocationId);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `course-banners/${allocationId}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('course-resources')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('course-resources')
        .getPublicUrl(filePath);
      
      const bannerUrl = urlData?.publicUrl;

      const { error: updateError } = await supabase
        .from('subject_allocations')
        .update({ banner_url: bannerUrl })
        .eq('id', allocationId);

      if (updateError) throw updateError;

      setAllocations(prev => prev.map(a => a.id === allocationId ? { ...a, banner_url: bannerUrl } : a));
    } catch (err) {
      setError('Banner upload failed: ' + err.message);
    } finally {
      setUploadingBannerId(null);
    }
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
          .from('course-resources')
          .upload(filePath, uploadForm.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('course-resources')
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {allocations.map(alloc => {
            const materialList = resources[alloc.id] || [];
            const isUploadingBanner = uploadingBannerId === alloc.id;
            const isOpen = expandedId === alloc.id;

            return (
              <div key={alloc.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-lg group">
                {/* Cover Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  {alloc.banner_url ? (
                    <img src={alloc.banner_url} alt={alloc.subject?.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                      <BookOpen className="w-12 h-12 text-indigo-200" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <label className="cursor-pointer bg-white/90 hover:bg-white text-[#1a1b4b] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                      <Upload size={12} /> {isUploadingBanner ? 'Uploading...' : 'Change Cover'}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleBannerUpload(alloc.id, e.target.files[0])}
                        disabled={isUploadingBanner}
                      />
                    </label>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col gap-4">
                  <div>
                    <h3 className="text-xl font-black text-[#1a1b4b] tracking-tight mb-4">{alloc.subject?.name}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Duration (HH:MM:SS)</span>
                        <span className="text-[#1a1b4b]">0:0:0</span>
                      </div>
                      <div className="flex justify-between text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Students #</span>
                        <span className="text-[#1a1b4b]">{alloc.student_enrollments?.[0]?.count || 0}</span>
                      </div>
                      <div className="flex justify-between text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Rating</span>
                        <span className="text-[#1a1b4b]">0</span>
                      </div>
                      <div className="flex justify-between text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Class Code</span>
                        <span className="text-indigo-600 font-black">{alloc.subject?.code}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-50 mt-auto flex items-center justify-between">
                     <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-3 py-1 rounded-full uppercase tracking-widest">
                        {materialList.length} Materials
                     </span>
                     <button
                        onClick={() => toggleExpand(alloc.id)}
                        className="bg-[#1a1b4b] text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
                     >
                        Go to Course
                     </button>
                  </div>
                </div>

                {/* Material Management (Dropdown style inside card or modal) */}
                {isOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1b4b]/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                      <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div>
                          <h3 className="text-xl font-black text-[#1a1b4b] tracking-tight">{alloc.subject?.name}</h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Resource Management</p>
                        </div>
                        <button onClick={() => setExpandedId(null)} className="w-10 h-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                          <Plus className="rotate-45" size={20} />
                        </button>
                      </div>
                      
                      <div className="p-8 overflow-y-auto space-y-6">
                        {/* Upload section */}
                        <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100/50">
                          <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Upload size={14} /> Add New Material
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <input
                              type="text"
                              value={uploadForm.title}
                              onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                              placeholder="Title (e.g. Chapter 1 Notes)"
                              className="w-full p-4 bg-white rounded-2xl border border-indigo-100 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                            <select
                              value={uploadForm.type}
                              onChange={e => setUploadForm(f => ({ ...f, type: e.target.value }))}
                              className="w-full p-4 bg-white rounded-2xl border border-indigo-100 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            >
                              <option value="Module">Module</option>
                              <option value="Resource">Resource</option>
                              <option value="Assignment">Assignment</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <input
                                type="file"
                                id={`file-${alloc.id}`}
                                className="hidden"
                                onChange={e => setUploadForm(f => ({ ...f, file: e.target.files[0] }))}
                              />
                              <label htmlFor={`file-${alloc.id}`} className="flex items-center justify-center gap-3 w-full p-4 bg-white border-2 border-dashed border-indigo-200 rounded-2xl cursor-pointer hover:border-indigo-400 transition-all">
                                <FileText size={16} className="text-indigo-400" />
                                <span className="text-xs font-bold text-gray-500 truncate">{uploadForm.file ? uploadForm.file.name : 'Choose file...'}</span>
                              </label>
                            </div>
                            <button
                              onClick={() => handleUpload(alloc.id)}
                              disabled={!uploadForm.title.trim() || uploadingId === 'loading'}
                              className="px-8 py-4 bg-[#1a1b4b] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
                            >
                              {uploadingId === 'loading' ? <Loader2 className="animate-spin" /> : 'Publish'}
                            </button>
                          </div>
                        </div>

                        {/* List */}
                        <div className="space-y-3">
                          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Existing Materials</h4>
                          {materialList.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                              <Layers className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No materials found</p>
                            </div>
                          ) : (
                            materialList.map(mat => (
                              <div key={mat.id} className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all group">
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeColor(mat.type)}`}>
                                    <FileText size={18} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-[#1a1b4b]">{mat.title}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">{mat.type}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {mat.file_url && (
                                    <a href={mat.file_url} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-all">
                                      <ExternalLink size={16} />
                                    </a>
                                  )}
                                  <button onClick={() => handleDelete(alloc.id, mat.id)} className="w-9 h-9 rounded-xl bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
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

export default FacultyCourses;
