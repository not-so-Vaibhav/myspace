// backend/tests/studentLifecycle.test.js
// Unit & Integration test suite for the Student Lifecycle Engine.
// Run with: npx jest tests/studentLifecycle.test.js

const request = require('supertest');
const app = require('../server');
const fsm = require('../services/lifecycleStateMachine');

// ── 1. Unit Tests: Finite State Machine Validator ──────────────────────────────
describe('Unit Tests: Lifecycle State Machine (FSM)', () => {
    it('validates standard primary progression sequence', () => {
        expect(fsm.validateTransition('APPLIED', 'ADMITTED').valid).toBe(true);
        expect(fsm.validateTransition('ADMITTED', 'REGISTERED').valid).toBe(true);
        expect(fsm.validateTransition('REGISTERED', 'COURSE_REGISTERED').valid).toBe(true);
        expect(fsm.validateTransition('COURSE_REGISTERED', 'ACTIVE').valid).toBe(true);
        expect(fsm.validateTransition('ACTIVE', 'EXAM_ELIGIBLE').valid).toBe(true);
        expect(fsm.validateTransition('EXAM_ELIGIBLE', 'RESULT_PUBLISHED').valid).toBe(true);
        expect(fsm.validateTransition('RESULT_PUBLISHED', 'PROMOTED').valid).toBe(true);
    });

    it('rejects illegal standard transitions (e.g. APPLIED -> EXAM_ELIGIBLE)', () => {
        const res = fsm.validateTransition('APPLIED', 'EXAM_ELIGIBLE', false);
        expect(res.valid).toBe(false);
        expect(res.error).toContain('Invalid transition');
    });

    it('rejects transition to the exact same state', () => {
        const res = fsm.validateTransition('ACTIVE', 'ACTIVE', false);
        expect(res.valid).toBe(false);
        expect(res.error).toContain('already in state');
    });

    it('allows Admin Override for non-standard skips (e.g. ADMITTED -> ACTIVE)', () => {
        const res = fsm.validateTransition('ADMITTED', 'ACTIVE', true);
        expect(res.valid).toBe(true);
    });

    it('STRICTLY BLOCKS transition out of GRADUATED state, even with Admin Override', () => {
        const standardRes = fsm.validateTransition('GRADUATED', 'ACTIVE', false);
        expect(standardRes.valid).toBe(false);

        const overrideRes = fsm.validateTransition('GRADUATED', 'ACTIVE', true);
        expect(overrideRes.valid).toBe(false);
        expect(overrideRes.error).toContain('strictly terminal');
    });
});

// ── 2. Integration Tests: API Endpoints ───────────────────────────────────────
describe('Integration Tests: Student Lifecycle API', () => {
    it('GET /api/student-lifecycle/states returns all states and transitions matrix', async () => {
        const res = await request(app).get('/api/student-lifecycle/states');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.data.states).toContain('APPLIED');
        expect(res.body.data.states).toContain('GRADUATED');
        expect(res.body.data.allowed_transitions).toHaveProperty('ACTIVE');
    });

    it('GET /api/student-lifecycle/students returns array of students', async () => {
        const res = await request(app).get('/api/student-lifecycle/students');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(Array.isArray(res.body.data)).toBe(true);
    }, 15000);

    it('POST /api/student-lifecycle/:studentId/transition rejects invalid target_state payload', async () => {
        const res = await request(app)
            .post('/api/student-lifecycle/00000000-0000-0000-0000-000000000000/transition')
            .send({ target_state: 'INVALID_SUPER_STATE' });
        expect(res.statusCode).toBe(422);
        expect(res.body.status).toBe('error');
    });

    it('POST /api/student-lifecycle/:studentId/override rejects override WITHOUT mandatory reason', async () => {
        const res = await request(app)
            .post('/api/student-lifecycle/00000000-0000-0000-0000-000000000000/override')
            .send({ target_state: 'ACTIVE', reason: '' });
        expect(res.statusCode).toBe(422);
        expect(res.body.status).toBe('error');
    });
});
