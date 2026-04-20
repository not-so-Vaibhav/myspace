import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
    MessageSquare, Send, Paperclip, Smile, Mic, Search, 
    BookOpen, ChevronRight, FileText, Download, Loader2, X,
    Eye, Image as ImageIcon, File, ZoomIn, ZoomOut, RotateCw, ExternalLink, Trash2,
    Mail, UserPlus, SendHorizonal, AlertCircle
} from 'lucide-react';

// ─── File Preview Modal ───────────────────────────────────────────────────────
const FilePreviewModal = ({ file, onClose }) => {
    const [zoom, setZoom] = useState(1);
    const [rotate, setRotate] = useState(0);

    if (!file) return null;

    const ext = (file.name || '').split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext);
    const isPDF   = ext === 'pdf';
    const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
    const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);

    const handleDownload = async () => {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name || 'download';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div 
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="px-8 py-5 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#1a1b4b]/5 rounded-2xl flex items-center justify-center">
                            {isImage ? <ImageIcon size={20} className="text-[#1a1b4b]" /> : <FileText size={20} className="text-[#1a1b4b]" />}
                        </div>
                        <div>
                            <h3 className="text-[17px] font-black text-[#1a1b4b] uppercase tracking-tight truncate max-w-[400px]">{file.name || 'Attachment Preview'}</h3>
                            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{ext?.toUpperCase()} · Academic File Viewer</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isImage && (
                            <>
                                <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-[#1a1b4b] border border-gray-100" title="Zoom In"><ZoomIn size={18} /></button>
                                <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-[#1a1b4b] border border-gray-100" title="Zoom Out"><ZoomOut size={18} /></button>
                                <button onClick={() => setRotate(r => (r + 90) % 360)} className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-[#1a1b4b] border border-gray-100" title="Rotate"><RotateCw size={18} /></button>
                                <div className="w-px h-6 bg-gray-100 mx-1" />
                            </>
                        )}
                        <a href={file.url} target="_blank" rel="noreferrer" className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-[#1a1b4b] border border-gray-100" title="Open in new tab"><ExternalLink size={18} /></a>
                        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-[13px] font-black uppercase tracking-widest hover:bg-indigo-800 transition-all shadow-lg shadow-indigo-100">
                            <Download size={14} strokeWidth={3} /> Download
                        </button>
                        <button onClick={onClose} className="p-2.5 hover:bg-red-50 rounded-xl transition-colors text-gray-400 hover:text-red-500 border border-gray-100 ml-1"><X size={18} /></button>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-auto bg-[#f8fafc] flex items-center justify-center p-8 min-h-0">
                    {isImage && (
                        <div className="overflow-auto flex items-center justify-center w-full h-full">
                            <img 
                                src={file.url} 
                                alt={file.name}
                                className="max-w-none rounded-2xl shadow-2xl transition-all duration-300 border border-gray-200"
                                style={{ transform: `scale(${zoom}) rotate(${rotate}deg)`, transformOrigin: 'center center' }}
                            />
                        </div>
                    )}

                    {isPDF && (
                        <iframe 
                            src={`${file.url}#toolbar=1&navpanes=1&scrollbar=1`}
                            className="w-full h-full min-h-[60vh] rounded-2xl border border-gray-200 shadow-xl"
                            title={file.name}
                        />
                    )}

                    {isVideo && (
                        <video 
                            src={file.url} 
                            controls 
                            className="max-w-full max-h-full rounded-2xl shadow-2xl border border-gray-200"
                        />
                    )}

                    {isAudio && (
                        <div className="text-center space-y-8 p-12">
                            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto animate-pulse border-4 border-indigo-100">
                                <Mic size={40} className="text-[#1a1b4b]" />
                            </div>
                            <p className="text-[17px] font-black text-[#1a1b4b] uppercase tracking-tight">{file.name}</p>
                            <audio src={file.url} controls className="w-full max-w-md" />
                        </div>
                    )}

                    {!isImage && !isPDF && !isVideo && !isAudio && (
                        <div className="text-center space-y-6 p-16">
                            <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto border-2 border-gray-100 shadow-inner">
                                <File size={40} className="text-gray-300" />
                            </div>
                            <div>
                                <p className="text-[21px] font-black text-[#1a1b4b] uppercase tracking-tight mb-2">{file.name}</p>
                                <p className="text-[15px] font-bold text-gray-400 uppercase tracking-widest mb-8">Preview not available for this file type</p>
                            </div>
                            <button onClick={handleDownload} className="flex items-center gap-3 px-8 py-4 bg-[#1a1b4b] text-white rounded-2xl text-[15px] font-black uppercase tracking-widest mx-auto hover:scale-105 transition-all shadow-xl shadow-indigo-100">
                                <Download size={18} strokeWidth={3} /> Download File
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
// ─── Mail Modal ─────────────────────────────────────────────────────────────
const MailModal = ({ isOpen, onClose, students, courseName }) => {
    const [recipient, setRecipient] = useState('all');
    const [subject, setSubject] = useState(`Academic Update: ${courseName}`);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const handleSend = () => {
        setSending(true);
        let targetEmails = [];
        if (students.role === 'student' && students.faculty?.email) {
            targetEmails = [students.faculty.email];
        } else if (recipient === 'all') {
            targetEmails = students.list.map(s => s.email).filter(Boolean);
        } else {
            const s = students.list.find(x => x.id === recipient);
            if (s?.email) targetEmails = [s.email];
        }

        if (targetEmails.length === 0) {
            alert('No registered email found for the selected recipient.');
            setSending(false);
            return;
        }

        const mailto = `mailto:${targetEmails.length === 1 ? targetEmails[0] : ''}?bcc=${targetEmails.length > 1 ? targetEmails.join(',') : ''}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        window.open(mailto, '_blank');

        setTimeout(() => {
            setSending(false);
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[300] bg-[#1a1b4b]/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                            <Mail size={24} />
                        </div>
                        <div>
                            <h3 className="text-[21px] font-black text-[#1a1b4b] uppercase tracking-tighter">Academic Dispatch</h3>
                            <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Official Communication · {courseName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-50 rounded-2xl transition-colors text-gray-400 hover:text-[#ef4444] shadow-sm"><X size={20} /></button>
                </div>

                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-[13px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Recipient Vector</label>
                        {students.role === 'student' ? (
                            <div className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 text-[17px] font-bold text-[#1a1b4b]">
                                Primary Faculty: {students.faculty?.full_name || 'Assigned Instructor'}
                            </div>
                        ) : (
                            <select 
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 text-[17px] font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">Broadcast to All Enrolled Students ({students.list.length})</option>
                                <optgroup label="Individual Identities">
                                    {students.list.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name} ({s.email || 'No email'})</option>
                                    ))}
                                </optgroup>
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-[13px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Subject Header</label>
                        <input 
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 text-[17px] font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                            placeholder="Brief subject..."
                        />
                    </div>

                    <div>
                        <label className="block text-[13px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Intel Payload (Message)</label>
                        <textarea 
                            rows={5}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 text-[17px] font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none placeholder:text-gray-300"
                            placeholder="Type your message here..."
                        />
                    </div>

                    <button 
                        onClick={handleSend}
                        disabled={sending || !message.trim()}
                        className="w-full py-5 bg-[#1a1b4b] text-white rounded-2xl text-[13px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {sending ? <Loader2 size={18} className="animate-spin" /> : <SendHorizonal size={18} strokeWidth={3} />}
                        Execute Dispatch via Gmail
                    </button>
                    <p className="text-[12px] font-bold text-gray-300 text-center uppercase tracking-widest">Sent via verified registered system coordinates</p>
                </div>
            </div>
        </div>
    );
};

// ─── File Attachment Bubble ───────────────────────────────────────────────────
const FileAttachment = ({ msg, isOwn, onPreview }) => {
    const ext = (msg.file_name || '').split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext);
    const isPDF   = ext === 'pdf';

    const fileTypeLabel = isPDF ? 'PDF Document' : isImage ? 'Image' : 'File Attachment';

    return (
        <div className={`mt-3 rounded-2xl border overflow-hidden ${isOwn ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-100'}`}>
            {/* Image Inline Preview */}
            {isImage && (
                <button onClick={() => onPreview({ url: msg.file_url, name: msg.file_name })} className="block w-full">
                    <div className="relative group">
                        <img 
                            src={msg.file_url} 
                            alt={msg.file_name}
                            className="max-w-[260px] max-h-[180px] w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-xl px-3 py-1.5 flex items-center gap-2">
                                <Eye size={14} className="text-[#1a1b4b]" />
                                <span className="text-[13px] font-black text-[#1a1b4b] uppercase tracking-widest">View</span>
                            </div>
                        </div>
                    </div>
                </button>
            )}
            
            {/* File Info Row */}
            <div className="p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOwn ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                    {isImage ? <ImageIcon size={14} className={isOwn ? 'text-white' : 'text-indigo-500'} /> : 
                     isPDF   ? <FileText size={14} className={isOwn ? 'text-white' : 'text-red-500'} />   :
                                <File     size={14} className={isOwn ? 'text-white' : 'text-gray-400'} />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-black truncate ${isOwn ? 'text-white' : 'text-[#1a1b4b]'}`}>
                        {msg.file_name || 'Attached File'}
                    </p>
                    <p className={`text-[11px] font-bold uppercase tracking-widest ${isOwn ? 'text-white/50' : 'text-gray-400'}`}>{fileTypeLabel}</p>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => onPreview({ url: msg.file_url, name: msg.file_name })}
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                            isOwn ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title="Preview"
                    >
                        <Eye size={13} />
                    </button>
                    <a href={msg.file_url} download={msg.file_name} target="_blank" rel="noreferrer"
                        className={`p-1.5 rounded-lg transition-colors ${
                            isOwn ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-[#1a1b4b] hover:bg-white shadow-sm'
                        }`}
                        title="Download"
                    >
                        <Download size={13} />
                    </a>
                </div>
            </div>
        </div>
    );
};

// ─── Main Discussions Component ───────────────────────────────────────────────
const Discussions = () => {
    const { profile } = useAuth();
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [file, setFile] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);
    const [error, setError] = useState(null);
    
    // Mail State
    const [showMailModal, setShowMailModal] = useState(false);
    const [courseStudents, setCourseStudents] = useState([]);

    const msgEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => { fetchAccessibleCourses(); }, [profile?.id]);

    useEffect(() => {
        if (selectedCourse && (profile?.role === 'faculty' || profile?.role === 'hod')) {
            fetchCourseStudents(selectedCourse.id);
        }
    }, [selectedCourse, profile?.role]);

    useEffect(() => {
        if (selectedCourse) {
            setError(null);
            fetchMessages(selectedCourse.id);
            const subscription = supabase
                .channel(`discussion:${selectedCourse.id}`)
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'course_discussions', 
                    filter: `allocation_id=eq.${selectedCourse.id}` 
                }, (payload) => {
                    console.log('Realtime message received:', payload);
                    handleNewRealtimeMessage(payload.new);
                })
                .on('postgres_changes', {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'course_discussions',
                    filter: `allocation_id=eq.${selectedCourse.id}`
                }, (payload) => {
                    setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                })
                .subscribe((status) => {
                    console.log(`Subscription status for ${selectedCourse.id}:`, status);
                    if (status === 'CHANNEL_ERROR') {
                        setError('Real-time connection failed. Try refreshing the page.');
                    }
                });

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [selectedCourse]);

    useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const fetchAccessibleCourses = async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            let data;
            if (profile.role === 'faculty' || profile.role === 'hod') {
                const { data: d, error } = await supabase.from('subject_allocations').select(`id, subject:subjects(id,name,code), batch:batches(id,name), semester:semesters(id,term_number)`).eq('faculty_id', profile.id);
                if (error) throw error;
                data = d;
            } else {
                const { data: d, error } = await supabase.from('student_enrollments').select(`allocation:subject_allocations(id, subject:subjects(id,name,code), batch:batches(id,name), semester:semesters(id,term_number), faculty:profiles(id, full_name, email))`).eq('student_id', profile.id);
                if (error) throw error;
                data = d.map(x => ({ ...x.allocation, faculty: x.faculty }));
            }
            setCourses(data || []);
            if (data?.length > 0) setSelectedCourse(data[0]);
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const fetchCourseStudents = async (allocationId) => {
        try {
            const { data, error } = await supabase
                .from('student_enrollments')
                .select('student:profiles(id, full_name, email, avatar_url)')
                .eq('allocation_id', allocationId);
            
            if (error) throw error;
            setCourseStudents(data?.map(d => d.student) || []);
        } catch (err) {
            console.error('Students fetch error:', err);
        }
    };


    const fetchMessages = async (allocationId) => {
        try {
            const { data, error: fetchErr } = await supabase
                .from('course_discussions')
                .select(`*, sender:profiles(id,full_name,avatar_url,role)`)
                .eq('allocation_id', allocationId)
                .order('created_at', { ascending: true });
            
            if (fetchErr) throw fetchErr;
            setMessages(data || []);
        } catch (err) {
            console.error('Fetch messages error:', err);
            setError('Failed to load discussion history.');
        }
    };

    const handleNewRealtimeMessage = async (newMsgData) => {
        const { data: sender } = await supabase.from('profiles').select('id,full_name,avatar_url,role').eq('id', newMsgData.sender_id).single();
        const fullMsg = { ...newMsgData, sender };
        setMessages(prev => prev.find(m => m.id === fullMsg.id) ? prev : [...prev, fullMsg]);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if ((!newMsg.trim() && !file) || !selectedCourse || sending) return;
        setSending(true);
        try {
            let fileUrl = null, fileName = null;
            if (file) {
                const ext = file.name.split('.').pop();
                const path = `discussions/${selectedCourse.id}/${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage.from('course-resources').upload(path, file);
                if (upErr) throw upErr;
                const { data: urlData } = supabase.storage.from('course-resources').getPublicUrl(path);
                fileUrl = urlData.publicUrl; fileName = file.name;
            }
            const { error } = await supabase.from('course_discussions').insert({ allocation_id: selectedCourse.id, sender_id: profile.id, content: newMsg.trim(), file_url: fileUrl, file_name: fileName });
            if (error) throw error;
            setNewMsg(''); setFile(null);
        } catch (err) { 
            console.error('Send failed:', err);
            setError(err.message || 'Failed to send message.');
        } 
        finally { setSending(false); }
    };

    const handleDeleteMessage = async (msgId) => {
        if (!window.confirm('Delete this message? This cannot be undone.')) return;
        try {
            const { error } = await supabase.from('course_discussions').delete().eq('id', msgId).eq('sender_id', profile.id);
            if (error) throw error;
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    if (loading) return (
        <div className="h-[calc(100vh-100px)] flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#1a1b4b] border-t-transparent rounded-full" />
        </div>
    );

    return (
        <>
            {/* File Preview Modal */}
            {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}

            {/* Mail Modal */}
            <MailModal 
                isOpen={showMailModal}
                onClose={() => setShowMailModal(false)}
                students={{
                    role: profile?.role?.toLowerCase(),
                    list: courseStudents,
                    faculty: selectedCourse?.faculty
                }}
                courseName={selectedCourse?.subject?.name}
            />

            {error && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[400] animate-in slide-in-from-top-4">
                    <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
                        <AlertCircle size={18} />
                        <p className="text-[15px] font-black uppercase tracking-widest">{error}</p>
                        <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors"><X size={14} /></button>
                    </div>
                </div>
            )}

            <div className="flex h-[calc(100vh-100px)] bg-[#f8fafc] overflow-hidden">
                {/* ── Sidebar ─────────────────────────────────── */}
                <div className="w-[380px] bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-[23px] font-black text-[#1a1b4b] uppercase tracking-tighter mb-4">Discussions</h2>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input type="text" placeholder="Search academic channels..." className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-[15px] font-bold text-[#1a1b4b] placeholder:text-gray-300 focus:ring-2 focus:ring-[#1a1b4b]/10 outline-none uppercase tracking-widest" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {courses.map(course => (
                            <button key={course.id} onClick={() => setSelectedCourse(course)}
                                className={`w-full p-4 rounded-[2rem] text-left transition-all group border-2 ${selectedCourse?.id === course.id ? 'bg-indigo-50 border-indigo-100 shadow-xl shadow-indigo-100/30' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'}`}>
                                <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 ${selectedCourse?.id === course.id ? 'bg-white border-indigo-200 text-[#1a1b4b]' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                        <BookOpen size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className={`text-[13px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${selectedCourse?.id === course.id ? 'bg-[#1a1b4b] text-white' : 'bg-gray-100 text-gray-400'}`}>{course.subject?.code}</span>
                                            <span className="text-[12px] font-bold text-emerald-400 uppercase tracking-widest">● Live</span>
                                        </div>
                                        <h3 className="text-[17px] font-black text-[#1a1b4b] truncate">{course.subject?.name}</h3>
                                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest truncate mt-0.5">Batch: {course.batch?.name} · Sem {course.semester?.term_number}</p>
                                    </div>
                                    <ChevronRight className={`shrink-0 transition-transform ${selectedCourse?.id === course.id ? 'translate-x-1 text-[#1a1b4b]' : 'text-gray-200 opacity-0 group-hover:opacity-100'}`} size={16} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Chat Area ────────────────────────────────── */}
                {selectedCourse ? (
                    <div className="flex-1 flex flex-col bg-[#fcfdfe] relative overflow-hidden">
                        {/* Header */}
                        <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between z-10 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-[#1a1b4b] rounded-xl flex items-center justify-center text-white font-black text-[21px] shadow-lg">
                                    {selectedCourse.subject?.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-[17px] font-black text-[#1a1b4b] uppercase tracking-tight">{selectedCourse.subject?.name}</h2>
                                    <p className="text-[12px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Community Access Verified
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-3 hover:bg-gray-50 rounded-xl transition-colors text-gray-400"><Search size={18} /></button>
                                <button 
                                    onClick={() => setShowMailModal(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 text-[#1a1b4b] rounded-xl text-[13px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm group"
                                >
                                    <Mail size={14} className="group-hover:rotate-12 transition-transform" /> 
                                    {profile?.role === 'student' ? 'Mail Faculty' : 'Mail Students'}
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth bg-gradient-to-b from-[#f8fafc] to-white">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                                    <MessageSquare size={64} strokeWidth={1} className="text-gray-300 mb-4" />
                                    <p className="text-[15px] font-black text-gray-400 uppercase tracking-widest">Awaiting first interaction...</p>
                                </div>
                            ) : messages.map(msg => {
                                const isOwn = msg.sender_id === profile?.id;
                                return (
                                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group/msg`}>
                                        <div className={`flex gap-4 max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {/* Avatar */}
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 overflow-hidden shadow-sm ${isOwn ? 'bg-indigo-50 border-indigo-100 text-indigo-400' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                                {msg.sender?.avatar_url 
                                                    ? <img src={msg.sender.avatar_url} className="w-full h-full object-cover" alt="" /> 
                                                    : <span className="text-[15px] font-black">{(msg.sender?.full_name || 'U').charAt(0)}</span>}
                                            </div>

                                            <div className={`space-y-1.5 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-center gap-2">
                                                    {!isOwn && <span className="text-[13px] font-black text-[#1a1b4b] uppercase tracking-tight">{msg.sender?.full_name}</span>}
                                                    <span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isOwn && (
                                                        <button 
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50"
                                                            title="Delete message"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className={`p-4 rounded-3xl text-[17px] font-bold shadow-sm ${isOwn ? 'bg-[#1a1b4b] text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-600 rounded-tl-none'}`}>
                                                    {msg.content && <p className="leading-relaxed">{msg.content}</p>}
                                                    {msg.file_url && (
                                                        <FileAttachment 
                                                            msg={msg} 
                                                            isOwn={isOwn} 
                                                            onPreview={setPreviewFile} 
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={msgEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-6 bg-white border-t border-gray-100 z-10 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
                            {file && (
                                <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-400 shadow-sm border border-indigo-100"><Paperclip size={18} /></div>
                                        <div>
                                            <p className="text-[13px] font-black text-[#1a1b4b] uppercase tracking-tight">{file.name}</p>
                                            <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Ready to upload · {(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setFile(null)} className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-red-500"><X size={16} /></button>
                                </div>
                            )}
                            <form onSubmit={handleSend} className="flex items-center gap-4 bg-gray-50 p-2 rounded-[2rem] border border-gray-100 shadow-inner focus-within:ring-2 focus-within:ring-[#1a1b4b]/5 transition-all">
                                <input type="file" hidden ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0])} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-4 hover:bg-white rounded-full transition-all text-gray-400 hover:text-[#1a1b4b] hover:rotate-12"><Paperclip size={20} /></button>
                                <input type="text" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Type your academic message here..." className="flex-1 bg-transparent border-none outline-none text-[17px] font-bold text-[#1a1b4b] placeholder:text-gray-300 py-2" />
                                <div className="flex items-center gap-1 px-2">
                                    <button type="button" className="p-3 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-amber-400"><Smile size={20} /></button>
                                    <button type="button" className="p-3 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-indigo-400"><Mic size={20} /></button>
                                </div>
                                <button type="submit" disabled={(!newMsg.trim() && !file) || sending} className="bg-[#1a1b4b] p-4 rounded-full text-white shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                                    {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} strokeWidth={3} />}
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-20 select-none">
                        <MessageSquare size={80} strokeWidth={1} className="text-gray-300 mb-6" />
                        <h2 className="text-[39px] font-black text-[#1a1b4b] uppercase tracking-tighter mb-2">Secure Academic Vector</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">Initialize discussion channel to begin interaction</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default Discussions;
