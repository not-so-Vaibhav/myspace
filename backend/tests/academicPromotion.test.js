// backend/tests/academicPromotion.test.js
// Unit & Integration test suite for the Academic Promotion Engine.
// Run with: npx jest tests/academicPromotion.test.js

const request = require('supertest');
const app = require('../server');
const engine = require('../services/promotionEngineService');

// ── 1. Unit Tests: Dynamic Promotion Engine Evaluator ─────────────────────────
describe('Unit Tests: Dynamic Promotion Engine Evaluator', () => {

    const baseRule = {
        id: 'rule-test-123',
        version: 1,
        min_attendance_percent: 75,
        min_sgpa: 5.0,
        min_credits: 20,
        max_backlogs_allowed: 2,
        allow_atkt: true,
        promote_with_backlogs: false,
        promotion_policy: 'STANDARD',
        credits_required_for_promotion: 20,
        credits_required_for_graduation: 160,
    };

    it('returns DETAINED if student attendance is below minimum required', () => {
        const metrics = {
            attendance_percent: 70.0, // < 75%
            sgpa: 8.5,
            cgpa: 8.5,
            earned_credits: 24,
            backlogs_count: 0,
            is_final_semester: false,
        };
        const result = engine.evaluatePromotion(metrics, baseRule);
        expect(result.decision).toBe('DETAINED');
        expect(result.checks.meets_attendance).toBe(false);
        expect(result.reasons[0]).toContain('Attendance of 70.0% is below the required minimum of 75%');
    });

    it('returns GRADUATED if final semester student meets all graduation criteria', () => {
        const metrics = {
            attendance_percent: 90.0,
            sgpa: 8.0,
            cgpa: 8.2,
            earned_credits: 24,
            total_earned_credits: 165, // >= 160
            backlogs_count: 0,
            is_final_semester: true,
        };
        const result = engine.evaluatePromotion(metrics, baseRule);
        expect(result.decision).toBe('GRADUATED');
        expect(result.reasons[0]).toContain('Cleared all graduation requirements');
    });

    it('returns PROMOTED when student has 0 backlogs and meets SGPA/Credits thresholds', () => {
        const metrics = {
            attendance_percent: 85.0,
            sgpa: 7.5,
            cgpa: 7.5,
            earned_credits: 24,
            backlogs_count: 0,
            is_final_semester: false,
        };
        const result = engine.evaluatePromotion(metrics, baseRule);
        expect(result.decision).toBe('PROMOTED');
        expect(result.checks.meets_zero_backlogs).toBe(true);
    });

    it('returns PROMOTED_WITH_ATKT when student has backlogs within allowed threshold', () => {
        const metrics = {
            attendance_percent: 82.0,
            sgpa: 6.0,
            cgpa: 6.0,
            earned_credits: 20,
            backlogs_count: 1, // <= max_backlogs_allowed (2)
            is_final_semester: false,
        };
        const result = engine.evaluatePromotion(metrics, baseRule);
        expect(result.decision).toBe('PROMOTED_WITH_ATKT');
        expect(result.checks.meets_max_backlogs).toBe(true);
    });

    it('returns REPEAT_SEMESTER if backlogs exceed maximum allowed threshold', () => {
        const metrics = {
            attendance_percent: 85.0,
            sgpa: 6.5,
            cgpa: 6.5,
            earned_credits: 24,
            backlogs_count: 4, // > max_backlogs_allowed (2)
            is_final_semester: false,
        };
        const result = engine.evaluatePromotion(metrics, baseRule);
        expect(result.decision).toBe('REPEAT_SEMESTER');
        expect(result.checks.meets_max_backlogs).toBe(false);
    });

    it('returns REPEAT_SEMESTER under STRICT policy if student has any backlog or low SGPA', () => {
        const strictRule = { ...baseRule, promotion_policy: 'STRICT' };
        const metrics = {
            attendance_percent: 90.0,
            sgpa: 4.5, // < min_sgpa (5.0)
            cgpa: 4.5,
            earned_credits: 24,
            backlogs_count: 0,
            is_final_semester: false,
        };
        const result = engine.evaluatePromotion(metrics, strictRule);
        expect(result.decision).toBe('REPEAT_SEMESTER');
    });
});

// ── 2. Integration Tests: API Endpoints ───────────────────────────────────────
describe('Integration Tests: Academic Promotion API', () => {
    it('GET /api/academic-promotion/history returns array of promotion records', async () => {
        const res = await request(app).get('/api/academic-promotion/history');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/academic-promotion/evaluate rejects payload missing required UUID fields', async () => {
        const res = await request(app)
            .post('/api/academic-promotion/evaluate')
            .send({ student_id: 'invalid-uuid' });
        expect(res.statusCode).toBe(422);
        expect(res.body.status).toBe('error');
    });
});
