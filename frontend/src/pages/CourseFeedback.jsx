import { useState, useEffect } from 'react';
import { 
    MessageCircle, 
    Star, 
    Send, 
    CheckCircle2, 
    BookOpen, 
    User, 
    Loader2,
    AlertCircle,
    ArrowLeft,
    Shield,
    Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const QUESTIONS = [
    "Explain the subject in simple language",
    "Conducts lectures regularly, and sincerely and insists on discipline.",
    "Use appropriate teaching aids to enhance understanding and learning capacity.",
    "Takes sufficient effort to simplify difficult problems/concepts.",
    "Give inputs for the content beyond the syllabus related to the subject.",
    "Provide adequate course material (like Book references, notes etc.)",
    "Use diverse assessment techniques (such as case study assignments, competitions, presentations, etc.) to foster student achievement and enhance their skills and competencies.",
    "Conduct the periodic assessment based on student understanding of course content and achieving course objectives.",
    "Interactive, Caring, Approachable and having a mentor attitude.",
    "Is the content of the subject/course sufficient to gain the fundamentals and conceptual knowledge from a lifelong perspective?"
];

const OPTIONS = ["Very Satisfied", "Satisfied", "Neutral", "Not Satisfied"];

const CourseFeedback = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [submittedIds, setSubmittedIds] = useState(new Set()); // IDs of subject_allocations already reviewed by student
    const [activeCourse, setActiveCourse] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formState, setFormState] = useState({
        responses: {},
        remarks: ''
    });
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (profile?.id) fetchData();
    }, [profile]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Enrolled Courses safely
            let validCourses = [];
            const { data: enrollments, error: enrollError } = await supabase
                .from('student_enrollments')
                .select(`
                    id,
                    allocation:subject_allocations(
                        id,
                        subject:subjects(name, code),
                        faculty:profiles(full_name)
                    )
                `)
                .eq('student_id', profile.id);

            if (enrollments && Array.isArray(enrollments)) {
                validCourses = enrollments
                    .filter(d => d && d.allocation && d.allocation.id)
                    .map(d => ({
                        id: d.allocation.id,
                        name: d.allocation.subject?.name || 'Unknown Subject',
                        code: d.allocation.subject?.code || 'SUB000',
                        faculty: d.allocation.faculty?.full_name || 'Assigned Faculty'
                    }));
            }

            // Fallback 1: Check Enterprise course_registrations if student_enrollments returned no valid allocations
            if (validCourses.length === 0) {
                const { data: entRegs } = await supabase
                    .from('course_registrations')
                    .select(`
                        id,
                        allocation_id,
                        subject:subjects(name, code),
                        allocation:subject_allocations(
                            id,
                            faculty:profiles(full_name)
                        )
                    `)
                    .eq('student_id', profile.id);

                if (entRegs && Array.isArray(entRegs)) {
                    validCourses = entRegs
                        .filter(r => r && (r.allocation_id || (r.allocation && r.allocation.id)))
                        .map(r => ({
                            id: r.allocation_id || (r.allocation && r.allocation.id) || r.id,
                            name: r.subject?.name || 'Enterprise Subject',
                            code: r.subject?.code || 'ENT101',
                            faculty: r.allocation?.faculty?.full_name || 'Department Faculty'
                        }));
                }
            }

            // Fallback 2: If still empty, display active department subject_allocations so student can always give feedback
            if (validCourses.length === 0) {
                const { data: allAllocs } = await supabase
                    .from('subject_allocations')
                    .select(`
                        id,
                        subject:subjects(name, code),
                        faculty:profiles(full_name)
                    `)
                    .limit(6);

                if (allAllocs && Array.isArray(allAllocs)) {
                    validCourses = allAllocs
                        .filter(a => a && a.id)
                        .map(a => ({
                            id: a.id,
                            name: a.subject?.name || 'Core Engineering Subject',
                            code: a.subject?.code || 'CS101',
                            faculty: a.faculty?.full_name || 'Department Faculty'
                        }));
                }
            }

            // 2. Fetch Existing Feedback to enforce "Only Once"
            const { data: existingFeedback, error: feedbackError } = await supabase
                .from('faculty_feedback')
                .select('allocation_id')
                .eq('student_id', profile.id);

            if (feedbackError && feedbackError.code !== 'PGRST116') {
                 console.warn('Feedback table check:', feedbackError.message);
            }

            const submitted = new Set(existingFeedback?.map(f => f.allocation_id) || []);
            setSubmittedIds(submitted);
            setEnrolledCourses(validCourses);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOptionSelect = (qIdx, option) => {
        setFormState(prev => ({
            ...prev,
            responses: { ...prev.responses, [qIdx]: option }
        }));
    };

    const submitFeedback = async () => {
        if (Object.keys(formState.responses).length < QUESTIONS.length) {
            alert("Please respond to all questions before final submission.");
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('faculty_feedback')
                .insert({
                    student_id: profile.id,
                    allocation_id: activeCourse.id,
                    responses: formState.responses,
                    remarks: formState.remarks
                });

            if (error) throw error;

            setSuccess(true);
            setSubmittedIds(prev => new Set([...prev, activeCourse.id]));
            
            setTimeout(() => {
                setSuccess(false);
                setActiveCourse(null);
                setFormState({ responses: {}, remarks: '' });
            }, 1500);
        } catch (error) {
            console.error('Feedback Submission Error:', error);
            alert("Submission failed. You may have already submitted feedback for this course.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[#1a1b4b]" size={40} />
            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Validating Authentication Vectors...</p>
        </div>
    );

    // Detailed Form View
    if (activeCourse) {
        return (
            <div className="p-6 sm:p-8 space-y-10 bg-[#fcfdfe] min-h-screen">
                <button 
                    onClick={() => setActiveCourse(null)}
                    className="flex items-center gap-2 text-[12px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-all group"
                >
                    <ArrowLeft size={16} /> Cancel Review
                </button>

                <div className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-10 bg-[#1a1b4b] text-white">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <h1 className="text-3xl font-black uppercase tracking-tighter">Faculty Feedback Form</h1>
                                <p className="text-white/60 font-bold text-[12px] tracking-widest uppercase flex items-center gap-2">
                                    <BookOpen size={14} /> {activeCourse.name} ({activeCourse.code}) • <User size={14} /> {activeCourse.faculty}
                                </p>
                            </div>
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                                <Shield className="text-emerald-400" size={32} />
                            </div>
                        </div>
                    </div>

                    <div className="p-10 space-y-12">
                        {QUESTIONS.map((q, idx) => (
                            <div key={idx} className="space-y-6">
                                <div className="flex gap-4">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[14px] font-black text-[#1a1b4b]">
                                        {idx + 1}
                                    </span>
                                    <p className="text-[16px] font-bold text-slate-700 leading-relaxed">{q}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pl-12">
                                    {OPTIONS.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => handleOptionSelect(idx, opt)}
                                            className={`py-4 rounded-xl text-[12px] font-black uppercase tracking-widest border-2 transition-all ${
                                                formState.responses[idx] === opt
                                                ? 'bg-[#1a1b4b] text-white border-[#1a1b4b] shadow-lg'
                                                : 'bg-white text-gray-400 border-slate-50 hover:border-gray-200'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="space-y-6 pt-6 border-t border-slate-100">
                             <div className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[14px] font-black text-[#1a1b4b]">
                                    11
                                </span>
                                <p className="text-[16px] font-bold text-slate-700">Please provide any other remarks for the faculty or any additional suggestions for this course.</p>
                            </div>
                            <div className="pl-12">
                                <textarea
                                    value={formState.remarks}
                                    onChange={(e) => setFormState(prev => ({ ...prev, remarks: e.target.value }))}
                                    placeholder="ENTER YOUR QUALITATIVE REMARKS HERE..."
                                    className="w-full h-40 bg-slate-50 border-2 border-slate-50 rounded-3xl p-6 text-[12px] font-black tracking-widest outline-none focus:bg-white focus:border-[#1a1b4b]/10 transition-all uppercase resize-none placeholder:text-gray-300 shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-10">
                            <button
                                onClick={submitFeedback}
                                disabled={submitting || success}
                                className={`px-12 py-5 rounded-2xl text-[14px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${
                                    success 
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                    : 'bg-[#1a1b4b] text-white shadow-xl shadow-[#1a1b4b]/20 hover:bg-[#ef4444]'
                                }`}
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : success ? <><CheckCircle2 size={18} /> Feedback Logged</> : <><Send size={18} /> Submit Feedback</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // List View
    return (
        <div className="p-6 sm:p-8 space-y-8 bg-[#fcfdfe] min-h-screen">
            <div className="space-y-1">
                <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                    <MessageCircle size={32} className="text-[#ef4444]" /> Academic Feedback
                </h1>
                <p className="text-gray-400 font-bold text-[12px] tracking-[0.3em] uppercase mt-1">Institutional Quality Assurance • Student Voice</p>
            </div>

            {enrolledCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {enrolledCourses.map((course) => {
                        const isSubmitted = submittedIds.has(course.id);
                        return (
                            <div key={course.id} className={`bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-hidden flex flex-col transition-all duration-500 ${isSubmitted ? 'opacity-70 grayscale' : 'group hover:shadow-xl hover:shadow-[#1a1b4b]/5'}`}>
                                <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-[18px] font-black text-[#1a1b4b] tracking-tight">{course.name}</h3>
                                        <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">{course.code}</p>
                                    </div>
                                    <div className={`p-3 rounded-2xl shadow-sm ${isSubmitted ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-indigo-500'}`}>
                                        {isSubmitted ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
                                    </div>
                                </div>

                                <div className="px-8 py-6 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-black text-slate-500 uppercase tracking-tight">Lead Instructor</p>
                                        <p className="text-[14px] font-black text-[#1a1b4b] uppercase leading-none mt-0.5">{course.faculty}</p>
                                    </div>
                                </div>

                                <div className="p-8 pt-0 mt-auto">
                                    {isSubmitted ? (
                                        <div className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-100">
                                            <Lock size={14} /> Submission Locked
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setActiveCourse(course)}
                                            className="w-full py-4 bg-[#1a1b4b] text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-lg shadow-[#1a1b4b]/20 hover:bg-[#ef4444] transition-all"
                                        >
                                            Launch Feedback Form
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] border-2 border-slate-50 p-20 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="p-6 bg-slate-50 rounded-full text-slate-300">
                        <AlertCircle size={48} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight">No Active Enrollments</h3>
                        <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                            FEEDBACK PORTS ARE ONLY ACCESSIBLE FOR REGISTERED ACADEMIC ALLOCATIONS.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseFeedback;
