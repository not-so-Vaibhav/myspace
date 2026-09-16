import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    BookOpen, 
    Clock, 
    X, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Users, 
    Send
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { fetchAvailableSubjects, createSubjectPreferenceAnnouncement } from '../../services/subjectPreferenceService';

const AdminSubjectPreferenceModal = ({ isOpen, onClose, onCreated, adminProfile }) => {
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const defaultDeadline = format(addDays(new Date(), 7), "yyyy-MM-dd'T'18:00");

    const [form, setForm] = useState({
        title: 'Faculty Subject Allocation: Call for Teaching Preferences',
        description: 'Please select your preferred subjects to teach for the upcoming semester. Submissions will be used by the Academic Allocation Board to prepare the official class timetable.',
        semester: 1,
        academicYear: '2026-2027',
        deadline: defaultDeadline,
        maxPreferences: 3,
        priority: 'HIGH'
    });

    useEffect(() => {
        if (isOpen) {
            loadSubjects();
        }
    }, [isOpen]);

    const loadSubjects = async () => {
        setLoadingSubjects(true);
        try {
            const subs = await fetchAvailableSubjects();
            setAvailableSubjects(subs || []);
        } catch (err) {
            console.error('Error loading subjects:', err);
        } finally {
            setLoadingSubjects(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e?.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!form.title.trim()) {
            setErrorMsg('Please enter an announcement title.');
            return;
        }
        if (!form.deadline) {
            setErrorMsg('Please set a submission deadline.');
            return;
        }

        const deadlineDate = new Date(form.deadline);
        if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
            setErrorMsg('The deadline must be a future date and time.');
            return;
        }

        setSubmitting(true);
        try {
            const created = await createSubjectPreferenceAnnouncement({
                ...form,
                deadlineDate: form.deadline.split('T')[0]
            }, adminProfile);

            setSuccessMsg('Subject Preference Announcement broadcasted successfully!');
            setTimeout(() => {
                onCreated(created);
                onClose();
            }, 1000);
        } catch (err) {
            setErrorMsg(err.message || 'Failed to broadcast announcement.');
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                {/* Fixed Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-[#1a1b4b] via-[#242b70] to-[#1a1b4b] text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <BookOpen size={20} className="text-indigo-200" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm sm:text-base font-black uppercase tracking-tight">
                                    Send Teaching Subject Request
                                </h2>
                                <span className="px-2 py-0.5 bg-amber-400 text-[#1a1b4b] rounded-md text-[10px] font-black uppercase tracking-widest">
                                    Faculty & HOD
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-white/70 tracking-wide mt-0.5">
                                Collect teacher subject preferences for timetable & schedule preparation
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                    {errorMsg && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold uppercase tracking-wider">
                            <AlertCircle size={16} className="shrink-0 text-rose-600" />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {/* Announcement Title */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                            Announcement Title *
                        </label>
                        <input
                            type="text"
                            required
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g. Faculty Subject Allocation: Semester 1"
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    {/* Target Semester & Academic Year */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                Target Semester *
                            </label>
                            <select
                                value={form.semester}
                                onChange={(e) => setForm({ ...form, semester: parseInt(e.target.value, 10) })}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                    <option key={sem} value={sem}>Semester {sem} (Term {sem % 2 === 1 ? '1 - Odd' : '2 - Even'})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                Academic Year *
                            </label>
                            <input
                                type="text"
                                value={form.academicYear}
                                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                                placeholder="2026-2027"
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                    </div>

                    {/* Submission Deadline & Max Choices */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Clock size={12} className="text-amber-500" />
                                Response Deadline *
                            </label>
                            <input
                                type="datetime-local"
                                required
                                value={form.deadline}
                                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                Choices Allowed Per Faculty
                            </label>
                            <select
                                value={form.maxPreferences}
                                onChange={(e) => setForm({ ...form, maxPreferences: parseInt(e.target.value, 10) })}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                            >
                                <option value={1}>1 Preference (Single Choice)</option>
                                <option value={2}>2 Preferences (Primary & Secondary)</option>
                                <option value={3}>3 Preferences (Primary, Secondary, Alt)</option>
                                <option value={4}>4 Preferences</option>
                                <option value={5}>5 Preferences</option>
                            </select>
                        </div>
                    </div>

                    {/* Available Subjects Preview */}
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                <BookOpen size={12} className="text-indigo-600" />
                                Available Subjects in Registry ({availableSubjects.length})
                            </span>
                            <span className="text-[10px] font-bold text-indigo-600 uppercase">
                                Open to all Faculty
                            </span>
                        </div>
                        {loadingSubjects ? (
                            <div className="flex items-center gap-2 text-xs text-indigo-600 py-1">
                                <Loader2 size={13} className="animate-spin" />
                                <span>Loading subjects...</span>
                            </div>
                        ) : availableSubjects.length === 0 ? (
                            <p className="text-xs text-indigo-600 italic">No subjects registered yet in the database.</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pt-1">
                                {availableSubjects.slice(0, 15).map(sub => (
                                    <span key={sub.id} className="px-2 py-0.5 bg-white text-indigo-800 rounded-md text-[10px] font-black uppercase tracking-wider border border-indigo-100 shadow-2xs">
                                        [{sub.code}] {sub.name}
                                    </span>
                                ))}
                                {availableSubjects.length > 15 && (
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-black">
                                        +{availableSubjects.length - 15} more
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Instructions */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                            Instructions for Faculty
                        </label>
                        <textarea
                            rows={2}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Add instructions, weekly hour caps, or requirements..."
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
                        />
                    </div>

                    {/* Target Audience Note */}
                    <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-center gap-2.5">
                        <Users size={16} className="text-amber-600 shrink-0" />
                        <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                            Broadcast Target: Locked to <span className="font-black">Faculty, Instructors & HODs</span>.
                        </p>
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2.5 bg-[#1a1b4b] hover:bg-[#2d3a8c] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Broadcasting...</span>
                            </>
                        ) : (
                            <>
                                <Send size={14} />
                                <span>Broadcast Preference Call</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AdminSubjectPreferenceModal;
