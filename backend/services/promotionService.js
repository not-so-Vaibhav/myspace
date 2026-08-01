// backend/services/promotionService.js
// Business logic & orchestration layer for Academic Promotion Engine.

const engineRepo = require('../repositories/promotionRepository');
const engine     = require('./promotionEngineService');
const lifecycle  = require('./studentLifecycleService');

/**
 * Map promotion decision output to the corresponding Student Lifecycle state.
 */
function mapDecisionToLifecycleState(decision) {
    switch (decision) {
        case engine.DECISIONS.PROMOTED:
            return 'PROMOTED';
        case engine.DECISIONS.PROMOTED_WITH_ATKT:
            return 'ATKT';
        case engine.DECISIONS.REPEAT_SEMESTER:
            return 'REPEAT';
        case engine.DECISIONS.DETAINED:
            return 'DETAINED';
        case engine.DECISIONS.GRADUATED:
            return 'GRADUATED';
        default:
            return 'ACTIVE';
    }
}

/**
 * Evaluate a single student for promotion.
 *
 * @param {object} params
 * @param {string} params.studentId
 * @param {string} params.fromSemesterId
 * @param {string} params.fromAcademicYearId
 * @param {string} [params.toSemesterId]
 * @param {string} [params.toAcademicYearId]
 * @param {boolean} [params.autoApprove=true]
 * @param {string} [params.evaluatedBy]
 */
async function evaluateStudent({ studentId, fromSemesterId, fromAcademicYearId, toSemesterId, toAcademicYearId, autoApprove = true, evaluatedBy }) {
    // 1. Fetch dynamic rule for scope
    const rule = await engineRepo.fetchActiveRule({
        semesterId: fromSemesterId,
        academicYearId: fromAcademicYearId
    });

    if (!rule) {
        throw Object.assign(new Error('No active academic rule configured for this scope. Create a rule first.'), { status: 400 });
    }

    // 2. Compute student performance metrics
    const metrics = await engineRepo.fetchStudentMetrics(studentId);

    // 3. Evaluate decision via dynamic Promotion Engine
    const evalResult = engine.evaluatePromotion(metrics, rule);

    const approvalStatus = autoApprove ? 'APPROVED' : 'PENDING_APPROVAL';

    // 4. Create promotion_history record
    const promoRecord = await engineRepo.createPromotionRecord({
        student_id:            studentId,
        from_semester_id:      fromSemesterId,
        from_academic_year_id: fromAcademicYearId,
        to_semester_id:        toSemesterId || null,
        to_academic_year_id:   toAcademicYearId || null,
        decision:              evalResult.decision,
        sgpa:                  metrics.sgpa,
        cgpa:                  metrics.cgpa,
        backlogs_at_decision:  metrics.backlogs_count,
        academic_rule_id:      rule.id,
        approval_status:       approvalStatus,
        evaluation_metrics:    { metrics, evaluation: evalResult },
        decided_by:            evaluatedBy || null,
        decided_at:            new Date().toISOString(),
        remarks:               evalResult.reasons.join('; '),
    });

    // 5. If auto-approved, execute downstream side effects
    if (autoApprove) {
        await executePromotionSideEffects({
            studentId,
            decision: evalResult.decision,
            fromSemesterId,
            metrics,
            evalResult,
            evaluatedBy,
        });
    }

    return {
        evaluation: evalResult,
        promotion_record: promoRecord,
        status: approvalStatus,
    };
}

/**
 * Execute downstream updates (semester history, lifecycle FSM, notifications).
 */
async function executePromotionSideEffects({ studentId, decision, fromSemesterId, metrics, evalResult, evaluatedBy }) {
    // A. Update student_semester_history
    await engineRepo.upsertStudentSemesterHistory({
        student_id: studentId,
        semester_id: fromSemesterId,
        registered_credits: metrics.earned_credits || 0,
        earned_credits: metrics.earned_credits || 0,
        backlog_count: metrics.backlogs_count || 0,
        sgpa: metrics.sgpa,
        cgpa: metrics.cgpa,
        updated_at: new Date().toISOString(),
    });

    // B. Update Student Lifecycle Engine status
    const targetLifecycleState = mapDecisionToLifecycleState(decision);
    try {
        await lifecycle.transitionStudentState({
            studentId,
            targetState: targetLifecycleState,
            transitionType: 'AUTOMATIC',
            reason: `Academic Promotion Engine decision: ${decision} (${evalResult?.reasons?.join('; ') || ''})`,
            changedBy: evaluatedBy,
        });
    } catch (err) {
        console.warn(`[Lifecycle Transition Note]: ${err.message}`);
    }

    // C. Deliver Student Notification
    await engineRepo.sendNotification({
        userId: studentId,
        title: `Academic Decision: ${decision.replace(/_/g, ' ')}`,
        message: `Your semester evaluation has been published. Result: ${decision.replace(/_/g, ' ')}. ${evalResult?.reasons?.[0] || ''}`,
        type: 'PROMOTION',
    });
}

/**
 * Approve a pending promotion decision manually.
 */
async function approvePromotionDecision(promotionId, approvedBy, remarks) {
    const record = await engineRepo.updatePromotionStatus(promotionId, 'APPROVED', remarks, approvedBy);

    // Execute downstream side effects
    await executePromotionSideEffects({
        studentId: record.student_id,
        decision: record.decision,
        fromSemesterId: record.from_semester_id,
        metrics: {
            sgpa: record.sgpa,
            cgpa: record.cgpa,
            earned_credits: 0,
            backlogs_count: record.backlogs_at_decision,
        },
        evalResult: { reasons: [remarks || 'Manually approved by Administrator'] },
        evaluatedBy: approvedBy,
    });

    return record;
}

/**
 * List promotion decisions history.
 */
async function getPromotionHistory(filters = {}) {
    return engineRepo.findPromotionHistory(filters);
}

module.exports = {
    evaluateStudent,
    approvePromotionDecision,
    getPromotionHistory,
    mapDecisionToLifecycleState,
};
