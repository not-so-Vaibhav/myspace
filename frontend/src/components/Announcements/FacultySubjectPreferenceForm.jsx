import React from 'react';
import { 
    BookOpen, 
    Check, 
    Edit2, 
    Sparkles, 
    ChevronRight,
    AlertCircle
} from 'lucide-react';

const FacultySubjectPreferenceForm = ({ announcement, preferences = [], isDeadlinePassed, onOpenModal }) => {
    const hasSubmitted = preferences && preferences.length > 0;

    return (
        <div className="space-y-2 pt-1">
            {hasSubmitted ? (
                /* ── Submitted Choices Display ────────────────────────────────── */
                <div className="bg-emerald-50/80 rounded-2xl border border-emerald-200 p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                                <Check size={12} strokeWidth={3} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-tight">
                                    Preferences Saved
                                </h4>
                            </div>
                        </div>

                        {!isDeadlinePassed ? (
                            <button
                                type="button"
                                onClick={onOpenModal}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-2xs"
                            >
                                <Edit2 size={10} />
                                <span>Edit</span>
                            </button>
                        ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-black uppercase">
                                Closed
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {preferences.map((pref, idx) => {
                            const sub = pref.subject || {};
                            return (
                                <span 
                                    key={pref.id || idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-indigo-900 border border-emerald-200 rounded-md text-[10px] font-bold shadow-2xs"
                                >
                                    <span className="text-[9px] font-black text-indigo-600">
                                        #{pref.preference_rank || (idx + 1)}
                                    </span>
                                    <span>[{sub.code || 'CODE'}] {sub.name || 'Subject'}</span>
                                </span>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* ── Needs Selection Action Callout ───────────────────────────── */
                <div className="bg-indigo-50/70 rounded-2xl border border-indigo-200/80 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#1a1b4b] uppercase tracking-tight flex items-center gap-1.5">
                            <BookOpen size={13} className="text-indigo-600" />
                            Select Teaching Subjects
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[9px] font-black uppercase tracking-wider">
                            Action Required
                        </span>
                    </div>

                    {!isDeadlinePassed ? (
                        <button
                            type="button"
                            onClick={onOpenModal}
                            className="w-full py-2.5 px-3 bg-[#1a1b4b] hover:bg-[#2d3a8c] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                        >
                            <Sparkles size={13} className="text-amber-300" />
                            <span>Choose Subject Preferences</span>
                            <ChevronRight size={13} />
                        </button>
                    ) : (
                        <p className="text-[11px] text-rose-600 font-bold uppercase tracking-wider">
                            Submissions are closed for this term.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default FacultySubjectPreferenceForm;
