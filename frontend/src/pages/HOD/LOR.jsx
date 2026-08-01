import { useState } from 'react';
import { 
    GraduationCap, 
    MessageSquare, 
    Send, 
    User, 
    Star, 
    Award, 
    ChevronRight,
    CheckCircle2,
    X,
    Sparkles,
    Search,
    BookOpen,
    Quote
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const students = [
    {
        id: '1',
        name: 'Vaibhav Bariyar',
        role: 'B.Tech CSE - VII Sem',
        avatar: 'V',
        stats: { cgpa: '8.92', attendance: '94%' },
        achievements: ['Gold Medalist', 'Research Lead']
    },
    {
        id: '2',
        name: 'Vruti Moradiya',
        role: 'B.Tech CSE - VII Sem',
        avatar: 'V',
        stats: { cgpa: '9.10', attendance: '98%' },
        achievements: ['Tech Innovation Award', 'Dean\'s List']
    }
];

const LOR = () => {
    const { profile } = useAuth();
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [recommendation, setRecommendation] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (!recommendation.trim()) return;
        
        setSubmitting(true);
        // Simulate API call
        await new Promise(r => setTimeout(r, 1500));
        
        console.log(`LOR Submitted for ${selectedStudent.name}: ${recommendation}`);
        
        setSubmitting(false);
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setSelectedStudent(null);
            setRecommendation('');
        }, 2000);
    };

    return (
        <div className="p-8 sm:p-12 space-y-10 bg-[#f8fafc] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
                <div className="space-y-2 text-left">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#ef4444]/10 rounded-xl">
                            <GraduationCap className="text-[#ef4444]" size={24} />
                        </div>
                        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">Letters of Recommendation</h1>
                    </div>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase ml-12">Academic Excellence Endorsement Portal</p>
                </div>
                
                <div className="hidden lg:flex items-center gap-4">
                    <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                           <Award size={18} />
                        </div>
                        <div>
                            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Status</p>
                            <p className="text-sm font-black text-[#1a1b4b] tracking-tight">System Ready</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Student Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
                {students.map((student) => (
                    <div 
                        key={student.id} 
                        onClick={() => setSelectedStudent(student)}
                        className={`group relative bg-white rounded-[2.5rem] p-8 border-2 transition-all duration-500 cursor-pointer hover:shadow-2xl hover:shadow-[#1a1b4b]/10 hover:-translate-y-2 ${
                            selectedStudent?.id === student.id ? 'border-[#ef4444] shadow-xl' : 'border-slate-100 hover:border-[#1a1b4b]/20'
                        }`}
                    >
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                            <Sparkles size={80} className="text-[#1a1b4b]" />
                        </div>

                        <div className="flex items-start gap-6 relative z-10">
                            <div className={`w-20 h-20 rounded-[1.8rem] flex items-center justify-center text-3xl font-black shadow-lg transition-transform duration-500 group-hover:rotate-6 ${
                                student.id === '1' ? 'bg-gradient-to-br from-[#1a1b4b] to-[#2d3a8c] text-white' : 'bg-gradient-to-br from-[#ef4444] to-[#ff6b6b] text-white'
                            }`}>
                                {student.avatar}
                            </div>
                            
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-[#1a1b4b] tracking-tight">{student.name}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{student.role}</p>
                                <div className="flex gap-2 pt-2">
                                    {student.achievements.map((ach, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md text-[12px] font-black uppercase text-gray-400 tracking-widest">
                                            {ach}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-50">
                            <div className="space-y-1">
                                <p className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">Academic CGPA</p>
                                <p className="text-lg font-black text-[#1a1b4b]">{student.stats.cgpa}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">Attendance</p>
                                <p className="text-lg font-black text-emerald-500">{student.stats.attendance}</p>
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-between text-[#1a1b4b]">
                            <span className="text-[12px] font-black uppercase tracking-widest group-hover:translate-x-2 transition-transform duration-300">Produce Recommendation</span>
                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Recommendation Modal / Textbox Area */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-[#1a1b4b]/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 sm:p-12 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Modal Header Decoration */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1a1b4b] via-[#ef4444] to-[#1a1b4b]"></div>
                        
                        <div className="p-8 sm:p-12 space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-[#1a1b4b]/5 flex items-center justify-center text-[#1a1b4b]">
                                        <Quote size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-[#1a1b4b] tracking-tighter uppercase italic">Draft Recommendation</h2>
                                        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Endorsing: {selectedStudent.name}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedStudent(null)}
                                    className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <X size={20} strokeWidth={3} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[12px] font-black text-gray-400 uppercase tracking-widest ml-2">
                                    <Sparkles size={14} className="text-[#ef4444]" /> Compose professional endorsement
                                </div>
                                <div className="relative">
                                    <textarea 
                                        autoFocus
                                        value={recommendation}
                                        onChange={(e) => setRecommendation(e.target.value)}
                                        placeholder={`E.g., I have had the pleasure of observing ${selectedStudent.name}'s exceptional academic growth...`}
                                        className="w-full h-64 bg-slate-50 border border-slate-100 rounded-[2rem] p-8 text-sm font-bold text-[#1a1b4b] focus:bg-white focus:border-[#ef4444]/30 focus:shadow-xl focus:shadow-[#ef4444]/5 transition-all outline-none resize-none placeholder:text-gray-300 placeholder:italic leading-relaxed"
                                    />
                                    {submitted && (
                                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2rem] animate-in fade-in zoom-in-95">
                                            <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-4 animate-bounce">
                                                <CheckCircle2 size={40} />
                                            </div>
                                            <p className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter">LOR Submitted!</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setSelectedStudent(null)}
                                    className="px-8 py-5 bg-slate-50 text-slate-400 rounded-[1.5rem] text-[12px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                                >
                                    Discard
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={!recommendation.trim() || submitting}
                                    className="flex-1 px-8 py-5 bg-[#1a1b4b] text-white rounded-[1.5rem] text-[12px] font-black uppercase tracking-widest hover:bg-[#ef4444] transition-all shadow-xl shadow-[#1a1b4b]/10 flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale group"
                                >
                                    {submitting ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Submit Final LOR 
                                            <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LOR;
