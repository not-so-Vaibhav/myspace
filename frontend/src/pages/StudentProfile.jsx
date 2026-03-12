import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, GraduationCap, Heart, BookOpen, Users, MessageSquare, Stethoscope, MoreHorizontal, Edit2, Camera, ChevronRight, Save, X } from 'lucide-react';

// ─── Reusable field row ─────────────────────────────────────────────────────
const Field = ({ label, value, editing, onChange, name, type = 'text', options }) => (
    <div className="flex items-start py-2 border-b border-gray-100 last:border-b-0 gap-2">
        <span className="text-xs text-gray-400 font-semibold w-40 shrink-0 pt-1">{label}:</span>
        {editing ? (
            options ? (
                <select
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    className="flex-1 text-xs text-[#1a1b4b] font-semibold bg-[#f4f6fa] border border-[#1a1b4b]/10 rounded-lg px-2 py-1 outline-none focus:border-[#1a1b4b]/30"
                >
                    <option value="">— Select —</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            ) : (
                <input
                    name={name}
                    type={type}
                    value={value || ''}
                    onChange={onChange}
                    className="flex-1 text-xs text-[#1a1b4b] font-semibold bg-[#f4f6fa] border border-[#1a1b4b]/10 rounded-lg px-2 py-1 outline-none focus:border-[#1a1b4b]/30"
                />
            )
        ) : (
            <span className="flex-1 text-xs text-[#1a1b4b] font-semibold">{value || <span className="text-gray-300">—</span>}</span>
        )}
    </div>
);

