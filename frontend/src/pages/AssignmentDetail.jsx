import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchAssignmentById, submitAssignment, fetchMySubmission, fetchSubmissionsByAssignmentId, gradeSubmission, uploadSubmissionFile } from '../services/assignments';
import { ArrowLeft, Loader2, Upload, FileText, CheckCircle, Clock } from 'lucide-react';

const AssignmentDetail = () => {
    const { id } = useParams(); // assignment ID
    const { user, profile } = useAuth();
    const role = profile?.role?.toLowerCase();
    const isFaculty = role === 'instructor' || role === 'admin';

    const [assignment, setAssignment] = useState(null);
    const [submission, setSubmission] = useState(null); // My submission (student)
    const [submissions, setSubmissions] = useState([]); // All submissions (instructor)

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Student: Quiz state
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizScore, setQuizScore] = useState(null);

    // Instructor: Grading state
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [grade, setGrade] = useState('');
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        loadData();
    }, [id, user?.id, isFaculty]);

    const loadData = async () => {
        try {
            setLoading(true);
            const assignData = await fetchAssignmentById(id);
            setAssignment(assignData);

            if (isFaculty) {
                // Instructor: Load all submissions
                const subs = await fetchSubmissionsByAssignmentId(id);
                setSubmissions(subs);
            } else {
                // Student: Load my submission
                const mySub = await fetchMySubmission(id, user.id);
                setSubmission(mySub);
                if (mySub?.quiz_answers) {
                    setQuizAnswers(mySub.quiz_answers);
                }
            }
        } catch (e) {
            setError(e.message || 'Failed to load assignment data');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);
        try {
            const url = await uploadSubmissionFile(id, user.id, file);

            // Auto-submit after upload
            await submitAssignment({
                assignment_id: id,
                student_id: user.id,
                submission_url: url
            });

            await loadData(); // Refresh to show submitted state
        } catch (e) {
            setError(e.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleQuizSubmit = async () => {
        if (!assignment.assignment_questions) return;

        // Check all answered
        const unanswered = assignment.assignment_questions.filter(q => !quizAnswers[q.id]);
        if (unanswered.length > 0) {
            if (!confirm(`You have ${unanswered.length} unanswered questions. Submit anyway?`)) return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // Calculate grade locally for immediate feedback (secure version would do this server-side)
            let score = 0;
            let total = 0;

            assignment.assignment_questions.forEach(q => {
                total += q.marks;
                if (quizAnswers[q.id] === q.correct_answer) {
                    score += q.marks;
                }
            });

            await submitAssignment({
                assignment_id: id,
                student_id: user.id,
                quiz_answers: quizAnswers,
                grade: score, // Auto-grading
                feedback: `Auto-graded: ${score}/${total}`
            });

            await loadData();
        } catch (e) {
            setError(e.message || 'Quiz submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleGradeSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSubmission) return;

        setSubmitting(true);
        try {
            await gradeSubmission(selectedSubmission.id, grade, feedback);
            await loadData(); // Refresh list
            setSelectedSubmission(null);
            setGrade('');
            setFeedback('');
        } catch (e) {
            setError(e.message || 'Grading failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
    if (!assignment) return <div className="p-8 text-center text-red-500">Assignment not found</div>;

    return (
        <div className="p-6 sm:p-8 max-w-5xl mx-auto">
            <Link to={`/courses/${assignment.course_id}`} className="inline-flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-6">
                <ArrowLeft size={18} /> Back to course
            </Link>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">{assignment.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1"><Calendar size={14} /> Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${assignment.type === 'quiz' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {assignment.type === 'quiz' ? 'Quiz' : 'Assignment'}
                        </span>
                    </div>
                </div>
                {/* Status Badge for Student */}
                {!isFaculty && (
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${submission ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {submission ? 'Submitted' : 'Pending'}
                    </div>
                )}
            </div>

            <p className="text-[var(--color-text)] mb-8 whitespace-pre-wrap">{assignment.description}</p>

            {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-[var(--radius-button)]">{error}</div>}

            {/* ================= STUDENTS VIEW ================= */}
            {!isFaculty && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-[var(--radius-card)] p-6">
                    <h2 className="text-lg font-bold mb-4">Your Work</h2>

                    {submission ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-green-50 rounded-[var(--radius-button)] border border-green-100">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="text-green-600" size={24} />
                                    <div>
                                        <p className="font-medium text-green-900">Submitted on {new Date(submission.submitted_at).toLocaleDateString()}</p>
                                        {assignment.type === 'assignment' && (
                                            <a href={submission.submission_url} target="_blank" rel="noopener noreferrer" className="text-green-700 underline text-sm">View File</a>
                                        )}
                                    </div>
                                </div>
                                {submission.grade !== null && (
                                    <div className="text-right">
                                        <p className="text-sm text-green-800 font-medium">Grade</p>
                                        <p className="text-2xl font-bold text-green-700">{submission.grade}</p>
                                    </div>
                                )}
                            </div>

                            {submission.feedback && (
                                <div className="p-4 bg-[var(--color-surface-muted)] rounded-[var(--radius-button)]">
                                    <p className="text-sm font-bold mb-1">Feedback:</p>
                                    <p className="text-sm">{submission.feedback}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {assignment.type === 'assignment' ? (
                                <div className="border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-card)] p-8 text-center hover:bg-[var(--color-surface-hover)] transition-colors relative">
                                    <input
                                        type="file"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    {uploading ? (
                                        <Loader2 className="animate-spin mx-auto text-[var(--color-primary)]" size={32} />
                                    ) : (
                                        <Upload className="mx-auto text-[var(--color-text-muted)] mb-2" size={32} />
                                    )}
                                    <p className="text-[var(--color-text)] font-medium">Click to upload file</p>
                                    <p className="text-sm text-[var(--color-text-muted)] mt-1">PDF, DOC, DOCX up to 10MB</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {assignment.assignment_questions?.map((q, i) => (
                                        <div key={q.id} className="p-4 border border-[var(--color-border-light)] rounded-[var(--radius-button)]">
                                            <p className="font-medium mb-3">{i + 1}. {q.question_text} <span className="text-xs text-[var(--color-text-muted)]">({q.marks} pts)</span></p>
                                            <div className="space-y-2">
                                                {q.options.map((opt, optIndex) => (
                                                    <label key={optIndex} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[var(--color-surface-hover)] rounded">
                                                        <input
                                                            type="radio"
                                                            name={`q-${q.id}`}
                                                            value={opt}
                                                            checked={quizAnswers[q.id] === opt}
                                                            onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt })}
                                                            className="text-[var(--color-primary)]"
                                                        />
                                                        <span className="text-sm">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={handleQuizSubmit}
                                        disabled={submitting}
                                        className="w-full py-3 bg-[var(--color-primary)] text-white rounded-[var(--radius-button)] font-medium hover:opacity-90 disabled:opacity-50"
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Quiz'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ================= INSTRUCTOR VIEW ================= */}
            {isFaculty && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Submissions List */}
                    <div className="md:col-span-1 border-r border-[var(--color-border-light)] pr-6">
                        <h2 className="font-bold mb-4 flex justify-between items-center">
                            Submissions <span className="bg-[var(--color-surface-muted)] px-2 py-0.5 rounded text-xs">{submissions.length}</span>
                        </h2>
                        <div className="space-y-2">
                            {submissions.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No submissions yet.</p>}
                            {submissions.map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => { setSelectedSubmission(sub); setGrade(sub.grade || ''); setFeedback(sub.feedback || ''); }}
                                    className={`w-full text-left p-3 rounded-[var(--radius-button)] hover:bg-[var(--color-surface-hover)] transition-colors ${selectedSubmission?.id === sub.id ? 'bg-[var(--color-surface-selected)] border-l-4 border-[var(--color-primary)]' : ''}`}
                                >
                                    <p className="font-medium text-sm">{sub.student?.full_name || 'Unknown Student'}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-[var(--color-text-muted)]">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                                        {sub.grade ? (
                                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">{sub.grade}</span>
                                        ) : (
                                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Needs Grading</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grading Panel */}
                    <div className="md:col-span-2">
                        {selectedSubmission ? (
                            <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-[var(--radius-card)] p-6">
                                <div className="flex justify-between items-start mb-6 pb-6 border-b border-[var(--color-border-light)] custom-cursor-default-hover">
                                    <div>
                                        <h3 className="font-bold text-lg">{selectedSubmission.student?.full_name}</h3>
                                        <p className="text-sm text-[var(--color-text-muted)]">Submitted {new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
                                    </div>
                                    {assignment.type === 'assignment' ? (
                                        <a
                                            href={selectedSubmission.submission_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-[var(--color-surface-muted)] text-[var(--color-primary)] rounded-[var(--radius-button)] text-sm font-medium hover:bg-[var(--color-surface-hover)] flex items-center gap-2"
                                        >
                                            <FileText size={16} /> View File
                                        </a>
                                    ) : (
                                        <div className="text-sm">
                                            <p className="font-medium">Quiz Answers:</p>
                                            <p className="text-[var(--color-text-muted)]">Auto-graded score: {selectedSubmission.grade}</p>
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleGradeSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Grade (Points)</label>
                                        <input
                                            type="number"
                                            value={grade}
                                            onChange={(e) => setGrade(e.target.value)}
                                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-button)]"
                                            placeholder="Enter points..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Feedback</label>
                                        <textarea
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-button)]"
                                            placeholder="Good job, but..."
                                        />
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-[var(--radius-button)] font-medium hover:opacity-90 disabled:opacity-50"
                                        >
                                            {submitting ? 'Saving...' : 'Save Grade'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] p-12 border-2 border-dashed border-[var(--color-border-light)] rounded-[var(--radius-card)]">
                                <p>Select a submission to grade</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignmentDetail;
