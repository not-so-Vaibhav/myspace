import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
    User, 
    Briefcase, 
    GraduationCap, 
    FlaskConical, 
    Users, 
    CreditCard, 
    Edit2, 
    Camera, 
    ChevronRight, 
    Save, 
    X,
    Award,
    BookOpen,
    Building,
    Calendar,
    Mail,
    Phone,
    MapPin,
    Globe,
    KeyRound
} from 'lucide-react';
import ChangePasswordModal from '../../components/Auth/ChangePasswordModal';

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

    useEffect(() => {
        setLocal(data);
    }, [data]);

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
                <span className="text-[12px] font-black text-[#1a1b4b]/30 uppercase tracking-widest flex items-center gap-1 cursor-pointer hover:text-[#1a1b4b]/60 transition-all">
                    More Info <ChevronRight size={10} />
                </span>
            </div>
        </div>
    );
};

const FacultyProfile = () => {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const [showChangePassword, setShowChangePassword] = useState(false);
    
    // Mock faculty data - in real app, fetch from Supabase
    const [facultyData, setFacultyData] = useState({
        personal: {
            fullName: profile?.full_name || '',
            email: profile?.email || '',
            mobile: '+91 98765 43210',
            dob: '1985-05-15',
            gender: 'Male',
            bloodGroup: 'O+',
            nationality: 'Indian',
            maritalStatus: 'Married',
            panNo: 'ABCDE1234F',
            aadharNo: '1234 5678 9012'
        },
        professional: {
            empId: 'FAC2024001',
            designation: 'Associate Professor',
            department: 'Computer Science & Engineering',
            specialization: 'Artificial Intelligence & Machine Learning',
            joiningDate: '2020-07-01',
            empType: 'Full-time Permanent',
            officeLocation: 'Block B, Room 405',
            reportingTo: 'Dr. Sarah Wilson (HOD)'
        },
        qualifications: [
            { degree: 'Ph.D. in Computer Science', university: 'IIT Bombay', year: '2018', score: '9.5 CGPA' },
            { degree: 'M.Tech in AI', university: 'NIT Trichy', year: '2012', score: '8.8 CGPA' },
            { degree: 'B.E. in Computer Science', university: 'Pune University', year: '2010', score: '82%' }
        ],
        experience: {
            teaching: '12 Years',
            industry: '2 Years',
            research: '6 Years'
        },
        research: {
            papersPublished: '24',
            citations: '450',
            hIndex: '12',
            patents: '2',
            booksPublished: '1'
        },
        bank: {
            accountNo: '34567890123',
            bankName: 'HDFC Bank',
            branch: 'Main Campus Branch',
            ifsc: 'HDFC0001234'
        }
    });

    const handleUpdateSection = (section, newData) => {
        setFacultyData(prev => ({
            ...prev,
            [section]: newData
        }));
        // Here you would also update Supabase
    };

    return (
        <div className="p-8 sm:p-12 space-y-10 bg-[#fcfdfe] min-h-screen font-sans">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-[#1a1b4b] to-[#2d3a8c] p-1 shadow-2xl overflow-hidden group-hover:scale-[1.02] transition-all duration-500">
                            <div className="w-full h-full rounded-[2.3rem] bg-white overflow-hidden flex items-center justify-center relative">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-black text-[#1a1b4b]">
                                        {(profile?.full_name || 'F').charAt(0).toUpperCase()}
                                    </span>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <Camera className="text-white" size={24} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
                                {facultyData.personal.fullName}
                            </h1>
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                {facultyData.professional.designation}
                            </span>
                        </div>
                        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1 flex items-center gap-2">
                            <Building size={14} className="text-gray-300" /> {facultyData.professional.department} • {facultyData.professional.empId}
                        </p>
                        <div className="mt-4 flex gap-3">
                            <button className="px-5 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 transition-all active:scale-95">
                                Public Profile
                            </button>
                            <button className="px-5 py-2.5 bg-white text-[#1a1b4b] border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95">
                                Download CV
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowChangePassword(true)}
                                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all active:scale-95 flex items-center gap-1.5"
                            >
                                <KeyRound size={14} />
                                <span>Change Password</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-center min-w-[100px]">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Teaching</p>
                        <p className="text-xl font-black text-[#1a1b4b]">{facultyData.experience.teaching}</p>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-center min-w-[100px]">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Papers</p>
                        <p className="text-xl font-black text-[#1a1b4b]">{facultyData.research.papersPublished}</p>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-center min-w-[100px]">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Citations</p>
                        <p className="text-xl font-black text-[#ef4444]">{facultyData.research.citations}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1.5 bg-gray-50 rounded-[2rem] w-fit border border-gray-100/50">
                {[
                    { id: 'general', label: 'General Info', icon: User },
                    { id: 'professional', label: 'Professional', icon: Briefcase },
                    { id: 'academic', label: 'Academic/Research', icon: GraduationCap },
                    { id: 'other', label: 'Other Info', icon: Award }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-[#1a1b4b] shadow-sm scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Sidebar Info */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
                        <h2 className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest flex items-center gap-3 mb-4">
                            <Users size={18} className="text-[#ef4444]" /> Contact Information
                        </h2>
                        <div className="space-y-5">
                            <div className="flex items-center gap-4 group cursor-pointer">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Work Email</p>
                                    <p className="text-xs font-bold text-[#1a1b4b]">{facultyData.personal.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group cursor-pointer">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                    <Phone size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile</p>
                                    <p className="text-xs font-bold text-[#1a1b4b]">{facultyData.personal.mobile}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group cursor-pointer">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Office</p>
                                    <p className="text-xs font-bold text-[#1a1b4b]">{facultyData.professional.officeLocation}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#1a1b4b] to-[#2d3a8c] rounded-[2.5rem] p-8 text-white shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Award className="text-amber-400" size={24} />
                            <h3 className="text-sm font-black uppercase tracking-widest">Research Bio</h3>
                        </div>
                        <p className="text-xs font-bold text-white/70 leading-relaxed uppercase tracking-wider mb-6">
                            Dedicated educator and researcher with 12+ years of experience in the field of Artificial Intelligence. Focusing on developing ethical AI frameworks and sustainable machine learning models.
                        </p>
                        <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">H-Index</p>
                                <p className="text-lg font-black">{facultyData.research.hIndex}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Patents</p>
                                <p className="text-lg font-black">{facultyData.research.patents}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Books</p>
                                <p className="text-lg font-black">{facultyData.research.booksPublished}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Tab Content */}
                <div className="lg:col-span-8 space-y-10">
                    {activeTab === 'general' && (
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                            <SectionCard 
                                title="Personal Details" 
                                icon={User} 
                                color="bg-indigo-50/50"
                                fields={[
                                    { label: 'Full Name', name: 'fullName' },
                                    { label: 'Date of Birth', name: 'dob', type: 'date' },
                                    { label: 'Gender', name: 'gender', options: ['Male', 'Female', 'Other'] },
                                    { label: 'Blood Group', name: 'bloodGroup', options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] },
                                    { label: 'Nationality', name: 'nationality' },
                                    { label: 'Marital Status', name: 'maritalStatus', options: ['Single', 'Married', 'Divorced'] }
                                ]}
                                data={facultyData.personal}
                                onSave={(data) => handleUpdateSection('personal', data)}
                            />
                            <SectionCard 
                                title="Bank & ID Details" 
                                icon={CreditCard} 
                                color="bg-rose-50/50"
                                fields={[
                                    { label: 'PAN Number', name: 'panNo' },
                                    { label: 'Aadhar Number', name: 'aadharNo' },
                                    { label: 'Account Number', name: 'accountNo' },
                                    { label: 'Bank Name', name: 'bankName' },
                                    { label: 'IFSC Code', name: 'ifsc' }
                                ]}
                                data={{...facultyData.personal, ...facultyData.bank}}
                                onSave={(data) => handleUpdateSection('bank', data)}
                            />
                        </div>
                    )}

                    {activeTab === 'professional' && (
                        <div className="grid grid-cols-1 gap-8">
                            <SectionCard 
                                title="Institutional Profile" 
                                icon={Briefcase} 
                                color="bg-emerald-50/50"
                                fields={[
                                    { label: 'Employee ID', name: 'empId' },
                                    { label: 'Designation', name: 'designation' },
                                    { label: 'Department', name: 'department' },
                                    { label: 'Joining Date', name: 'joiningDate', type: 'date' },
                                    { label: 'Employee Type', name: 'empType', options: ['Full-time Permanent', 'Contract', 'Visiting'] },
                                    { label: 'Reporting To', name: 'reportingTo' }
                                ]}
                                data={facultyData.professional}
                                onSave={(data) => handleUpdateSection('professional', data)}
                            />
                            <SectionCard 
                                title="Work Experience" 
                                icon={Calendar} 
                                color="bg-amber-50/50"
                                fields={[
                                    { label: 'Teaching Experience', name: 'teaching' },
                                    { label: 'Industry Experience', name: 'industry' },
                                    { label: 'Research Experience', name: 'research' }
                                ]}
                                data={facultyData.experience}
                                onSave={(data) => handleUpdateSection('experience', data)}
                            />
                        </div>
                    )}

                    {activeTab === 'academic' && (
                        <div className="grid grid-cols-1 gap-8">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-3 bg-indigo-50/50 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <GraduationCap size={16} className="text-[#1a1b4b]" />
                                        <span className="text-sm font-black text-[#1a1b4b] uppercase tracking-wider">Educational Qualifications</span>
                                    </div>
                                    <button className="flex items-center gap-1 text-xs font-bold text-[#1a1b4b]/60 hover:text-[#1a1b4b] bg-white/60 hover:bg-white px-3 py-1 rounded-full transition-all">
                                        <Edit2 size={12} /> Edit
                                    </button>
                                </div>
                                <div className="p-0">
                                    <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-100 px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <span>Degree</span>
                                        <span>University</span>
                                        <span>Year</span>
                                        <span className="text-right">Score</span>
                                    </div>
                                    {facultyData.qualifications.map((q, idx) => (
                                        <div key={idx} className="grid grid-cols-4 px-5 py-4 border-b border-gray-50 last:border-b-0 group hover:bg-gray-50 transition-colors">
                                            <span className="text-xs font-black text-[#1a1b4b]">{q.degree}</span>
                                            <span className="text-xs font-bold text-gray-500">{q.university}</span>
                                            <span className="text-xs font-bold text-gray-500">{q.year}</span>
                                            <span className="text-xs font-black text-indigo-500 text-right">{q.score}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <SectionCard 
                                title="Research & Publications" 
                                icon={FlaskConical} 
                                color="bg-violet-50/50"
                                fields={[
                                    { label: 'Papers Published', name: 'papersPublished' },
                                    { label: 'Citations', name: 'citations' },
                                    { label: 'h-Index', name: 'hIndex' },
                                    { label: 'Patents Filed', name: 'patents' },
                                    { label: 'Books Published', name: 'booksPublished' }
                                ]}
                                data={facultyData.research}
                                onSave={(data) => handleUpdateSection('research', data)}
                            />
                        </div>
                    )}

                    {activeTab === 'other' && (
                        <div className="grid grid-cols-1 gap-8 text-center py-20 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                             <Award className="mx-auto text-gray-300" size={48} />
                             <div>
                                <h3 className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest">Advanced Profile Modules</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2 px-10">
                                    Additional modules like Grant Management, Conference History, and Consultancy Projects will be enabled soon.
                                </p>
                             </div>
                             <button className="mx-auto px-8 py-3 bg-white border border-gray-100 text-[#1a1b4b] rounded-2xl text-[11px] font-black uppercase tracking-widest hover:shadow-md transition-all">
                                Request Module Activation
                             </button>
                        </div>
                    )}
                </div>
            </div>
            <ChangePasswordModal
                isOpen={showChangePassword}
                onClose={() => setShowChangePassword(false)}
            />
        </div>
    );
};

export default FacultyProfile;
