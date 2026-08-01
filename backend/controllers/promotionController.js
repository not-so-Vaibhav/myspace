// backend/controllers/promotionController.js
// HTTP controller layer for Academic Promotion Engine.

const service = require('../services/promotionService');

function getCallerId(req) {
    return req.user?.id || req.headers['x-user-id'] || null;
}

// ── POST /api/academic-promotion/evaluate ──────────────────────
async function evaluate(req, res, next) {
    try {
        const {
            student_id,
            from_semester_id,
            from_academic_year_id,
            to_semester_id,
            to_academic_year_id,
            auto_approve,
        } = req.validatedBody;

        const result = await service.evaluateStudent({
            studentId: student_id,
            fromSemesterId: from_semester_id,
            fromAcademicYearId: from_academic_year_id,
            toSemesterId: to_semester_id,
            toAcademicYearId: to_academic_year_id,
            autoApprove: auto_approve !== undefined ? auto_approve : true,
            evaluatedBy: getCallerId(req),
        });

        res.json({
            status: 'ok',
            message: `Evaluation completed: ${result.evaluation.decision}`,
            data: result,
        });
    } catch (err) {
        next(err);
    }
}

// ── POST /api/academic-promotion/:id/approve ──────────────────
async function approve(req, res, next) {
    try {
        const { remarks } = req.validatedBody;
        const result = await service.approvePromotionDecision(req.params.id, getCallerId(req), remarks);
        res.json({
            status: 'ok',
            message: 'Promotion decision approved and applied',
            data: result,
        });
    } catch (err) {
        next(err);
    }
}

// ── GET /api/academic-promotion/history ────────────────────────
async function history(req, res, next) {
    try {
        const filters = {
            studentId: req.query.student_id,
            approvalStatus: req.query.approval_status,
        };
        const records = await service.getPromotionHistory(filters);
        res.json({ status: 'ok', count: records.length, data: records });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    evaluate,
    approve,
    history,
};
