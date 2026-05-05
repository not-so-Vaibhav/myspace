import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FileText, Plus, Trash2, ExternalLink, Loader2, CheckSquare, Clock, Users, ChevronDown, ChevronUp, Download } from 'lucide-react';

const deadlineStatus = (dl) => {
  if (!dl) return null;
  const now = new Date();
  const due = new Date(dl);
  const diffMs = due - now;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffMs < 0) return { label: 'Overdue', cls: 'bg-red-100 text-red-600' };
  if (diffHours < 24) return { label: `Due in ${Math.round(diffHours)}h`, cls: 'bg-amber-100 text-amber-600' };
  return { label: `${Math.ceil(diffDays)}d remaining`, cls: 'bg-green-100 text-green-600' };
};

const FacultyAssignments = () => {
  const { profile } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [submissions, setSubmissions] = useState({}); // material_id -> array of submissions
  const [loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState({}); // material_id -> bool
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({ title: '', allocation_id: '', deadline: '', file: null });
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
          .select('*, allocation:subject_allocations(subject:subjects(name,code), batch:batches(name)), student_submissions(count)')
          .in('allocation_id', ids)
          .eq('type', 'Assignment')
          .order('created_at', { ascending: false });

        setMaterials(matData || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (materialId) => {
    if (submissions[materialId]) return; // Already loaded
    
    setLoadingSubmissions(prev => ({ ...prev, [materialId]: true }));
    try {
      const { data, error: subErr } = await supabase
        .from('student_submissions')
        .select(`
          *,
          student:profiles(id, full_name)
        `)
        .eq('material_id', materialId)
        .order('submitted_at', { ascending: false });

      if (subErr) throw subErr;
      setSubmissions(prev => ({ ...prev, [materialId]: data || [] }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubmissions(prev => ({ ...prev, [materialId]: false }));
    }
  };

  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchSubmissions(id);
    }
  };

  const handleDownloadSubmissions = async (material, format = 'csv') => {
    const subs = submissions[material.id] || [];
    if (subs.length === 0) {
      alert("No submissions to download.");
      return;
    }

    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      const html = `
        <html>
          <head>
            <title>Submission Report - ${material.title}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #1a1b4b; }
              header { border-bottom: 2px solid #1a1b4b; margin-bottom: 20px; padding-bottom: 10px; }
              h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
              .meta { color: #666; font-size: 12px; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #eee; padding: 12px; text-align: left; font-size: 14px; }
              th { background: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 11px; }
            </style>
          </head>
          <body>
            <header>
              <h1>Submission Compliance Report</h1>
              <div class="meta">Assignment: ${material.title}</div>
              <div class="meta">Batch: ${material.allocation?.batch?.name}</div>
              <div class="meta">Faculty: ${profile.full_name} · Generated: ${new Date().toLocaleString()}</div>
            </header>
            <table>
              <thead><tr><th>Student Name</th><th>Student ID</th><th>Submitted At</th><th>File Link</th></tr></thead>
              <tbody>
                ${subs.map(s => `
                  <tr>
                    <td>${s.student?.full_name}</td>
                    <td>${s.student?.id?.substring(0,8)}</td>
                    <td>${new Date(s.submitted_at).toLocaleString()}</td>
                    <td style="font-size: 10px; color: #4f46e5;">${s.file_url}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
            <footer style="margin-top: 40px; font-size: 10px; color: #ccc; text-align: center;">Verified Digital Submission Archive · Generated via MySpace EMS</footer>
          </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    } else {
      const header = ['Student Name', 'Student ID', 'Submitted At', 'File URL'];
      const rows = subs.map(s => [
        s.student?.full_name,
        s.student?.id,
        new Date(s.submitted_at).toLocaleString(),
        s.file_url
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].map(e => e.join(",")).join("\n");
      const link = document.createElement("a");
      link.href = encodeURI(csvContent);
      link.download = `Submissions_${material.title.replace(/\s+/g, '_')}.csv`;
      link.click();
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
        const path = `assignments/${form.allocation_id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('course-resources').upload(path, form.file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('course-resources').getPublicUrl(path);
        fileUrl = urlData?.publicUrl;
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('course_materials')
        .insert({
          allocation_id: form.allocation_id,
          uploaded_by: profile.id,
          title: form.title.trim(),
          type: 'Assignment',
          file_url: fileUrl,
          deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        })
        .select('*, allocation:subject_allocations(subject:subjects(name,code), batch:batches(name))')
        .single();

      if (insertErr) throw insertErr;

      setMaterials(prev => [inserted, ...prev]);
      setForm({ title: '', allocation_id: '', deadline: '', file: null });
      showSuccess('Assignment published successfully!');
    } catch (err) {
      setError('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this assignment?')) return;
    await supabase.from('course_materials').delete().eq('id', id);
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  if (loading) return (
    <div className="p-12 flex items-center justify-center">
      <Loader2 className="animate-spin w-6 h-6 text-[#1a1b4b] mr-3" />
      <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Assignments...</span>
    </div>
  );

  return (
    <div className="p-8 sm:p-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">Assignment Management</h1>
        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
          Create Assignments and Track Student Submissions
        </p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-700">{error}</div>}
      {success && <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-xs font-bold text-green-700">{success}</div>}

      {/* Create Panel */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
        <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight mb-6 flex items-center gap-3">
          <CheckSquare className="w-5 h-5 text-amber-500" />
          Create New Task
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Assignment Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Lab 4 — Recursive Functions"
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-[#1a1b4b]/20"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Target Course / Batch</label>
              <select
                value={form.allocation_id}
                onChange={e => setForm(f => ({ ...f, allocation_id: e.target.value }))}
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-[#1a1b4b]/20"
                required
              >
                <option value="">-- Select Course --</option>
                {allocations.map(a => (
                  <option key={a.id} value={a.id}>
                    [{a.subject?.code}] {a.subject?.name} · {a.batch?.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Deadline</label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Attach Briefing</label>
              <input
                type="file"
                onChange={e => setForm(f => ({ ...f, file: e.target.files[0] }))}
                className="w-full p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-[#1a1b4b] file:text-white"
              />
            </div>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !form.title.trim() || !form.allocation_id}
              className="px-8 py-3 bg-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Publish Assignment'}
            </button>
          </div>
        </form>
      </div>

      {/* Published List */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
        <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight mb-6">Active Assignments</h2>
        <div className="space-y-4">
          {materials.map(mat => {
            const status = deadlineStatus(mat.deadline);
            const isExpanded = expandedId === mat.id;
            const subs = submissions[mat.id] || [];
            const isLoadingSubs = loadingSubmissions[mat.id];

            return (
              <div key={mat.id} className="border border-gray-100 rounded-3xl overflow-hidden transition-all hover:border-[#1a1b4b]/10 hover:shadow-md">
                <div 
                  className={`p-6 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-gray-50' : 'bg-white'}`}
                  onClick={() => toggleExpand(mat.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                      <CheckSquare size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#1a1b4b]">{mat.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[12px] font-black bg-indigo-50 text-[#1a1b4b] px-2 py-0.5 rounded-md uppercase tracking-widest border border-indigo-100">
                          {mat.allocation?.batch?.name}
                        </span>
                        {mat.deadline && <span className={`text-[12px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${status.cls}`}>{status.label}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                         <div className="text-xs font-black text-[#1a1b4b] uppercase tracking-widest">
                            {subs.length > 0 ? subs.length : (mat.student_submissions?.[0]?.count || 0)} Uploads
                         </div>
                         <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">Received</p>
                      </div>
                     {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 border-t border-gray-100 bg-white">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                       <h3 className="text-xs font-black text-[#1a1b4b] uppercase tracking-widest flex items-center gap-2">
                          <Users size={14} className="text-indigo-500" /> Student Submissions ({subs.length})
                       </h3>
                       <div className="flex items-center gap-2">
                          <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 p-1">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); handleDownloadSubmissions(mat, 'csv'); }}
                                  className="p-2 text-gray-400 hover:text-[#1a1b4b] hover:bg-white rounded-lg transition-all" 
                                  title="Download Excel Record"
                              >
                                  <Download size={14} />
                              </button>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); handleDownloadSubmissions(mat, 'pdf'); }}
                                  className="p-2 text-gray-400 hover:text-[#ef4444] hover:bg-white rounded-lg transition-all" 
                                  title="Print PDF Report"
                              >
                                  <FileText size={14} />
                              </button>
                          </div>
                          <div className="w-px h-6 bg-gray-100 mx-1"></div>
                          {mat.file_url && <a href={mat.file_url} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest text-[#1a1b4b] bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-gray-100 transition-colors"><ExternalLink size={12} /> Brief</a>}
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(mat.id); }} className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1.5"><Trash2 size={12} /> Wipe</button>
                       </div>
                    </div>

                    {isLoadingSubs ? (
                        <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-gray-300" /></div>
                    ) : subs.length === 0 ? (
                        <div className="py-8 p-6 bg-gray-50 rounded-2xl text-center border border-dashed border-gray-100">
                           <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">No student has submitted work yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                           {subs.map(sub => (
                              <div key={sub.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-transparent hover:border-indigo-100 group transition-all">
                                 <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-100 text-[12px] font-black text-[#1a1b4b]">
                                       {sub.student?.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-[#1a1b4b] tracking-tight">{sub.student?.full_name}</p>
                                       <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                                          ID: {sub.student?.id?.substring(0,8)} · Linked at {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                       </p>
                                    </div>
                                 </div>
                                 <a 
                                   href={sub.file_url} 
                                   target="_blank" 
                                   rel="noreferrer" 
                                   className="px-4 py-2 bg-white border border-gray-200 text-[#1a1b4b] text-[12px] font-black uppercase tracking-widest rounded-xl hover:border-indigo-500 transition-all opacity-0 group-hover:opacity-100"
                                 >
                                    Review File
                                 </a>
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
      </div>
    </div>
  );
};

export default FacultyAssignments;
