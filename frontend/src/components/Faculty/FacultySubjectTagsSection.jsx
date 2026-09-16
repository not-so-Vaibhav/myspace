import React, { useState, useEffect } from 'react';
import { 
    BookOpen, 
    Plus, 
    X, 
    Tag, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    GraduationCap, 
    Layers,
    Sparkles
} from 'lucide-react';
import { 
    fetchAvailableSubjects, 
    fetchFacultySubjectTags, 
    addFacultySubjectTag, 
    removeFacultySubjectTag 
} from '../../services/facultySubjectService';

const FacultySubjectTagsSection = ({ facultyId, userRole, className = '' }) => {
    // Only render for teaching personnel: faculty, hod, instructor, teacher (or admin managing faculty)
    const isTeachingRole = ['faculty', 'hod', 'instructor', 'teacher', 'admin'].includes(userRole?.toLowerCase());
    
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [taggedSubjects, setTaggedSubjects] = useState([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (facultyId && isTeachingRole) {
            loadData();
        }
    }, [facultyId, userRole]);

    const loadData = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const [subjects, tags] = await Promise.all([
                fetchAvailableSubjects(),
                fetchFacultySubjectTags(facultyId)
            ]);
            setAvailableSubjects(subjects || []);
            setTaggedSubjects(tags || []);
        } catch (err) {
            console.error('Failed to load faculty subject tags:', err);
            setErrorMsg('Unable to synchronize subject tags.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = async (e) => {
        e?.preventDefault();
        if (!selectedSubjectId) {
            setErrorMsg('Please select a subject from the dropdown.');
            return;
        }

        const subjectObj = availableSubjects.find(s => s.id === selectedSubjectId);
        if (!subjectObj) {
            setErrorMsg('Selected subject is invalid.');
            return;
        }

        // Check if already tagged
        const alreadyTagged = taggedSubjects.some(
            t => (t.subject_id === subjectObj.id) || (t.subject?.id === subjectObj.id)
        );
        if (alreadyTagged) {
            setErrorMsg(`[${subjectObj.code}] ${subjectObj.name} is already tagged.`);
            return;
        }

        setSubmitting(true);
        setErrorMsg('');
        try {
            const newTag = await addFacultySubjectTag(facultyId, subjectObj);
            setTaggedSubjects(prev => [...prev, newTag]);
            setSelectedSubjectId('');
            setSuccessMsg(`Tagged [${subjectObj.code}] ${subjectObj.name} successfully!`);
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
            setErrorMsg(err.message || 'Failed to add subject tag.');
            setTimeout(() => setErrorMsg(''), 5000);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveTag = async (tag) => {
        const tagId = tag.id;
        const subjectId = tag.subject_id || tag.subject?.id;
        const subjectName = tag.subject?.name || 'Subject';

        setSubmitting(true);
        setErrorMsg('');
        try {
            await removeFacultySubjectTag(tagId, facultyId, subjectId);
            setTaggedSubjects(prev => prev.filter(t => t.id !== tagId && (t.subject_id || t.subject?.id) !== subjectId));
            setSuccessMsg(`Removed ${subjectName} tag.`);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg(err.message || 'Failed to remove subject tag.');
            setTimeout(() => setErrorMsg(''), 5000);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isTeachingRole) {
        return null; // Do not render for non-teaching users (e.g. students or general staff)
    }

    // Filter out subjects already tagged for the dropdown
    const untaggedSubjects = availableSubjects.filter(sub => 
        !taggedSubjects.some(t => (t.subject_id === sub.id) || (t.subject?.id === sub.id))
    );

    return (
        <div className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden ${className}`}>
            {/* Card Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/30 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#1a1b4b] text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                        <BookOpen size={22} className="text-indigo-200" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h3 className="text-sm font-black text-[#1a1b4b] uppercase tracking-wider">
                                Teaching Subject Tags & Expertise
                            </h3>
                            <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {taggedSubjects.length} Active
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            Tag courses you teach for academic allocation & admin discovery
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        <Sparkles size={12} className="text-emerald-500" />
                        Live Synced
                    </span>
                </div>
            </div>

            {/* Notification Alerts */}
            {successMsg && (
                <div className="mx-8 mt-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <p className="text-xs font-bold uppercase tracking-wider">{successMsg}</p>
                </div>
            )}
            {errorMsg && (
                <div className="mx-8 mt-6 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
                    <AlertCircle size={18} className="text-rose-600 shrink-0" />
                    <p className="text-xs font-bold uppercase tracking-wider">{errorMsg}</p>
                </div>
            )}

            {/* Main Content */}
            <div className="p-8 space-y-6">
                {/* Add Subject Tag Dropdown + Button */}
                <form onSubmit={handleAddTag} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            disabled={loading || submitting}
                            className="w-full px-5 py-3.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white rounded-2xl border border-gray-200 text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all cursor-pointer"
                        >
                            <option value="">— Select Available Subject to Tag ({untaggedSubjects.length} available) —</option>
                            {untaggedSubjects.map(sub => (
                                <option key={sub.id} value={sub.id}>
                                    [{sub.code}] {sub.name} • {sub.type || 'Theory'} ({sub.credits || 3} Credits)
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={!selectedSubjectId || submitting || loading}
                        className="px-6 py-3.5 bg-[#1a1b4b] hover:bg-[#2a2c6d] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Tagging...</span>
                            </>
                        ) : (
                            <>
                                <Plus size={16} strokeWidth={3} />
                                <span>Add Subject Tag</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Tagged Subjects Display List */}
                {loading ? (
                    <div className="p-10 text-center space-y-3">
                        <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto" />
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                            Syncing Subject Expertise Tags...
                        </p>
                    </div>
                ) : taggedSubjects.length === 0 ? (
                    <div className="p-8 bg-gray-50/60 rounded-3xl border border-dashed border-gray-200 text-center space-y-2">
                        <Tag size={28} className="text-gray-300 mx-auto" />
                        <p className="text-xs font-black text-[#1a1b4b] uppercase tracking-wider">
                            No Subject Tags Added Yet
                        </p>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest max-w-md mx-auto">
                            Choose from the available subjects dropdown above to add tags for courses you teach or specialize in.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">
                            <span>Your Tagged Subjects ({taggedSubjects.length})</span>
                            <span>Click <X size={10} className="inline ml-0.5" /> to remove</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {taggedSubjects.map((tag) => {
                                const sub = tag.subject || {};
                                const code = sub.code || 'CODE';
                                const name = sub.name || 'Subject Name';
                                const type = sub.type || 'Theory';
                                const credits = sub.credits;

                                return (
                                    <div
                                        key={tag.id || tag.subject_id}
                                        className="group relative flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 via-white to-gray-50 hover:to-indigo-50/40 rounded-2xl border border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all duration-200"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center border border-indigo-100 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                {code.substring(0, 3)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[11px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                                        {code}
                                                    </span>
                                                    <span className="text-xs font-black text-[#1a1b4b] truncate">
                                                        {name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                        {type}
                                                    </span>
                                                    {credits && (
                                                        <>
                                                            <span className="text-gray-300">•</span>
                                                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                                                                {credits} Credits
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            disabled={submitting}
                                            title="Remove subject tag"
                                            className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0 ml-2"
                                        >
                                            <X size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacultySubjectTagsSection;
