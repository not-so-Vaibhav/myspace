// backend/services/lifecycleStateMachine.js
// Finite State Machine (FSM) definition and validator for Student Lifecycle transitions.

// ── State Enumeration ─────────────────────────────────────────────────────────
const STATES = Object.freeze({
    APPLIED:           'APPLIED',
    ADMITTED:          'ADMITTED',
    REGISTERED:        'REGISTERED',
    COURSE_REGISTERED: 'COURSE_REGISTERED',
    ACTIVE:            'ACTIVE',
    EXAM_ELIGIBLE:     'EXAM_ELIGIBLE',
    RESULT_PUBLISHED:  'RESULT_PUBLISHED',
    PROMOTED:          'PROMOTED',
    ATKT:              'ATKT',
    REPEAT:            'REPEAT',
    DETAINED:          'DETAINED',
    SUSPENDED:         'SUSPENDED',
    DROP_OUT:          'DROP_OUT',
    ON_LEAVE:          'ON_LEAVE',
    GRADUATED:         'GRADUATED',
});

// ── Terminal States ───────────────────────────────────────────────────────────
// GRADUATED is strictly terminal (cannot be moved even by admin override)
const STRICT_TERMINAL_STATES = new Set([STATES.GRADUATED]);

// Normal terminal states (can only be moved via admin override)
const TERMINAL_STATES = new Set([STATES.DROP_OUT, STATES.GRADUATED]);

// ── Allowed Standard Transitions Matrix ───────────────────────────────────────
const ALLOWED_TRANSITIONS = Object.freeze({
    [STATES.APPLIED]:           [STATES.ADMITTED, STATES.DROP_OUT],
    [STATES.ADMITTED]:          [STATES.REGISTERED, STATES.DROP_OUT, STATES.ON_LEAVE],
    [STATES.REGISTERED]:        [STATES.COURSE_REGISTERED, STATES.ON_LEAVE, STATES.DROP_OUT, STATES.SUSPENDED],
    [STATES.COURSE_REGISTERED]: [STATES.ACTIVE, STATES.ON_LEAVE, STATES.DROP_OUT, STATES.SUSPENDED],
    [STATES.ACTIVE]:            [STATES.EXAM_ELIGIBLE, STATES.DETAINED, STATES.ON_LEAVE, STATES.SUSPENDED, STATES.DROP_OUT],
    [STATES.EXAM_ELIGIBLE]:     [STATES.RESULT_PUBLISHED, STATES.DETAINED, STATES.SUSPENDED],
    [STATES.RESULT_PUBLISHED]:  [STATES.PROMOTED, STATES.ATKT, STATES.REPEAT, STATES.DETAINED, STATES.GRADUATED],
    [STATES.PROMOTED]:          [STATES.REGISTERED, STATES.COURSE_REGISTERED, STATES.GRADUATED],
    [STATES.ATKT]:              [STATES.COURSE_REGISTERED, STATES.ACTIVE, STATES.EXAM_ELIGIBLE, STATES.REPEAT, STATES.DROP_OUT, STATES.SUSPENDED],
    [STATES.REPEAT]:            [STATES.COURSE_REGISTERED, STATES.ACTIVE, STATES.DROP_OUT, STATES.SUSPENDED],
    [STATES.DETAINED]:          [STATES.REPEAT, STATES.ACTIVE, STATES.DROP_OUT, STATES.SUSPENDED],
    [STATES.SUSPENDED]:         [STATES.ACTIVE, STATES.DROP_OUT],
    [STATES.ON_LEAVE]:          [STATES.ACTIVE, STATES.REGISTERED, STATES.DROP_OUT],
    [STATES.DROP_OUT]:          [], // No standard transitions from DROP_OUT
    [STATES.GRADUATED]:         [], // No transitions from GRADUATED
});

// ── Validation Functions ──────────────────────────────────────────────────────

/**
 * Checks if a state string is a valid lifecycle state.
 */
function isValidState(state) {
    return Object.values(STATES).includes(state);
}

/**
 * Gets array of allowed next states for a given current state under standard workflow.
 */
function getAllowedNextStates(currentState) {
    return ALLOWED_TRANSITIONS[currentState] || [];
}

/**
 * Validates whether a transition from currentState to targetState is allowed.
 * @param {string} currentState
 * @param {string} targetState
 * @param {boolean} isAdminOverride
 * @returns {{ valid: boolean, error?: string }}
 */
function validateTransition(currentState, targetState, isAdminOverride = false) {
    if (!isValidState(targetState)) {
        return { valid: false, error: `Invalid target state: "${targetState}"` };
    }

    if (currentState === targetState) {
        return { valid: false, error: `Student is already in state "${targetState}"` };
    }

    // Strict terminal check: GRADUATED cannot transition to anything, even under admin override
    if (STRICT_TERMINAL_STATES.has(currentState)) {
        return { valid: false, error: `State "${currentState}" is strictly terminal. Graduated students cannot be transitioned.` };
    }

    // Standard transition check
    const allowed = ALLOWED_TRANSITIONS[currentState] || [];
    if (allowed.includes(targetState)) {
        return { valid: true };
    }

    // Admin override check
    if (isAdminOverride) {
        return { valid: true };
    }

    return {
        valid: false,
        error: `Invalid transition from "${currentState}" to "${targetState}". Allowed next states: [${allowed.join(', ')}]`
    };
}

module.exports = {
    STATES,
    STRICT_TERMINAL_STATES,
    TERMINAL_STATES,
    ALLOWED_TRANSITIONS,
    isValidState,
    getAllowedNextStates,
    validateTransition,
};
