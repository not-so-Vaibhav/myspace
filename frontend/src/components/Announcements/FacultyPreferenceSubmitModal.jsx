import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    BookOpen, 
    X, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    Save, 
    Plus, 
    Trash2, 
    Loader2, 
    Sparkles
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { 
    fetchAvailableSubjects, 
    fetchFacultyPreferences, 
    saveFacultyPreferences 
} from '../../services/subjectPreferenceService';

const FacultyPreferenceSubmitModal = ({ isOpen, onClose, announcement, facultyId, onSubmitted }) => {
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const maxChoices = announcement?.max_preferences || 3;
    const deadlineString = announcement?.preference_deadline || announcement?.end_date;
    const isDeadlinePassed = deadlineString ? isPast(new Date(deadlineString)) : false;

    // Form choices array: [{ subject_id, preferred_type, remarks }]
    const [choices, setChoices] = useState([
        { subject_id: '', preferred_type: 'Theory', remarks: '' },
        { subject_id: '', preferred_type: 'Theory', remarks: '' }
    ]);

    useEffect(() => {
        if (isOpen && announcement?.id && facultyId) {
            let isMounted = true;
            setLoading(true);
            setErrorMsg('');
            setSuccessMsg('');

            Promise.all([
                fetchAvailableSubjects(),
                fetchFacultyPreferences(announcement.id, facultyId)
            ]).then(([subs, prefs]) => {
                if (!isMounted) return;
                setAvailableSubjects(subs || []);
                if (prefs && prefs.length > 0) {
                    setChoices(prefs.map(p => ({
                        subject_id: p.subject_id,
                        preferred_type: p.preferred_type || 'Theory',
                        remarks: p.remarks || ''
                    })));
                } else {
                    setChoices([
                        { subject_id: '', preferred_type: 'Theory', remarks: '' },
                        { subject_id: '', preferred_type: 'Theory', remarks: '' }
                    ]);
                }
                setLoading(false);
            }).catch(err => {
                if (!isMounted) return;
                console.error('Error loading subject choices:', err);
                setLoading(false);
            });

            return () => { isMounted = false; };
        }
    }, [isOpen, announcement?.id, facultyId]);

    if (!isOpen || !announcement) return null;

    const handleAddChoiceRow = () => {
        if (choices.length >= maxChoices) return;
        setChoices(prev => [...prev, {
            subject_id: '',
            preferred_type: 'Theory',
            remarks: ''
        }]);
    };

    const handleRemoveChoiceRow = (index) => {
        if (choices.length <= 1) return;
        setChoices(prev => prev.filter((_, i) => i !== index));
    };

    const handleChoiceChange = (index, field, value) => {
        setChoices(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        const validChoices = choices.filter(c => c.subject_id);
        if (validChoices.length === 0) {
            setErrorMsg('Please select at least one subject for your preference.');
            return;
        }

        const selectedIds = validChoices.map(c => c.subject_id);
        const hasDuplicates = new Set(selectedIds).size !== selectedIds.length;
        if (hasDuplicates) {
            setErrorMsg('You cannot choose the same subject multiple times.');
            return;
        }

        setSubmitting(true);
        try {
            const prepared = validChoices.map((c, idx) => {
                const subObj = availableSubjects.find(s => s.id === c.subject_id);
                return {
                    ...c,
                    preference_rank: idx + 1,
                    subject: subObj
                };
            });

            const saved = await saveFacultyPreferences(announcement.id, facultyId, prepared);
            setSuccessMsg('Your teaching preferences were saved successfully!');
            setTimeout(() => {
                if (onSubmitted) onSubmitted(announcement.id, saved);
                onClose();
            }, 800);
        } catch (err) {
            setErrorMsg(err.message || 'Failed to submit subject preferences.');
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
            {/* Modal Dialog */}
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150">
                
                {/* 1. Header */}
                <div className="px-6 py-4 bg-[#1a1b4b] text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-indigo-200">
                            <BookOpen size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black uppercase tracking-tight text-white">
                                    Teaching Subject Preferences
                                </h3>
                                <span className="px-2 py-0.5 bg-indigo-500/40 text-indigo-100 rounded text-[10px] font-black uppercase">
                                    Sem {announcement.target_semester || 1}
                                </span>
                            </div>
                            <p className="text-[11px] text-indigo-200 font-medium mt-0.5">
                                {announcement.target_academic_year || '2026-2027'} • Subject Allocation
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 2. Scrollable Body */}
                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                    {/* Deadline Banner */}
                    {deadlineString && (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                            isDeadlinePassed ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50/90 border-amber-200 text-amber-950'
                        }`}>
                            <div className="flex items-center gap-2 min-w-0">
                                <Clock size={15} className={isDeadlinePassed ? 'text-rose-600' : 'text-amber-600'} />
                                <span className="font-bold truncate">
                                    {isDeadlinePassed ? 'Deadline Closed' : `Due: ${format(new Date(deadlineString), 'MMMM dd, yyyy • h:mm a')}`}
                                </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shrink-0 ${
                                isDeadlinePassed ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-950'
                            }`}>
                                {isDeadlinePassed ? 'Closed' : 'Active Call'}
                            </span>
                        </div>
                    )}

                    {/* Alerts */}
                    {errorMsg && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                            <AlertCircle size={15} className="text-rose-600 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {/* Choices Form */}
                    {loading ? (
                        <div className="py-12 text-center space-y-2">
                            <Loader2 size={24} className="animate-spin text-indigo-600 mx-auto" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Subjects...</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-500">
                                <span>Subject Preferences (Max {maxChoices})</span>
                                <span className="text-[10px] text-gray-400 font-normal">Rank 1 is primary</span>
                            </div>

                            {choices.map((choice, index) => {
                                const otherSelectedIds = choices
                                    .filter((_, i) => i !== index)
                                    .map(c => c.subject_id)
                                    .filter(Boolean);

                                const isPrimary = index === 0;

                                return (
                                    <div
                                        key={index}
                                        className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                                            isPrimary 
                                                ? 'bg-indigo-50/40 border-indigo-200' 
                                                : 'bg-gray-50/80 border-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                isPrimary ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                Choice #{index + 1} {isPrimary ? '• Primary' : ''}
                                            </span>

                                            {choices.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveChoiceRow(index)}
                                                    className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                                                    title="Remove choice"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Dropdown */}
                                        <div>
                                            <select
                                                required
                                                value={choice.subject_id}
                                                onChange={(e) => handleChoiceChange(index, 'subject_id', e.target.value)}
                                                className="w-full p-2.5 bg-white rounded-xl border border-gray-200 text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                                            >
                                                <option value="">— Select Subject from Registry —</option>
                                                {availableSubjects
                                                    .filter(s => !otherSelectedIds.includes(s.id))
                                                    .map(s => (
                                                        <option key={s.id} value={s.id}>
                                                            [{s.code}] {s.name} • {s.type || 'Theory'} ({s.credits || 3} Cr)
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        {/* Mode Toggles + Slot */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                                            <div className="flex gap-1">
                                                {['Theory', 'Practical', 'Both'].map((mode) => (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        onClick={() => handleChoiceChange(index, 'preferred_type', mode)}
                                                        className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                                                            choice.preferred_type === mode
                                                                ? 'bg-[#1a1b4b] text-white border-[#1a1b4b]'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {mode === 'Both' ? 'Theory+Lab' : mode}
                                                    </button>
                                                ))}
                                            </div>

                                            <input
                                                type="text"
                                                value={choice.remarks}
                                                onChange={(e) => handleChoiceChange(index, 'remarks', e.target.value)}
                                                placeholder="Timing / slot notes (optional)"
                                                className="w-full px-2.5 py-1 bg-white rounded-lg border border-gray-200 text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            {choices.length < maxChoices && (
                                <button
                                    type="button"
                                    onClick={handleAddChoiceRow}
                                    className="w-full py-2 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border border-dashed border-indigo-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Plus size={13} strokeWidth={3} />
                                    <span>Add Choice #{choices.length + 1}</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. Footer */}
                <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || isDeadlinePassed || loading}
                        className="px-5 py-2 bg-[#1a1b4b] hover:bg-[#2d3a8c] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save size={13} />
                                <span>Save & Submit Choices</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default FacultyPreferenceSubmitModal;
