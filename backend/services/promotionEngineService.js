// backend/services/promotionEngineService.js
// Pure Dynamic Rule-Based Promotion Evaluation Engine.
// DO NOT hardcode any promotion thresholds; all criteria come directly from the active academic_rule.

const DECISIONS = Object.freeze({
    PROMOTED:           'PROMOTED',
    PROMOTED_WITH_ATKT: 'PROMOTED_WITH_ATKT',
    REPEAT_SEMESTER:    'REPEAT_SEMESTER',
    DETAINED:           'DETAINED',
    GRADUATED:          'GRADUATED',
});

/**
 * Evaluate a student's metrics against a dynamic Academic Rule.
 *
 * @param {object} studentMetrics
 * @param {number} studentMetrics.attendance_percent - Calculated attendance (0-100)
 * @param {number} studentMetrics.sgpa               - Current semester SGPA (0-10)
 * @param {number} studentMetrics.cgpa               - Cumulative CGPA (0-10)
 * @param {number} studentMetrics.earned_credits     - Earned credits in current semester
 * @param {number} studentMetrics.total_earned_credits - Total cumulative credits earned across program
 * @param {number} studentMetrics.backlogs_count     - Total active pending backlogs
 * @param {boolean} studentMetrics.is_final_semester - True if student is in final semester of program
 *
 * @param {object} rule - Record from public.academic_rules
 * @param {number} rule.min_attendance_percent
 * @param {number} rule.min_sgpa
 * @param {number} rule.min_credits
 * @param {number} rule.max_backlogs_allowed
 * @param {boolean} rule.allow_atkt
 * @param {boolean} rule.promote_with_backlogs
 * @param {string} rule.promotion_policy - 'STANDARD' | 'STRICT' | 'LIBERAL'
 * @param {number} rule.credits_required_for_promotion
 * @param {number} rule.credits_required_for_graduation
 *
 * @returns {object} Evaluation Result object with decision, checks breakdown, and log reasons.
 */
