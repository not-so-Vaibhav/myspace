import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createAssignment } from '../services/assignments';
import { ArrowLeft, Loader2, Plus, Trash2, Calendar, FileText, CheckCircle } from 'lucide-react';

const AssignmentCreate = () => {
    const { id: courseId } = useParams(); // Using courseId from route params
    const { user } = useAuth();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [type, setType] = useState('assignment'); // 'assignment' or 'quiz'

    // Quiz specific state
    const [questions, setQuestions] = useState([
        { question_text: '', options: ['', '', '', ''], correct_answer: '' }
    ]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            { question_text: '', options: ['', '', '', ''], correct_answer: '' }
        ]);
    };

    const handleRemoveQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleQuestionChange = (index, field, value) => {
        const updated = [...questions];
        updated[index][field] = value;
        setQuestions(updated);
    };

    const handleOptionChange = (qIndex, oIndex, value) => {
        const updated = [...questions];
        updated[qIndex].options[oIndex] = value;
        setQuestions(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !dueDate) {
            setError('Title and due date are required.');
            return;
        }

        if (type === 'quiz') {
            // Validate quiz
            for (const q of questions) {
                if (!q.question_text.trim() || !q.correct_answer.trim()) {
                    setError('All questions must have text and a correct answer selected.');
                    return;
                }
            }
        }

        setLoading(true);
        setError(null);

        try {
            await createAssignment(
                {
                    course_id: parseInt(courseId),
                    title: title.trim(),
                    description: description.trim(),
                    due_date: new Date(dueDate).toISOString(),
                    type,
                    created_by: user.id
                },
                type === 'quiz' ? questions : []
            );

            navigate(`/courses/${courseId}`);
        } catch (e) {
            setError(e.message || 'Failed to create assignment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 sm:p-8 max-w-4xl mx-auto">
            <Link to={`/courses/${courseId}`} className="inline-flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-6">
                <ArrowLeft size={18} /> Back to course
            </Link>

            <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">Create New {type === 'quiz' ? 'Quiz' : 'Assignment'}</h1>

            {error && (
                <div className="mb-6 p-4 rounded-[var(--radius-button)] bg-red-50 text-red-700 border border-red-100 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border-light)] p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            placeholder="e.g. Midterm Project"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            placeholder="Instructions for students..."
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Due Date
                            </label>
                            <input
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-[var(--color-border)]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Type
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-[var(--color-border)]"
                            >
                                <option value="assignment">File Upload (Assignment)</option>
                                <option value="quiz">Quiz (Multiple Choice)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Quiz Builder */}
                {type === 'quiz' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-bold text-[var(--color-text)]">Questions</h2>
                        {questions.map((q, qIndex) => (
                            <div key={qIndex} className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border-light)] p-6 relative">
                                <button
                                    type="button"
                                    onClick={() => handleRemoveQuestion(qIndex)}
                                    className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                                    title="Remove question"
                                >
                                    <Trash2 size={18} />
                                </button>

                                <div className="mb-4 pr-8">
                                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                        Question {qIndex + 1}
                                    </label>
                                    <input
                                        type="text"
                                        value={q.question_text}
                                        onChange={(e) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                                        className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-[var(--color-border)]"
                                        placeholder="Enter question text"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-[var(--color-text)]">Options</label>
                                    {q.options.map((opt, oIndex) => (
                                        <div key={oIndex} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name={`correct-${qIndex}`}
                                                checked={q.correct_answer === opt && opt !== ''}
                                                onChange={() => handleQuestionChange(qIndex, 'correct_answer', opt)}
                                                className="text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                                disabled={!opt}
                                            />
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                className="flex-1 px-3 py-2 rounded-[var(--radius-button)] border border-[var(--color-border)] text-sm"
                                                placeholder={`Option ${oIndex + 1}`}
                                            />
                                        </div>
                                    ))}
                                    <div className="text-xs text-[var(--color-text-muted)] mt-1">
                                        Select the radio button next to the correct answer.
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={handleAddQuestion}
                            className="w-full py-3 border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-card)] text-[var(--color-text-muted)] font-medium hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={20} /> Add Question
                        </button>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-6 border-t border-[var(--color-border-light)]">
                    <Link
                        to={`/courses/${courseId}`}
                        className="px-6 py-2 rounded-[var(--radius-button)] border border-[var(--color-border)] text-[var(--color-text)] font-medium hover:bg-[var(--color-surface-hover)]"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 rounded-[var(--radius-button)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                        Create {type === 'quiz' ? 'Quiz' : 'Assignment'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AssignmentCreate;
