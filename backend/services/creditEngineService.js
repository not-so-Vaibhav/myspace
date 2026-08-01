// backend/services/creditEngineService.js
// Credit/SGPA/CGPA Engine

const supabase = require('../config/supabaseClient');

/**
 * Helper to throw standard errors
 */
function throwIfError({ error }) {
    if (error) throw new Error(error.message);
}

/**
 * Calculates SGPA, CGPA, and Credit metrics for a student.
 * Uses existing grading schemes and student_results table.
 * 
 * @param {string} studentId - The UUID of the student
 * @param {string} [semesterId] - Optional semester ID to calculate SGPA for a specific semester
 * @returns {Object} Student credit summary metrics
 */
async function calculateStudentMetrics(studentId, semesterId = null) {
    // 1. Fetch all published results (attempt_number = 1 or latest for a subject)
    // To handle multiple attempts (ATKT), we need the highest/latest attempt for each subject.
    const { data: results, error } = await supabase
        .from('student_results')
        .select(`
            id,
            subject_id,
            semester_id,
            grade_points,
            is_pass,
            attempt_number,
            subject:subjects ( credits )
        `)
        .eq('student_id', studentId);
        
    throwIfError({ error });

    // Deduplicate: Keep only the latest attempt per subject
    const latestResults = new Map();
    (results || []).forEach(r => {
        const existing = latestResults.get(r.subject_id);
        if (!existing || existing.attempt_number < r.attempt_number) {
            latestResults.set(r.subject_id, r);
        }
    });

    const allLatest = Array.from(latestResults.values());
    
    // Calculate cumulative metrics (CGPA, total credits)
    let cgpaTotalPoints = 0;
    let cgpaTotalCredits = 0;
    let creditsEarned = 0;
    let creditsRegistered = 0;
    let creditsPending = 0;

    allLatest.forEach(r => {
        const credits = r.subject?.credits || 0;
        creditsRegistered += credits;
        
        if (r.is_pass) {
            creditsEarned += credits;
            if (r.grade_points != null) {
                cgpaTotalPoints += parseFloat(r.grade_points) * credits;
                cgpaTotalCredits += credits;
            }
        } else {
            creditsPending += credits;
        }
    });

    const cgpa = cgpaTotalCredits > 0 ? parseFloat((cgpaTotalPoints / cgpaTotalCredits).toFixed(2)) : 0;
    const percentage = cgpa > 0 ? parseFloat((cgpa * 9.5).toFixed(2)) : 0; // Standard CGPA to % formula (approx)

    // Calculate Semester-specific metrics if requested
    let sgpa = 0;
    let semesterCreditsEarned = 0;
    let semesterCreditsRegistered = 0;

    if (semesterId) {
        let sgpaTotalPoints = 0;
        let sgpaTotalCredits = 0;

        const semesterResults = allLatest.filter(r => r.semester_id === semesterId);
        
        semesterResults.forEach(r => {
            const credits = r.subject?.credits || 0;
            semesterCreditsRegistered += credits;
            
            if (r.is_pass) {
                semesterCreditsEarned += credits;
                if (r.grade_points != null) {
                    sgpaTotalPoints += parseFloat(r.grade_points) * credits;
                    sgpaTotalCredits += credits;
                }
            }
        });

        sgpa = sgpaTotalCredits > 0 ? parseFloat((sgpaTotalPoints / sgpaTotalCredits).toFixed(2)) : 0;
    } else {
        sgpa = cgpa; 
    }

    const creditDeficit = creditsRegistered - creditsEarned;

    return {
        student_id: studentId,
        semester_id: semesterId,
        sgpa,
        cgpa,
        percentage,
        credits_registered: creditsRegistered,
        credits_earned: creditsEarned,
        credits_pending: creditsPending,
        credit_deficit: creditDeficit,
        semester_credits_earned: semesterCreditsEarned,
        semester_credits_registered: semesterCreditsRegistered
    };
}

/**
 * Auto-recalculate metrics and update student_semester_history and promotion_history
 */
async function triggerRecalculation(studentId, semesterId) {
    try {
        const metrics = await calculateStudentMetrics(studentId, semesterId);
        
        const remarkString = `CGPA: ${metrics.cgpa}, Earned: ${metrics.credits_earned}/${metrics.credits_registered}`;
        
        await supabase
            .from('student_semester_history')
            .update({ remarks: remarkString })
            .eq('student_id', studentId)
            .eq('semester_id', semesterId);
            
        return metrics;
    } catch (err) {
        console.error(`[CreditEngine] Recalculation failed for student ${studentId}:`, err);
        throw err;
    }
}

/**
 * Get detailed transcript
 */
async function generateTranscript(studentId) {
    const metrics = await calculateStudentMetrics(studentId);
    
    // Fetch all semesters
    const { data: results, error } = await supabase
        .from('v_student_result_card')
        .select('*')
        .eq('student_id', studentId)
        .order('semester_term', { ascending: true });
        
    throwIfError({ error });
    
    // Group by semester
    const semestersMap = new Map();
    (results || []).forEach(r => {
        if (!semestersMap.has(r.semester_id)) {
            semestersMap.set(r.semester_id, {
                semester_id: r.semester_id,
                semester_term: r.semester_term,
                academic_year_label: r.academic_year_label,
                subjects: []
            });
        }
        semestersMap.get(r.semester_id).subjects.push(r);
    });
    
    return {
        summary: metrics,
        semesters: Array.from(semestersMap.values())
    };
}

module.exports = {
    calculateStudentMetrics,
    triggerRecalculation,
    generateTranscript
};