function evaluatePromotion(studentMetrics, rule) {
    if (!rule) {
        throw new Error('No academic rule provided for promotion evaluation');
    }

    const attendance  = parseFloat(studentMetrics.attendance_percent || 0);
    const sgpa        = parseFloat(studentMetrics.sgpa || 0);
    const cgpa        = parseFloat(studentMetrics.cgpa || 0);
    const semCredits  = parseFloat(studentMetrics.earned_credits || 0);
    const totalCredits= parseFloat(studentMetrics.total_earned_credits || semCredits);
    const backlogs    = parseInt(studentMetrics.backlogs_count || 0, 10);
    const isFinalSem  = Boolean(studentMetrics.is_final_semester);

    // Rule Criteria Thresholds (Dynamic from DB)
    const minAttendance = parseFloat(rule.min_attendance_percent ?? 75);
    const minSgpa       = parseFloat(rule.min_sgpa ?? 5);
    const minSemCredits = parseFloat(rule.min_credits ?? 0);
    const maxBacklogs   = parseInt(rule.max_backlogs_allowed ?? 2, 10);
    const allowATKT     = Boolean(rule.allow_atkt ?? true);
    const policy        = rule.promotion_policy || 'STANDARD';
    const reqPromoCreds = parseFloat(rule.credits_required_for_promotion ?? 0);
    const reqGradCreds  = parseFloat(rule.credits_required_for_graduation ?? 160);

    // ── Individual Checks ──────────────────────────────────────────────────────
    const meetsAttendance = attendance >= minAttendance;
    const meetsSgpa       = sgpa >= minSgpa;
    const meetsSemCredits = semCredits >= minSemCredits;
    const meetsPromoCreds = reqPromoCreds > 0 ? semCredits >= reqPromoCreds : true;
    const meetsZeroBacklogs = backlogs === 0;
    const meetsMaxBacklogs  = backlogs <= maxBacklogs;

    const checks = {
        meets_attendance: meetsAttendance,
        meets_sgpa: meetsSgpa,
        meets_sem_credits: meetsSemCredits,
        meets_promo_credits: meetsPromoCreds,
        meets_zero_backlogs: meetsZeroBacklogs,
        meets_max_backlogs: meetsMaxBacklogs,
        policy_applied: policy,
        allow_atkt: allowATKT,
    };

    const reasons = [];

    // ── STEP 1: Check Attendance (Detention Rule) ─────────────────────────────
    if (!meetsAttendance) {
        reasons.push(`Attendance of ${attendance.toFixed(1)}% is below the required minimum of ${minAttendance}%`);
        return {
            decision: DECISIONS.DETAINED,
            reasons,
            checks,
            rule_id: rule.id,
            rule_version: rule.version,
        };
    }

    // ── STEP 2: Check Graduation (Final Semester Rule) ────────────────────────
    if (isFinalSem) {
        const meetsGradCredits = totalCredits >= reqGradCreds;
        const meetsGradCgpa    = cgpa >= minSgpa;

        if (meetsZeroBacklogs && meetsGradCredits && meetsGradCgpa) {
            reasons.push(`Cleared all graduation requirements: ${totalCredits} total credits (≥ ${reqGradCreds}), CGPA ${cgpa.toFixed(2)}, 0 backlogs`);
            return {
                decision: DECISIONS.GRADUATED,
                reasons,
                checks: { ...checks, meets_grad_credits: meetsGradCredits, meets_grad_cgpa: meetsGradCgpa },
                rule_id: rule.id,
                rule_version: rule.version,
            };
        }
    }

    // ── STEP 3: STRICT Policy Handling ────────────────────────────────────────
    if (policy === 'STRICT') {
        if (meetsZeroBacklogs && meetsSgpa && meetsSemCredits && meetsPromoCreds) {
            reasons.push(`Passed STRICT evaluation: 0 backlogs, SGPA ${sgpa.toFixed(2)} ≥ ${minSgpa}, Credits ${semCredits} ≥ ${minSemCredits}`);
            return { decision: DECISIONS.PROMOTED, reasons, checks, rule_id: rule.id, rule_version: rule.version };
        } else {
            if (!meetsZeroBacklogs) reasons.push(`STRICT policy failed: ${backlogs} active backlog(s)`);
            if (!meetsSgpa) reasons.push(`STRICT policy failed: SGPA ${sgpa.toFixed(2)} < ${minSgpa}`);
            if (!meetsSemCredits) reasons.push(`STRICT policy failed: Earned credits ${semCredits} < ${minSemCredits}`);
            return { decision: DECISIONS.REPEAT_SEMESTER, reasons, checks, rule_id: rule.id, rule_version: rule.version };
        }
    }

    // ── STEP 4: Standard / Liberal Evaluation ──────────────────────────────────

    // Case A: Perfect Clear Promotion (0 backlogs, SGPA & credits met)
    if (meetsZeroBacklogs && meetsSgpa && meetsSemCredits && meetsPromoCreds) {
        reasons.push(`Fully cleared: 0 backlogs, SGPA ${sgpa.toFixed(2)} ≥ ${minSgpa}, Credits ${semCredits} ≥ ${minSemCredits}`);
        return { decision: DECISIONS.PROMOTED, reasons, checks, rule_id: rule.id, rule_version: rule.version };
    }

    // Case B: ATKT (Allowed To Keep Terms) Promotion
    if (allowATKT && meetsMaxBacklogs && meetsSgpa && meetsPromoCreds) {
        reasons.push(`Promoted with ATKT: ${backlogs} active backlog(s) (within allowed max ${maxBacklogs}), SGPA ${sgpa.toFixed(2)} ≥ ${minSgpa}`);
        return { decision: DECISIONS.PROMOTED_WITH_ATKT, reasons, checks, rule_id: rule.id, rule_version: rule.version };
    }

    // Case C: Repeat Semester (Backlogs exceeded OR failed SGPA/Credits criteria)
    if (!meetsMaxBacklogs) {
        reasons.push(`Active backlogs (${backlogs}) exceed maximum allowed threshold (${maxBacklogs})`);
    }
    if (!allowATKT && backlogs > 0) {
        reasons.push(`ATKT is disabled for this academic policy and student has ${backlogs} backlog(s)`);
    }
    if (!meetsSgpa) {
        reasons.push(`SGPA of ${sgpa.toFixed(2)} is below required minimum of ${minSgpa}`);
    }
    if (!meetsPromoCreds) {
        reasons.push(`Earned credits (${semCredits}) fall below promotion requirement (${reqPromoCreds})`);
    }

    return {
        decision: DECISIONS.REPEAT_SEMESTER,
        reasons,
        checks,
        rule_id: rule.id,
        rule_version: rule.version,
    };
}

module.exports = {
    DECISIONS,
    evaluatePromotion,
};
