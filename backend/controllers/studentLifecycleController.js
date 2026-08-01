// backend/controllers/studentLifecycleController.js
// HTTP controller layer for Student Lifecycle management.

const service = require('../services/studentLifecycleService');

function getCallerId(req) {
    return req.user?.id || req.headers['x-user-id'] || null;
}

// ── GET /api/student-lifecycle/students ───────────────────────
async function listStudents(req, res, next) {
    try {
        const filters = {
            status: req.query.status,
            search: req.query.search,
        };
        const students = await service.listStudents(filters);
        res.json({ status: 'ok', count: students.length, data: students });
    } catch (err) {
        next(err);
    }
}

// ── GET /api/student-lifecycle/states ──────────────────────────
async function getStatesMatrix(req, res, next) {
    try {
        res.json({
            status: 'ok',
            data: {
                states: Object.values(service.STATES),
                allowed_transitions: service.ALLOWED_TRANSITIONS,
            }
        });
    } catch (err) {
        next(err);
    }
}

// ── GET /api/student-lifecycle/:studentId ──────────────────────
async function getStudentLifecycle(req, res, next) {
    try {
        const student = await service.getStudentLifecycle(req.params.studentId);
        res.json({ status: 'ok', data: student });
    } catch (err) {
        next(err);
    }
}

// ── GET /api/student-lifecycle/:studentId/history ─────────────
async function getHistory(req, res, next) {
    try {
        const history = await service.getStudentLifecycleHistory(req.params.studentId);
        res.json({ status: 'ok', count: history.length, data: history });
    } catch (err) {
        next(err);
    }
}

// ── POST /api/student-lifecycle/:studentId/transition ─────────
async function transition(req, res, next) {
    try {
        const { target_state, transition_type, reason, metadata } = req.validatedBody;
        const result = await service.transitionStudentState({
            studentId: req.params.studentId,
            targetState: target_state,
            transitionType: transition_type || 'MANUAL',
            reason,
            metadata,
            changedBy: getCallerId(req),
        });
        res.json({ status: 'ok', message: `Student transitioned to ${target_state}`, data: result });
    } catch (err) {
        next(err);
    }
}

// ── POST /api/student-lifecycle/:studentId/override ───────────
async function override(req, res, next) {
    try {
        const { target_state, reason, metadata } = req.validatedBody;
        const result = await service.adminOverrideState({
            studentId: req.params.studentId,
            targetState: target_state,
            reason,
            metadata,
            changedBy: getCallerId(req),
        });
        res.json({ status: 'ok', message: `Admin override applied: transitioned to ${target_state}`, data: result });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    listStudents,
    getStatesMatrix,
    getStudentLifecycle,
    getHistory,
    transition,
    override,
};
