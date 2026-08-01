import { useState, useEffect } from 'react';
import { 
    Award, 
    Star, 
    TrendingUp, 
    Users, 
    BookOpen, 
    MessageCircle, 
    CheckCircle2, 
    Loader2,
    Calendar,
    ArrowUpRight,
    Target,
    FileText,
    Activity,
    ClipboardCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const PerformanceAppraisal = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('My Performance'); // Controller for section visibility
    const [stats, setStats] = useState({
        avgSatisfaction: 0,
        totalReviews: 0,
        publishedPapers: 12,
        hIndex: 8,
        attendanceScore: '94%'
    });
    const [feedbackRows, setFeedbackRows] = useState([]);
    const [appraisalForm, setAppraisalForm] = useState({ q1: '', q2: '', q3: '', q4: '' });
    const [appraisalStatus, setAppraisalStatus] = useState(null);
    const [submittingAppraisal, setSubmittingAppraisal] = useState(false);
    const [appraisalQueue, setAppraisalQueue] = useState([]);

    useEffect(() => {
        if (profile?.id) fetchPerformanceData();
    }, [profile]);

    const fetchPerformanceData = async () => {
        setLoading(true);
        try {
            const { data: feedback, error } = await supabase
                .from('faculty_feedback')
                .select(`
                    id,
                    responses,
                    remarks,
                    created_at,
                    allocation:subject_allocations!inner(
                        id,
                        subject:subjects(name, code),
                        faculty_id
                    )
                `)
                .eq('allocation.faculty_id', profile.id);

            if (error) throw error;

            // Fetch Self Appraisal Status
            const { data: appraisal, error: appError } = await supabase
                .from('faculty_appraisals')
                .select('*')
                .eq('faculty_id', profile.id)
                .eq('academic_year', '2024-25')
                .maybeSingle();

            if (appraisal) {
                setAppraisalStatus(appraisal.status);
                setAppraisalForm(appraisal.responses || { q1: '', q2: '', q3: '', q4: '' });
            }

            if (feedback && feedback.length > 0) {
                let totalPercentage = 0;
                feedback.forEach(f => {
                    let rowScore = 0;
                    Object.values(f.responses).forEach(val => {
                        if (val === 'Very Satisfied') rowScore += 4;
                        else if (val === 'Satisfied') rowScore += 3;
                        else if (val === 'Neutral') rowScore += 2;
                        else if (val === 'Not Satisfied') rowScore += 1;
                    });
                    totalPercentage += (rowScore / (Object.keys(f.responses).length * 4)) * 100;
                });

                setStats(prev => ({
                    ...prev,
                    avgSatisfaction: Math.round(totalPercentage / feedback.length),
                    totalReviews: feedback.length
                }));
                setFeedbackRows(feedback);
            }

            if (['hod', 'dean', 'admin'].includes(profile.role)) {
                let query = supabase
                    .from('faculty_appraisals')
                    .select(`
                        id,
                        status,
                        created_at,
                        responses,
                        faculty:profiles(full_name)
                    `);
                
                if (profile.role === 'hod') query = query.eq('status', 'pending_hod');
                if (profile.role === 'dean') query = query.eq('status', 'pending_dean');
                
                const { data: queueData } = await query;
                if (queueData) setAppraisalQueue(queueData);
            }

        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const submitSelfAppraisal = async () => {
        if (!appraisalForm.q1 || !appraisalForm.q2 || !appraisalForm.q3 || !appraisalForm.q4) {
            alert("Please complete all fields before submitting.");
            return;
        }
        
        setSubmittingAppraisal(true);
        const targetStatus = profile.role === 'hod' ? 'pending_dean' : 'pending_hod';
        
        try {
            const { error } = await supabase
                .from('faculty_appraisals')
                .upsert({
                    faculty_id: profile.id,
                    academic_year: '2024-25',
                    responses: appraisalForm,
                    status: targetStatus
                }, { onConflict: 'faculty_id, academic_year' });
                
            if (error) throw error;
            setAppraisalStatus(targetStatus);
            setActiveTab('Appraisal Result');
        } catch (error) {
            console.error("Error submitting appraisal", error);
            alert("Failed to submit appraisal.");
        } finally {
            setSubmittingAppraisal(false);
        }
    };

    const handleAppraisalAction = async (id, action) => {
        let newStatus = action === 'approve' ? (profile.role === 'hod' ? 'pending_dean' : 'approved') : 'rejected';
        
        try {
            await supabase
                .from('faculty_appraisals')
                .update({ status: newStatus })
                .eq('id', id);
            
            setAppraisalQueue(prev => prev.filter(q => q.id !== id));
        } catch (error) {
            console.error("Action error", error);
        }
    };

    const modules = [
        { label: 'My Performance', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Student Feedback', icon: MessageCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Self Appraisal', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Activities & Research', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Appraisal Result', icon: ClipboardCheck, color: 'text-rose-600', bg: 'bg-rose-50' },
    ];

    if (['hod', 'dean', 'admin'].includes(profile?.role)) {
        modules.unshift({ label: 'Appraisal Queue', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' });
    }

    if (loading) return (
        <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[#1a1b4b]" size={40} />
            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Synthesizing Appraisal Metrics...</p>
        </div>
    );

    return (
        <div className="p-6 sm:p-8 space-y-10 bg-[#fcfdfe] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <Award size={32} className="text-[#ef4444]" /> Performance & Appraisal
                    </h1>
                    <p className="text-gray-400 font-bold text-[12px] tracking-[0.3em] uppercase mt-1">Institutional Growth Hub • Academic Audit Trail</p>
                </div>
                <div className="flex gap-4">
                     <div className="px-5 py-3 bg-white border-2 border-slate-50 text-[#1a1b4b] rounded-2xl flex items-center gap-2 text-[12px] font-black uppercase tracking-widest shadow-sm">
                        <Calendar size={16} /> 2024-25 Cycle
                    </div>
                </div>
            </div>

            {/* Core Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {modules.map((m) => (
                    <button
                        key={m.label}
                        onClick={() => setActiveTab(m.label)}
                        className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center text-center gap-4 group ${
                            activeTab === m.label 
                            ? 'bg-[#1a1b4b] border-[#1a1b4b] shadow-xl shadow-[#1a1b4b]/20 scale-[1.02]' 
                            : 'bg-white border-slate-50 hover:border-gray-200'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            activeTab === m.label ? 'bg-white/10 text-white' : `${m.bg} ${m.color}`
                        }`}>
                            <m.icon size={24} />
                        </div>
                        <span className={`text-[12px] font-black uppercase tracking-widest ${
                            activeTab === m.label ? 'text-white' : 'text-slate-500'
                        }`}>
                            {m.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Dynamic Content Section */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'Appraisal Queue' && (
                    <div className="space-y-6 max-w-5xl mx-auto">
                        <div className="flex items-center justify-between px-6 mb-2">
                             <h2 className="text-[14px] font-black text-slate-400 uppercase tracking-widest">Administrative Audit Queue</h2>
                             <div className="px-4 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-[12px] font-black uppercase tracking-widest shadow-inner">
                                 {appraisalQueue.length} Pending
                             </div>
                        </div>
                        {appraisalQueue.length > 0 ? appraisalQueue.map((item) => (
                            <div key={item.id} className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-50 shadow-sm space-y-6">
                                <div className="flex justify-between items-start border-b border-slate-50 pb-4">
                                    <div>
                                        <h3 className="text-[18px] font-black text-[#1a1b4b] uppercase tracking-tight">{item.faculty?.full_name || 'Faculty Member'}</h3>
                                        <p className="text-[12px] font-black text-gray-400 mt-1 uppercase tracking-widest">Self Appraisal • 2024-25</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => handleAppraisalAction(item.id, 'approve')} className="px-6 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all">
                                            Approve
                                        </button>
                                        <button onClick={() => handleAppraisalAction(item.id, 'reject')} className="px-6 py-2 bg-rose-50 text-rose-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all">
                                            Reject
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="space-y-4 pt-2">
                                    <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Faculty Responses:</h4>
                                    {Object.entries(item.responses || {}).map(([key, val], i) => val && (
                                        <div key={key} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                            <p className="text-[12px] font-black text-[#1a1b4b] mb-2">Q{i+1}:</p>
                                            <p className="text-[14px] font-bold text-slate-600 italic">"{val}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )) : (
                            <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-100">
                                 <CheckCircle2 size={48} className="mx-auto text-emerald-200 mb-6" />
                                 <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest">QUEUE IS CLEAR. NO PENDING APPRAISALS.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'My Performance' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border-2 border-slate-50 shadow-sm space-y-10">
                             <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                                <h2 className="text-[14px] font-black text-[#1a1b4b] uppercase tracking-widest">Efficiency Metrics</h2>
                                <p className="text-[12px] font-black text-emerald-500 uppercase flex items-center gap-1"><ArrowUpRight size={14} /> Exceeding Goals</p>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {[
                                    { label: 'Avg Student Satisfaction', value: stats.avgSatisfaction + '%', goal: 85, icon: Star, color: 'text-amber-500' },
                                    { label: 'Attendance Compliance', value: '94%', goal: 90, icon: CheckCircle2, color: 'text-emerald-500' },
                                    { label: 'Syllabus Coverage', value: '88%', goal: 100, icon: BookOpen, color: 'text-indigo-500' },
                                    { label: 'Evaluation Precision', value: '96%', goal: 95, icon: Target, color: 'text-blue-500' },
                                ].map((item, i) => (
                                    <div key={i} className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <item.icon size={20} className={item.color} />
                                                <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                                            </div>
                                            <span className="text-[16px] font-black text-[#1a1b4b]">{item.value}</span>
                                        </div>
                                        <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden shadow-inner">
                                            <div className={`h-full ${item.color.replace('text', 'bg')} opacity-80`} style={{ width: item.value.replace('%', '') + '%' }}></div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>

                        <div className="bg-[#1a1b4b] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                            <TrendingUp className="absolute -right-10 -bottom-10 text-white/5" size={240} />
                            <div className="space-y-2 relative z-10">
                                <h3 className="text-white/50 text-[12px] font-black uppercase tracking-widest">Publication Score</h3>
                                <p className="text-6xl font-black text-white tracking-tighter">8.4</p>
                            </div>
                            <div className="relative z-10 bg-white/10 rounded-2xl p-6 backdrop-blur-md border border-white/5">
                                 <p className="text-[12px] font-black text-white uppercase tracking-widest mb-1">Peer Recognition</p>
                                 <p className="text-white/60 text-[11px] leading-relaxed">YOUR RESEARCH WORK HAS BEEN CITED 42 TIMES THIS QUARTER, PLACING YOU IN THE TOP 10% OF THE FACULTY.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Student Feedback' && (
                    <div className="space-y-6 max-w-5xl mx-auto">
                        <div className="flex items-center justify-between px-6 mb-2">
                             <h2 className="text-[14px] font-black text-slate-400 uppercase tracking-widest">Sentiment Analytics Hub</h2>
                        </div>
                        {feedbackRows.length > 0 ? feedbackRows.map((row) => (
                            <div key={row.id} className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-50 shadow-sm space-y-6 group hover:border-[#1a1b4b]/10 transition-all">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-[16px] font-black text-[#1a1b4b] uppercase tracking-tight leading-none">{row.allocation.subject.name}</h3>
                                        <p className="text-[12px] font-black text-gray-400 mt-2 uppercase tracking-widest">{row.allocation.subject.code} • ACADEIMC YEAR FEEDBACK</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#1a1b4b]">
                                        <Calendar size={18} />
                                    </div>
                                </div>
                                <div className="p-8 bg-slate-50/50 rounded-[1.5rem] border border-slate-100 border-l-4 border-l-[#1a1b4b]">
                                    <p className="text-[14px] font-bold text-slate-600 italic leading-relaxed">
                                        "{row.remarks || 'NO DETAILED REMARKS PROVIDED BY STUDENT VENTOR.'}"
                                    </p>
                                </div>
                                <div className="flex items-center gap-6 px-4">
                                     <div className="flex items-center gap-2 text-[11px] font-black text-gray-300 uppercase tracking-widest">
                                         <Users size={14} /> Anonymous Response
                                     </div>
                                     <div className="flex items-center gap-2 text-[11px] font-black text-gray-300 uppercase tracking-widest">
                                         <Calendar size={14} /> {new Date(row.created_at).toLocaleDateString()}
                                     </div>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-100">
                                 <MessageCircle size={48} className="mx-auto text-slate-100 mb-6" />
                                 <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest">WAITING FOR STUDENT FEEDBACK LOGS TO POPULATE.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'Self Appraisal' && (
                    <div className="bg-white rounded-[3rem] p-12 border-2 border-slate-50 shadow-sm max-w-4xl mx-auto space-y-10">
                        <div className="space-y-2">
                             <h2 className="text-2xl font-black text-[#1a1b4b] uppercase tracking-tighter">Self-Reflection Audit</h2>
                             <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Internal Assessment Cycle 2024-25</p>
                        </div>
                        
                        <div className="space-y-8">
                             {[
                                "Achievement of academic goals set for the current semester.",
                                "Contributions to departmental growth and co-curricular activities.",
                                "Implementation of innovative teaching methodologies.",
                                "Personal development and certifications achieved during the tenure."
                             ].map((q, i) => (
                                <div key={i} className="space-y-4">
                                    <p className="text-[14px] font-bold text-slate-700">{i+1}. {q}</p>
                                    <textarea 
                                        value={appraisalForm[`q${i+1}`]}
                                        onChange={(e) => setAppraisalForm(prev => ({...prev, [`q${i+1}`]: e.target.value}))}
                                        disabled={appraisalStatus !== null}
                                        placeholder="ENTER YOUR RESPONSE HERE..."
                                        className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-6 text-[12px] font-black tracking-widest outline-none focus:bg-white focus:border-[#1a1b4b]/10 transition-all uppercase placeholder:text-gray-300 disabled:opacity-70 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>
                             ))}
                        </div>

                        <div className="flex justify-end pt-6">
                            {appraisalStatus !== null ? (
                                <div className="px-10 py-5 bg-emerald-50 text-emerald-600 rounded-2xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2">
                                     <CheckCircle2 size={16} /> Submitted for Audit
                                </div>
                            ) : (
                                <button 
                                    onClick={submitSelfAppraisal}
                                    disabled={submittingAppraisal}
                                    className="px-10 py-5 bg-[#1a1b4b] text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl shadow-[#1a1b4b]/20 hover:bg-[#ef4444] transition-all flex items-center gap-2"
                                >
                                    {submittingAppraisal ? <Loader2 className="animate-spin" size={16} /> : null}
                                    Save Self Appraisal
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'Activities & Research' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="bg-white rounded-[3rem] p-10 border-2 border-slate-50 shadow-sm space-y-8">
                            <h3 className="text-[14px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-slate-50 pb-4 flex items-center gap-2">
                                <BookOpen size={18} className="text-blue-500" /> Research Publications
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { title: "AI in Pedagogy: A Multi-Node Analysis", journal: "IEEE International", year: "2024" },
                                    { title: "Neural Networks in Modern Database Architectures", journal: "ACM Digital Hub", year: "2023" }
                                ].map((p, i) => (
                                    <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-[#1a1b4b]/20 transition-all">
                                        <p className="text-[14px] font-black text-[#1a1b4b] uppercase tracking-tight">{p.title}</p>
                                        <p className="text-[12px] font-bold text-gray-400 uppercase mt-1">{p.journal} • {p.year}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-[3rem] p-10 border-2 border-slate-50 shadow-sm space-y-8">
                            <h3 className="text-[14px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-slate-50 pb-4 flex items-center gap-2">
                                <Activity size={18} className="text-emerald-500" /> Co-Curricular Nodes
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { role: "Faculty Advisor", activity: "MYSYPACE Tech Council" },
                                    { role: "Event Coordinator", activity: "Annual Academic Symposium 2024" },
                                    { role: "Committee Member", activity: "Anti-Ragging Squad Vector" }
                                ].map((a, i) => (
                                    <div key={i} className="p-6 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-slate-100 transition-all">
                                        <div>
                                            <p className="text-[14px] font-black text-[#1a1b4b] uppercase tracking-tight">{a.role}</p>
                                            <p className="text-[12px] font-bold text-slate-400 tracking-tight">{a.activity}</p>
                                        </div>
                                        <ChevronRight className="text-slate-200 group-hover:text-[#1a1b4b] transition-all" size={20} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Appraisal Result' && (
                    <div className="bg-white rounded-[3rem] p-16 border-2 border-slate-50 shadow-sm max-w-3xl mx-auto text-center space-y-8">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner ${
                            appraisalStatus === 'approved' ? 'bg-emerald-50 text-emerald-500' :
                            appraisalStatus === 'rejected' ? 'bg-red-50 text-red-500' :
                            appraisalStatus ? 'bg-amber-50 text-amber-500' :
                            'bg-rose-50 text-rose-500'
                        }`}>
                            {appraisalStatus === 'approved' ? <CheckCircle2 size={40} /> :
                             appraisalStatus === 'rejected' ? <Lock size={40} /> :
                             appraisalStatus ? <Loader2 className="animate-spin" size={40} /> :
                             <Lock size={40} />}
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
                                {!appraisalStatus ? "Appraisal Not Submitted" : 
                                 appraisalStatus === 'pending_hod' ? "Results Pending HOD Audit" :
                                 appraisalStatus === 'pending_dean' ? "Results Pending Dean Audit" :
                                 appraisalStatus === 'approved' ? "Appraisal Approved" : "Appraisal Rejected"}
                            </h2>
                            <p className="text-[14px] font-bold text-gray-400 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                                {!appraisalStatus ? "PLEASE SUBMIT YOUR SELF APPRAISAL TO INITIATE THE REVIEW CYCLE." :
                                 appraisalStatus === 'pending_hod' ? "THE APPRAISAL REVIEW CYCLE IS CURRENTLY BEING VERIFIED BY THE HEAD OF DEPARTMENT." :
                                 appraisalStatus === 'pending_dean' ? "HOD HAS APPROVED. IT IS CURRENTLY PENDING DEAN'S FINAL REVIEW." :
                                 appraisalStatus === 'approved' ? "YOUR PERFORMANCE APPRAISAL HAS BEEN OFFICIALLY APPROVED FOR THE YEAR 2024-25." :
                                 "YOUR APPRAISAL HAS BEEN REJECTED. PLEASE CONTACT ADMINISTRATION."}
                            </p>
                        </div>
                        <div className="pt-8 border-t border-slate-50">
                             <p className="text-[12px] font-black text-slate-300 uppercase tracking-[0.3em]">
                                {appraisalStatus === 'approved' ? "Status: Completed" : "Expected Release: June 2024"}
                             </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Simplified component from lucide
const ChevronRight = ({ size, className }) => (
    <svg 
        width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}
    >
        <path d="m9 18 6-6-6-6"/>
    </svg>
);

const Lock = ({ size, className }) => (
    <svg 
        width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}
    >
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
);

export default PerformanceAppraisal;
