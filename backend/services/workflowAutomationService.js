// backend/services/workflowAutomationService.js
// Orchestration of automated background tasks (end-of-semester processing, etc.)

const supabase = require('../config/supabaseClient');
const promotionService = require('./promotionService');
const graduationService = require('./graduationService');

function throwIfError({ error }) {
    if (error) throw new Error(error.message);
}

/**
 * Automates end of semester processing for a specific batch/semester.
 * Evaluates all students for promotion and checks graduation eligibility.
 *
 * @param {string} semesterId
 * @param {string} academicYearId
 * @param {string} processedBy (Admin UUID executing the job)
 */
async function processEndOfSemester(semesterId, academicYearId, processedBy = null) {
    const results = {
        totalEvaluated: 0,
        promoted: 0,
        graduated: 0,
        heldBack: 0,
        errors: []
    };

    try {
        // 1. Find all active students in this semester
        const { data: students, error } = await supabase
            .from('student_semester_history')
            .select('student_id')
            .eq('semester_id', semesterId)
            .eq('is_current', true);
            
        throwIfError({ error });

        if (!students || students.length === 0) {
            return { message: 'No active students found for this semester.', ...results };
        }

        results.totalEvaluated = students.length;

        // 2. Determine target semester/academic year if possible
        // (For simplicity, we assume auto-approve and target is NULL, meaning manual mapping is required next semester, 
        // OR we can leave target empty for now and let admins map them to batches later.)
        // In a real ERP, we'd look up the next semester in sequence.

        // 3. Process each student
        for (const record of students) {
            const studentId = record.student_id;
            
            try {
                // Check if they are eligible for graduation first
                // A better approach is to evaluate promotion, and if they passed all semesters, they graduate.
                const evalResult = await promotionService.evaluateStudent({
                    studentId,
                    fromSemesterId: semesterId,
                    fromAcademicYearId: academicYearId,
                    autoApprove: true,
                    evaluatedBy: processedBy
                });

                if (evalResult.evaluation.decision === 'GRADUATED') {
                    // Try to process graduation
                    try {
                        await graduationService.processGraduation(studentId, processedBy, false, 'Auto-graduated via End of Semester Workflow.');
                        results.graduated++;
                    } catch (gradErr) {
                        results.errors.push({ studentId, error: gradErr.message });
                    }
                } else if (evalResult.evaluation.decision.includes('PROMOTED')) {
                    results.promoted++;
                } else {
                    results.heldBack++;
                }

            } catch (err) {
                results.errors.push({ studentId, error: err.message });
            }
        }

        return results;

    } catch (err) {
        console.error(`[Workflow] End of semester processing failed:`, err);
        throw err;
    }
}

/**
 * Identify completed semesters (end date has passed) and trigger processing.
 * This is meant to be called by a daily cron job.
 */
async function autoProcessCompletedSemesters() {
    console.log('[Workflow] Checking for completed semesters to auto-process...');
    
    // Find semesters that ended yesterday and haven't been processed
    // Note: We need a field like 'is_processed' or similar. 
    // Assuming manual trigger for now via Admin UI to avoid accidental mass processing.
    
    // This is just a stub for the cron job to call
    return { status: 'skipped', message: 'Auto-processing requires manual admin trigger in current configuration.' };
}

module.exports = {
    processEndOfSemester,
    autoProcessCompletedSemesters
};
