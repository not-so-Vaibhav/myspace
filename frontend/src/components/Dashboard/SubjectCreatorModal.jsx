import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

const SubjectCreatorModal = ({ isOpen, onClose, targetDepartment, onSubjectCreated }) => {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        credits: 3,
        type: 'Theory'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        setIsSubmitting(true);

        try {
            const { data, error } = await supabase
                .from('subjects')
                .insert([{
                    department_id: targetDepartment.id,
                    name: formData.name,
                    code: formData.code.toUpperCase(),
                    credits: parseFloat(formData.credits),
                    type: formData.type
                }])
                .select()
                .single();

            if (error) throw error;

            setSuccessMsg(`Subject [${data.code}] successfully registered!`);
            setTimeout(() => {
                onSubjectCreated(data); // Refresh core data in parent
                setFormData({ name: '', code: '', credits: 3, type: 'Theory' });
                setSuccessMsg('');
                onClose();
            }, 1000);

        } catch (err) {
            // Check for unique key violation on Subject Code
            if (err.code === '23505') {
                setErrorMsg('A subject with this Subject Code already exists in the system.');
            } else {
                setErrorMsg(err.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight leading-none">Register Course</h2>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-1">
                            Bind to: <span className="text-[#ef4444]">{targetDepartment?.name}</span>
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                    {/* Alerts */}
                    {(errorMsg || successMsg) && (
                        <div className={`p-4 rounded-xl flex items-start gap-3 border ${errorMsg ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                            {errorMsg ? <AlertCircle className="w-5 h-5 text-red-500 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                            <p className={`text-xs font-bold leading-tight ${errorMsg ? 'text-red-700' : 'text-green-700'}`}>
                                {errorMsg || successMsg}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Subject Full Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="e.g. Data Structures & Algorithms"
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-[#1a1b4b]/20 focus:border-[#1a1b4b]"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Subject Code</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                placeholder="e.g. CS201"
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-black text-[#1a1b4b] uppercase outline-none focus:ring-2 focus:ring-[#1a1b4b]/20"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Credit Weight</label>
                            <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                value={formData.credits}
                                onChange={(e) => setFormData({...formData, credits: e.target.value})}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-[#1a1b4b]/20"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Format</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({...formData, type: e.target.value})}
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-[#1a1b4b]/20"
                            required
                        >
                            <option value="Theory">Theory Lecture</option>
                            <option value="Practical">Practical Lab</option>
                            <option value="Audit">Audit / Elective</option>
                        </select>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.name || !formData.code}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1a1b4b] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#2d3a8c] transition-colors focus:ring-4 focus:ring-[#1a1b4b]/20 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Registering...' : <><Plus size={16} strokeWidth={3} /> Create Course</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubjectCreatorModal;
