// backend/services/graduationService.js
// Graduation & Degree Eligibility Engine

const supabase = require('../config/supabaseClient');
const creditEngine = require('./creditEngineService');
const lifecycle = require('./studentLifecycleService');
const rulesRepo = require('../repositories/academicRulesRepository');

function throwIfError({ error }) {
    if (error) throw new Error(error.message);
}

/**
 * Check if a student is eligible for graduation.
 *
 * @param {string} studentId
 */
async function checkEligibility(studentId) {
    const issues = [];
    let isEligible = true;

    // 1. Fetch Student Profile and Program
    // Assuming student profile links to department, and department has a default program
    // or student links to program. For now, we'll fetch via student_semester_history -> academic_year -> program
    const { data: history, error: hErr } = await supabase
        .from('student_semester_history')
        .select(`
            id,
            semester:semesters ( id, term_number, program_id ),
            academic_year:academic_years ( id, program_id )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (hErr) throw hErr;
    if (!history) {
        return { isEligible: false, issues: ['No active academic record found for student.'] };
    }

    const programId = history.semester?.program_id || history.academic_year?.program_id;

    if (!programId) {
        return { isEligible: false, issues: ['Student is not mapped to any program.'] };
    }

    const { data: program, error: pErr } = await supabase
        .from('programs')
        .select('total_semesters, total_credits, name')
        .eq('id', programId)
        .single();

    if (pErr) throw pErr;

    // 2. Fetch completed semesters
    const { data: semestersCompleted, error: sErr } = await supabase
        .from('student_semester_history')
        .select('id')
        .eq('student_id', studentId)
        .not('completed_on', 'is', null);

    if (sErr) throw sErr;
    
    // Some students might have active final semester, we count total distinct semesters
    const { data: allSemesters } = await supabase
        .from('student_semester_history')
        .select('semester_id')
        .eq('student_id', studentId);
        
    const uniqueSemesters = new Set((allSemesters || []).map(s => s.semester_id)).size;

    if (uniqueSemesters < program.total_semesters) {
        isEligible = false;
        issues.push(`Program requires ${program.total_semesters} semesters, but student has only completed ${uniqueSemesters}.`);
    }

    // 3. Fetch academic metrics (CGPA, Credits)
    const metrics = await creditEngine.calculateStudentMetrics(studentId);

    if (program.total_credits && metrics.credits_earned < program.total_credits) {
        isEligible = false;
        issues.push(`Program requires ${program.total_credits} credits, but student has earned only ${metrics.credits_earned}.`);
    }

    // 4. Fetch pending backlogs
    const { data: backlogs, error: bErr } = await supabase
        .from('backlog_records')
        .select('id, subject:subjects(name)')
        .eq('student_id', studentId)
        .eq('status', 'pending');

    if (bErr) throw bErr;

    if (backlogs && backlogs.length > 0) {
        isEligible = false;
        const subjectNames = backlogs.map(b => b.subject?.name).join(', ');
        issues.push(`Student has ${backlogs.length} pending backlogs (${subjectNames}).`);
    }

    // 5. Fetch academic rules for minimum CGPA
    try {
        const rule = await rulesRepo.findEffectiveRule({ programId });
        if (rule && rule.min_cgpa_for_promotion) {
            // Reusing promotion minimum CGPA as graduation minimum, or we can check rules for graduation specific
            if (metrics.cgpa < rule.min_cgpa_for_promotion) {
                isEligible = false;
                issues.push(`CGPA ${metrics.cgpa} is below the minimum required ${rule.min_cgpa_for_promotion}.`);
            }
        }
    } catch (e) {
        // Ignore if no rule
    }

    return {
        studentId,
        programName: program.name,
        metrics,
        uniqueSemesters,
        backlogsCount: backlogs?.length || 0,
        isEligible,
        issues
    };
}

/**
 * Process graduation for a student if eligible.
 * Transitions their lifecycle state to GRADUATED.
 */
async function processGraduation(studentId, processedBy, force = false, remarks = '') {
    const eligibility = await checkEligibility(studentId);

    if (!eligibility.isEligible && !force) {
        throw new Error(`Cannot graduate student. Issues: ${eligibility.issues.join(' ')}`);
    }

    // Transition state
    await lifecycle.transitionStudentState({
        studentId,
        targetState: 'GRADUATED',
        transitionType: force ? 'MANUAL' : 'AUTOMATIC',
        reason: remarks || 'Successfully completed all degree requirements.',
        changedBy: processedBy
    });
    
    // Additional graduation tasks can go here (generating certs, freezing transcript)

    return {
        status: 'success',
        message: 'Student successfully graduated.',
        eligibility
    };
}

module.exports = {
    checkEligibility,
    processGraduation
};
