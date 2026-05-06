import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, BookOpen, Save, Loader2 } from 'lucide-react';

const SubjectEditorModal = ({ isOpen, onClose, subject, onSubjectUpdated }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [credits, setCredits] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (subject) {
            setName(subject.name || '');
            setCode(subject.code || '');
            setCredits(subject.credits || '');
        }
    }, [subject]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!subject?.id) {
            setError('System Error: Subject ID is missing. Please refresh and try again.');
            return;
        }
        setError('');
        setIsSubmitting(true);

        try {
            const { error: updateError } = await supabase
                .from('subjects')
                .update({ 
                    name, 
                    code: code.toUpperCase(), 
                    credits: parseInt(credits) 
                })
                .eq('id', subject.id);

            if (updateError) throw updateError;

            onSubjectUpdated();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1a1b4b]/40 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-[#1a1b4b] tracking-tight">Edit Course</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Master Curriculum Update</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Course Code</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-black text-[#1a1b4b] uppercase outline-none focus:ring-2 focus:ring-indigo-100"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Full Course Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-black text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Academic Credits</label>
                            <input
                                type="number"
                                value={credits}
                                onChange={(e) => setCredits(e.target.value)}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-[#1a1b4b] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#2d3a8c] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Course Changes
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SubjectEditorModal;
