// backend/services/studentLifecycleService.js
// Business logic layer for Student Lifecycle state machine transitions.

const repo = require('../repositories/studentLifecycleRepository');
const fsm  = require('./lifecycleStateMachine');

/**
 * Fetch all students with optional status/search filters.
 */
async function listStudents(filters = {}) {
    return repo.findAllStudents(filters);
}

/**
 * Fetch student profile and their current lifecycle status.
 */
async function getStudentLifecycle(studentId) {
    const student = await repo.findStudentById(studentId);
    if (!student) {
        throw Object.assign(new Error('Student not found'), { status: 404 });
    }
    const allowedNextStates = fsm.getAllowedNextStates(student.lifecycle_status);
    return {
        ...student,
        allowed_next_states: allowedNextStates,
    };
}

/**
 * Fetch lifecycle audit history for a student.
 */
async function getStudentLifecycleHistory(studentId) {
    await repo.findStudentById(studentId); // Verify student exists
    return repo.findHistoryByStudentId(studentId);
}

/**
 * Perform a standard or automatic state transition.
 * @param {object} params
 * @param {string} params.studentId
 * @param {string} params.targetState
 * @param {string} [params.transitionType='MANUAL'] - 'AUTOMATIC' | 'MANUAL'
 * @param {string} [params.reason]
 * @param {object} [params.metadata]
 * @param {string} [params.changedBy]
 */
async function transitionStudentState({ studentId, targetState, transitionType = 'MANUAL', reason, metadata, changedBy }) {
    const student = await repo.findStudentById(studentId);
    if (!student) {
        throw Object.assign(new Error('Student not found'), { status: 404 });
    }

    const currentState = student.lifecycle_status;

    // Validate transition via Finite State Machine
    const validation = fsm.validateTransition(currentState, targetState, false);
    if (!validation.valid) {
        throw Object.assign(new Error(validation.error), { status: 422 });
    }

    // Update status in profiles
    const updatedStudent = await repo.updateStudentStatus(studentId, targetState);

    // Audit log entry
    const historyEntry = await repo.createHistoryEntry({
        studentId,
        fromState: currentState,
        toState: targetState,
        transitionType,
        reason: reason || `Transitioned from ${currentState} to ${targetState}`,
        metadata,
        changedBy,
    });

    return {
        student: updatedStudent,
        history: historyEntry,
    };
}

/**
 * Perform an Admin Override state transition.
 * Mandatory requirement: 'reason' must be provided for audit accountability.
 * Strict restriction: Cannot transition out of GRADUATED state.
 * @param {object} params
 * @param {string} params.studentId
 * @param {string} params.targetState
 * @param {string} params.reason - Mandatory override justification
 * @param {object} [params.metadata]
 * @param {string} [params.changedBy]
 */
async function adminOverrideState({ studentId, targetState, reason, metadata, changedBy }) {
    if (!reason || !reason.trim()) {
        throw Object.assign(new Error('Admin override requires a mandatory justification reason'), { status: 400 });
    }

    const student = await repo.findStudentById(studentId);
    if (!student) {
        throw Object.assign(new Error('Student not found'), { status: 404 });
    }

    const currentState = student.lifecycle_status;

    // Validate transition under Admin Override (allows non-standard jumps, but blocks GRADUATED)
    const validation = fsm.validateTransition(currentState, targetState, true);
    if (!validation.valid) {
        throw Object.assign(new Error(validation.error), { status: 422 });
    }

    // Update status
    const updatedStudent = await repo.updateStudentStatus(studentId, targetState);

    // Audit log entry marked explicitly as ADMIN_OVERRIDE
    const historyEntry = await repo.createHistoryEntry({
        studentId,
        fromState: currentState,
        toState: targetState,
        transitionType: 'ADMIN_OVERRIDE',
        reason: `[ADMIN OVERRIDE] ${reason.trim()}`,
        metadata,
        changedBy,
    });

    return {
        student: updatedStudent,
        history: historyEntry,
    };
}

module.exports = {
    listStudents,
    getStudentLifecycle,
    getStudentLifecycleHistory,
    transitionStudentState,
    adminOverrideState,
    // Export state constants for reference
    STATES: fsm.STATES,
    ALLOWED_TRANSITIONS: fsm.ALLOWED_TRANSITIONS,
};