// ─── Section card ────────────────────────────────────────────────────────────
const SectionCard = ({ title, icon: Icon, color, fields, data, onSave }) => {
    const [editing, setEditing] = useState(false);
    const [local, setLocal] = useState(data);

    const handleChange = (e) => setLocal(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSave = () => {
        onSave(local);
        setEditing(false);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-3 ${color} border-b border-gray-100`}>
                <div className="flex items-center gap-2">
                    <Icon size={16} className="text-[#1a1b4b]" />
                    <span className="text-sm font-black text-[#1a1b4b] uppercase tracking-wider">{title}</span>
                </div>
                {editing ? (
                    <div className="flex gap-2">
                        <button onClick={handleSave} className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-full transition-all">
                            <Save size={12} /> Save
                        </button>
                        <button onClick={() => { setLocal(data); setEditing(false); }} className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-all">
                            <X size={12} /> Cancel
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs font-bold text-[#1a1b4b]/60 hover:text-[#1a1b4b] bg-white/60 hover:bg-white px-3 py-1 rounded-full transition-all">
                        <Edit2 size={12} /> Edit
                    </button>
                )}
            </div>
            {/* Fields */}
            <div className="px-5 py-3">
                {fields.map(f => (
                    <Field key={f.name} label={f.label} name={f.name} value={local[f.name]} type={f.type} options={f.options} editing={editing} onChange={handleChange} />
                ))}
            </div>
            <div className="px-5 pb-3 flex justify-end">
                <span className="text-[10px] font-black text-[#1a1b4b]/30 uppercase tracking-widest flex items-center gap-1 cursor-pointer hover:text-[#1a1b4b]/60 transition-all">
                    More Info <ChevronRight size={10} />
                </span>
            </div>
        </div>
    );
};

// ─── Tab sections ─────────────────────────────────────────────────────────────
const QualificationsTab = ({ data, setData }) => {
    const [editing, setEditing] = useState(false);
    const [local, setLocal] = useState(data);
    const handleChange = (e) => setLocal(p => ({ ...p, [e.target.name]: e.target.value }));

    const fields = [
        [
            { label: 'Exam Name', name: 'examName' },
            { label: 'Educational Level', name: 'educationalLevel', options: ['10th', '10+2', 'Graduate', 'Post Graduate'] },
            { label: 'Board Name', name: 'boardName' },
        ],
        [
            { label: 'University Name', name: 'universityName' },
            { label: 'University Type', name: 'universityType', options: ['State', 'Central', 'Deemed', 'Private'] },
            { label: 'Institute Name', name: 'instituteName' },
        ],
        [
            { label: 'Institute', name: 'institute' },
            { label: 'Qualification Type', name: 'qualificationType' },
            { label: 'Qualification Year', name: 'qualificationYear', type: 'number' },
        ],
        [
            { label: 'Qualification Month', name: 'qualificationMonth', options: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] },
            { label: 'Qualification Degree', name: 'qualificationDegree' },
            { label: 'Score Type', name: 'scoreType', options: ['Percentage', 'CGPA', 'Grade'] },
        ],
        [
            { label: 'Max Score', name: 'maxScore', type: 'number' },
            { label: 'Score', name: 'score', type: 'number' },
            { label: 'Program Mode', name: 'programMode', options: ['Regular', 'Distance', 'Online'] },
        ],
        [
            { label: 'Qualification Score', name: 'qualificationScore', type: 'number' },
            { label: 'Discipline', name: 'discipline' },
            { label: 'Specialization', name: 'specialization' },
        ],
        [
            { label: 'Previous School Address', name: 'prevSchoolAddress' },
            { label: 'Reason for Change', name: 'reasonForChange' },
            { label: 'Is Complete', name: 'isComplete', options: ['Yes', 'No'] },
        ],
    ];

    return (
        <div>
            <div className="flex justify-end mb-4">
                {editing ? (
                    <div className="flex gap-2">
                        <button onClick={() => { setData(local); setEditing(false); }} className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full transition-all">
                            <Save size={12} /> Save
                        </button>
                        <button onClick={() => { setLocal(data); setEditing(false); }} className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-all">
                            <X size={12} /> Cancel
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs font-bold text-[#1a1b4b]/60 hover:text-[#1a1b4b] border border-[#1a1b4b]/10 hover:border-[#1a1b4b]/30 px-4 py-2 rounded-full transition-all">
                        <Edit2 size={12} /> Edit
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {fields.map((row, ri) => (
                    <div key={ri} className="contents">
                        {row.map(f => (
                            <div key={f.name} className="flex flex-col p-4 border-b border-r border-gray-100">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">{f.label}</span>
                                {editing ? (
                                    f.options ? (
                                        <select name={f.name} value={local[f.name] || ''} onChange={handleChange}
                                            className="text-sm text-[#1a1b4b] font-bold bg-[#f4f6fa] border border-[#1a1b4b]/10 rounded-lg px-2 py-1 outline-none">
                                            <option value="">— Select —</option>
                                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : (
                                        <input type={f.type || 'text'} name={f.name} value={local[f.name] || ''} onChange={handleChange}
                                            className="text-sm text-[#1a1b4b] font-bold bg-[#f4f6fa] border border-[#1a1b4b]/10 rounded-lg px-2 py-1 outline-none" />
                                    )
                                ) : (
                                    <span className="text-sm font-bold text-[#1a1b4b]">{local[f.name] || <span className="text-gray-300 text-xs">Not filled</span>}</span>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ExamDetailsTab = ({ data, setData }) => {
    const [editing, setEditing] = useState(false);
    const [local, setLocal] = useState(data);
    const handleChange = (e) => setLocal(p => ({ ...p, [e.target.name]: e.target.value }));

    const fields = [
        [
            { label: 'Exam Name', name: 'examName' },
            { label: 'Score Type', name: 'scoreType' },
            { label: 'Qualification Marks', name: 'qualificationMarks' },
            { label: 'Center Code', name: 'centerCode' },
        ],
        [
            { label: 'Exam Year', name: 'examYear', type: 'number' },
            { label: 'Max Score', name: 'maxScore', type: 'number' },
            { label: 'All India Rank', name: 'allIndiaRank' },
        ],
        [
            { label: 'Roll No', name: 'rollNo' },
            { label: 'Score', name: 'score', type: 'number' },
            { label: 'State Rank', name: 'stateRank' },
        ],
    ];

    return (
        <div>
            <div className="flex justify-end mb-4">
                {editing ? (
                    <div className="flex gap-2">
                        <button onClick={() => { setData(local); setEditing(false); }} className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full transition-all">
                            <Save size={12} /> Save
                        </button>
                        <button onClick={() => { setLocal(data); setEditing(false); }} className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-all">
                            <X size={12} /> Cancel
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs font-bold text-[#1a1b4b]/60 hover:text-[#1a1b4b] border border-[#1a1b4b]/10 hover:border-[#1a1b4b]/30 px-4 py-2 rounded-full transition-all">
                        <Edit2 size={12} /> Edit
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {fields.map((row, ri) => (
                    <div key={ri} className="contents">
                        {row.map(f => (
                            <div key={f.name} className="flex flex-col p-4 border-b border-r border-gray-100">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">{f.label}</span>
                                {editing ? (
                                    <input type={f.type || 'text'} name={f.name} value={local[f.name] || ''} onChange={handleChange}
                                        className="text-sm text-[#1a1b4b] font-bold bg-[#f4f6fa] border border-[#1a1b4b]/10 rounded-lg px-2 py-1 outline-none" />
                                ) : (
                                    <span className="text-sm font-bold text-[#1a1b4b]">{local[f.name] || <span className="text-gray-300 text-xs">Not filled</span>}</span>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

const CourseWareTab = ({ data, setData }) => {
    const [editing, setEditing] = useState(false);
    const [local, setLocal] = useState(data);
    const handleChange = (e) => setLocal(p => ({ ...p, [e.target.name]: e.target.value }));

    const fields = [
        [
            { label: 'Course', name: 'course' },
        ],
        [
            { label: 'Start Date', name: 'startDate', type: 'date' },
        ],
        [
            { label: 'End Date', name: 'endDate', type: 'date' },
        ],
    ];

    return (
        <div>
            <div className="flex justify-end mb-4">
                {editing ? (
                    <div className="flex gap-2">
                        <button onClick={() => { setData(local); setEditing(false); }} className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full transition-all">
                            <Save size={12} /> Save
                        </button>
                        <button onClick={() => { setLocal(data); setEditing(false); }} className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-all">
                            <X size={12} /> Cancel
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs font-bold text-[#1a1b4b]/60 hover:text-[#1a1b4b] border border-[#1a1b4b]/10 hover:border-[#1a1b4b]/30 px-4 py-2 rounded-full transition-all">
                        <Edit2 size={12} /> Edit
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[160px]">
                {fields.map((row, ri) => (
                    <div key={ri} className="contents relative">
                        {row.map(f => (
                            <div key={f.name} className="flex flex-col p-4 border-r border-gray-100 last:border-r-0">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">{f.label}</span>
                                {editing ? (
                                    <input type={f.type || 'text'} name={f.name} value={local[f.name] || ''} onChange={handleChange}
                                        className="text-sm text-[#1a1b4b] font-bold bg-[#f4f6fa] border border-[#1a1b4b]/10 rounded-lg px-2 py-1 outline-none" />
                                ) : (
                                    <span className="text-sm font-bold text-[#1a1b4b]">{local[f.name] || <span className="text-gray-300 text-xs">Not filled</span>}</span>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Main Profile Page ────────────────────────────────────────────────────────
const StudentProfile = () => {
    const { user, profile, fetchProfile } = useAuth();
    const fileRef = useRef();

    const [avatarSrc, setAvatarSrc] = useState(null);
    const [activeTab, setActiveTab] = useState('qualifications');

    const [academic, setAcademic] = useState({
        rollNo: 'ADT24SOC1414', regNo: 'ADT24SOC1414', physicalSite: '12SSOC-MIT Sch...', site: '12SSOC-MIT Sch...',
        batchName: '2024 B.Tech. in C...', semester: 'Semester IV', classSection: 'CLASS - 4 - 1', dateOfAdmission: '2024-05-31',
    });

    const [personal, setPersonal] = useState({
        dob: '', placeOfBirth: '', countryOfBirth: '', gender: '',
        email: profile?.email || '', mobile: '', bloodGroup: '', nationality: 'Indian',
    });

    const [guardian, setGuardian] = useState({
        guardianType: '', guardianName: '', mobile: '', landline: '', email: '', address: '', age: '', dob: '',
    });

    const [qualData, setQualData] = useState({
        examName: '', educationalLevel: '10+2', boardName: '', universityName: 'GSEB', universityType: '',
        instituteName: '', institute: '', qualificationType: '', qualificationYear: '2024', qualificationMonth: '',
        qualificationDegree: '', scoreType: '', maxScore: '', score: '71', programMode: '', qualificationScore: '',
        discipline: '', specialization: '', prevSchoolAddress: '', reasonForChange: '', isComplete: '',
    });

    const [examData, setExamData] = useState({
        examName: '', scoreType: '', qualificationMarks: '', centerCode: '',
        examYear: '', maxScore: '', allIndiaRank: '',
        rollNo: '', score: '', stateRank: '',
    });

    const [courseWareData, setCourseWareData] = useState({
        course: '', startDate: '', endDate: ''
    });

    const [editingName, setEditingName] = useState(false);
    const [localName, setLocalName] = useState(profile?.full_name || '');

    useEffect(() => {
        if (profile?.full_name) setLocalName(profile.full_name);
    }, [profile?.full_name]);

    const handleSaveName = async () => {
        if (!localName.trim() || !user?.id) return;
        try {
            const { error } = await supabase.from('profiles').update({ full_name: localName }).eq('id', user.id);
            if (error) throw error;
            if (fetchProfile) fetchProfile(user.id);
            setEditingName(false);
        } catch (error) {
            console.error('Error updating name:', error);
            alert('Failed to update name.');
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show immediate preview
        const objectUrl = URL.createObjectURL(file);
        setAvatarSrc(objectUrl);

        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}-${Math.random()}.${fileExt}`;

            // Attempt to upload to "avatars" bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                console.warn('Storage upload failed, attempting fallback to base64...', uploadError);
                // Fallback to Base64 if bucket doesn't exist
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = async () => {
                    const base64Str = reader.result;
                    await supabase.from('profiles').update({ avatar_url: base64Str }).eq('id', user.id);
                    if (fetchProfile) fetchProfile(user.id);
                };
                return;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update user's profile record
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Trigger global state update
            if (fetchProfile) fetchProfile(user.id);

        } catch (error) {
            console.error('Error handling avatar:', error);
            alert('Failed to update avatar.');
        }
    };

    const sideNav = [
        { id: 'qualifications', label: 'Qualifications/C...', icon: GraduationCap },
        { id: 'family', label: 'Family Details', icon: Users },
        { id: 'remarks', label: 'Remarks', icon: MessageSquare },
        { id: 'health', label: 'Health', icon: Stethoscope },
        { id: 'additional', label: 'Additional Details', icon: MoreHorizontal },
        { id: 'other', label: 'Other Info', icon: BookOpen },
    ];

    const qualTabs = [
        { id: 'educational', label: 'Educational Qualifications' },
        { id: 'exam', label: 'Exam Details' },
        { id: 'courseware', label: 'Course Ware' },
    ];
    const [qualTab, setQualTab] = useState('educational');

    return (
        <div className="p-6 sm:p-8 min-h-screen bg-[var(--color-surface-muted)]">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6 text-xs font-bold text-[#1a1b4b]/40 uppercase tracking-widest">
                <span>Home</span>
                <ChevronRight size={12} />
                <span className="text-[#1a1b4b]">Profile</span>
                <span className="ml-auto text-[#1a1b4b] flex items-center gap-2">
                    <User size={14} />
                    {profile?.full_name?.toUpperCase() || 'STUDENT'}
                </span>
            </div>

            {/* Top 3 section cards + avatar */}
            <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_1fr_1fr] gap-4 mb-6">
                {/* Avatar */}
                <div className="flex flex-col items-center justify-start gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="relative group cursor-pointer" onClick={() => fileRef.current.click()}>
                        <div className="w-28 h-28 rounded-2xl overflow-hidden bg-[#f4f6fa] border-2 border-[#1a1b4b]/10 shadow-inner">
                            {(avatarSrc || profile?.avatar_url)
                                ? <img src={avatarSrc || profile?.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-[#1a1b4b]/20">
                                    <User size={48} />
                                </div>
                            }
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera size={20} className="text-white" />
                        </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

                    {editingName ? (
                        <div className="flex flex-col items-center gap-2 w-full mt-2">
                            <input
                                type="text"
                                value={localName}
                                onChange={(e) => setLocalName(e.target.value)}
                                className="text-sm font-black text-[#1a1b4b] text-center bg-[#f4f6fa] border border-[#1a1b4b]/10 rounded-lg px-2 py-1.5 w-full outline-none focus:border-[#1a1b4b]/30 shadow-inner"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button onClick={handleSaveName} className="flex items-center justify-center p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-all shadow-sm">
                                    <Save size={14} />
                                </button>
                                <button onClick={() => { setLocalName(profile?.full_name || ''); setEditingName(false); }} className="flex items-center justify-center p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg transition-all shadow-sm">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group mt-2">
                            <span className="text-sm font-black text-[#1a1b4b] text-center">{profile?.full_name || 'Your Name'}</span>
                            <button onClick={() => setEditingName(true)} className="opacity-0 group-hover:opacity-100 text-[#1a1b4b]/40 hover:text-[#1a1b4b] transition-all p-1 rounded-full hover:bg-gray-100">
                                <Edit2 size={12} strokeWidth={3} />
                            </button>
                        </div>
                    )}

                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Student</span>
                </div>

                {/* Academic */}
                <SectionCard
                    title="Academic Details"
                    icon={GraduationCap}
                    color="bg-blue-50"
                    data={academic}
                    onSave={setAcademic}
                    fields={[
                        { label: 'Student Roll No', name: 'rollNo' },
                        { label: 'Registration No', name: 'regNo' },
                        { label: 'Physical Site', name: 'physicalSite' },
                        { label: 'Site', name: 'site' },
                        { label: 'Batch Name', name: 'batchName' },
                        { label: 'Semester', name: 'semester', options: ['Semester I', 'Semester II', 'Semester III', 'Semester IV', 'Semester V', 'Semester VI', 'Semester VII', 'Semester VIII'] },
                        { label: 'Class', name: 'classSection' },
                        { label: 'Date of Admission', name: 'dateOfAdmission', type: 'date' },
                    ]}
                />

                {/* Personal */}
                <SectionCard
                    title="Personal Details"
                    icon={User}
                    color="bg-violet-50"
                    data={personal}
                    onSave={setPersonal}
                    fields={[
                        { label: 'Date of Birth', name: 'dob', type: 'date' },
                        { label: 'Place of Birth', name: 'placeOfBirth' },
                        { label: 'Country of Birth', name: 'countryOfBirth' },
                        { label: 'Gender', name: 'gender', options: ['Male', 'Female', 'Other'] },
                        { label: 'Email ID', name: 'email', type: 'email' },
                        { label: 'Mobile Number', name: 'mobile', type: 'tel' },
                        { label: 'Blood Group', name: 'bloodGroup', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
                        { label: 'Nationality', name: 'nationality' },
                    ]}
                />

                {/* Emergency/Guardian */}
                <SectionCard
                    title="Emergency Guardian"
                    icon={Heart}
                    color="bg-rose-50"
                    data={guardian}
                    onSave={setGuardian}
                    fields={[
                        { label: 'Guardian Type', name: 'guardianType', options: ['Father', 'Mother', 'Sibling', 'Spouse', 'Other'] },
                        { label: 'Guardian Name', name: 'guardianName' },
                        { label: 'Mobile Number', name: 'mobile', type: 'tel' },
                        { label: 'Landline', name: 'landline', type: 'tel' },
                        { label: 'Email ID', name: 'email', type: 'email' },
                        { label: 'Address', name: 'address' },
                        { label: 'Age', name: 'age', type: 'number' },
                        { label: 'Date of Birth', name: 'dob', type: 'date' },
                    ]}
                />
            </div>

            {/* Bottom section: side nav + main content */}
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
                {/* Side nav */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {sideNav.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all text-xs font-black uppercase tracking-wider border-l-4 ${activeTab === id
                                ? 'border-[#1a1b4b] bg-[#f4f6fa] text-[#1a1b4b]'
                                : 'border-transparent text-gray-400 hover:bg-gray-50 hover:text-[#1a1b4b]'
                                }`}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Main content */}
                <div>
                    {activeTab === 'qualifications' && (
                        <div>
                            {/* Sub-tabs */}
                            <div className="flex gap-1 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-2 w-fit">
                                {qualTabs.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setQualTab(t.id)}
                                        className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${qualTab === t.id ? 'bg-[#1a1b4b] text-white shadow-md' : 'text-gray-400 hover:text-[#1a1b4b]'
                                            }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {qualTab === 'educational' && (
                                <QualificationsTab data={qualData} setData={setQualData} />
                            )}
                            {qualTab === 'exam' && (
                                <ExamDetailsTab data={examData} setData={setExamData} />
                            )}
                            {qualTab === 'courseware' && (
                                <CourseWareTab data={courseWareData} setData={setCourseWareData} />
                            )}
                        </div>
                    )}

                    {activeTab === 'family' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-sm text-gray-400 font-semibold">Family details section — coming soon.</div>
                    )}
                    {activeTab === 'remarks' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-sm text-gray-400 font-semibold">Remarks section — coming soon.</div>
                    )}
                    {activeTab === 'health' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-sm text-gray-400 font-semibold">Health section — coming soon.</div>
                    )}
                    {activeTab === 'additional' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-sm text-gray-400 font-semibold">Additional details section — coming soon.</div>
                    )}
                    {activeTab === 'other' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-sm text-gray-400 font-semibold">Other info section — coming soon.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
