import { supabase } from '../lib/supabase';

// ============================================================
// ASSIGNMENT SERVICES
// ============================================================

export async function fetchAssignmentsByCourseId(courseId) {
    const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId)
        .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function fetchAssignmentById(assignmentId) {
    const { data, error } = await supabase
        .from('assignments')
        .select(`
      *,
      assignment_questions (*)
    `)
        .eq('id', assignmentId)
        .single();

    if (error) throw error;

    // Sort questions if they exist
    if (data.assignment_questions) {
        data.assignment_questions.sort((a, b) => a.id - b.id);
    }

    return data;
}

export async function createAssignment(assignmentData, questions = []) {
    // 1. Create the assignment
    const { data: assignment, error: assignError } = await supabase
        .from('assignments')
        .insert(assignmentData)
        .select()
        .single();

    if (assignError) throw assignError;

    // 2. If it's a quiz and has questions, insert them
    if (assignment.type === 'quiz' && questions.length > 0) {
        const questionsToInsert = questions.map(q => ({
            assignment_id: assignment.id,
            question_text: q.question_text,
            options: q.options, // Already JSON
            correct_answer: q.correct_answer,
            marks: q.marks || 1
        }));

        const { error: quizError } = await supabase
            .from('assignment_questions')
            .insert(questionsToInsert);

        if (quizError) {
            // Rollback (delete assignment if questions fail - simplified transaction logic)
            await supabase.from('assignments').delete().eq('id', assignment.id);
            throw quizError;
        }
    }

    return assignment;
}

export async function deleteAssignment(assignmentId) {
    const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

    if (error) throw error;
}

// ============================================================
// SUBMISSION SERVICES
// ============================================================

export async function submitAssignment(submissionData) {
    // Check if already submitted
    const { data: existing } = await supabase
        .from('submissions')
        .select('id')
        .eq('assignment_id', submissionData.assignment_id)
        .eq('student_id', submissionData.student_id)
        .maybeSingle();

    if (existing) {
        // Update existing submission
        const { data, error } = await supabase
            .from('submissions')
            .update({
                ...submissionData,
                submitted_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        // Create new submission
        const { data, error } = await supabase
            .from('submissions')
            .insert(submissionData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

export async function fetchMySubmission(assignmentId, studentId) {
    const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function fetchSubmissionsByAssignmentId(assignmentId) {
    const { data, error } = await supabase
        .from('submissions')
        .select(`
      *,
      student:student_id (
        full_name,
        avatar_url,
        email
      )
    `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function gradeSubmission(submissionId, grade, feedback) {
    const { data, error } = await supabase
        .from('submissions')
        .update({
            grade,
            feedback,
            graded_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============================================================
// STORAGE SERVICES
// ============================================================

export async function uploadSubmissionFile(assignmentId, studentId, file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${assignmentId}/${studentId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('assignment-submissions')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
        .from('assignment-submissions')
        .getPublicUrl(filePath);

    return data.publicUrl;
}
