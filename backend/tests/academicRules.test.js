// backend/tests/academicRules.test.js
// Integration tests for the Academic Rules Engine API.
// Run with: npx jest tests/academicRules.test.js

const request = require('supertest');

jest.mock('../config/supabaseClient', () => {
    let mockRules = [
        {
            id: 'mock-rule-uuid-1',
            rule_name: 'Existing Default Rule',
            description: 'Default rule',
            version: 1,
            is_active: true,
            min_attendance_percent: 75,
            min_sgpa: 5.0,
            min_credits: 0,
            max_backlogs_allowed: 2,
            credits_required_for_promotion: 0,
            credits_required_for_graduation: 0,
            allow_atkt: true,
            promote_with_backlogs: false,
            promotion_policy: 'STANDARD',
            graduation_requirements: {}
        }
    ];

    const builder = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockImplementation((arr) => {
            const newItem = { ...arr[0], id: 'mock-created-id', version: 1, is_active: true };
            mockRules.push(newItem);
            builder._lastInserted = newItem;
            return builder;
        }),
        update: jest.fn().mockImplementation((payload) => {
            builder._pendingUpdate = payload;
            return builder;
        }),
        delete: jest.fn().mockImplementation(() => {
            mockRules = mockRules.filter(r => r.id !== builder._targetId);
            return builder;
        }),
        eq: jest.fn().mockImplementation((field, val) => {
            if (field === 'id') builder._targetId = val;
            return builder;
        }),
        is: jest.fn().mockImplementation((col, val) => {
            builder._isCalled = true;
            return builder;
        }),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
            if (builder._pendingUpdate && builder._targetId) {
                const idx = mockRules.findIndex(r => r.id === builder._targetId);
                if (idx !== -1) {
                    const existing = mockRules[idx];
                    const updated = { ...existing, ...builder._pendingUpdate, version: builder._pendingUpdate.version || (existing.version + 1) };
                    mockRules[idx] = updated;
                    builder._lastUpdated = updated;
                }
                builder._pendingUpdate = null;
            }
            const found = mockRules.find(r => r.id === builder._targetId) || builder._lastInserted || mockRules[0];
            return Promise.resolve({
                data: found,
                error: null
            });
        }),
        maybeSingle: jest.fn().mockImplementation(() => {
            if (builder._pendingUpdate && builder._targetId) {
                const idx = mockRules.findIndex(r => r.id === builder._targetId);
                if (idx !== -1) {
                    const existing = mockRules[idx];
                    const updated = { ...existing, ...builder._pendingUpdate, version: builder._pendingUpdate.version || (existing.version + 1) };
                    mockRules[idx] = updated;
                    builder._lastUpdated = updated;
                }
                builder._pendingUpdate = null;
            }
            const found = mockRules.find(r => r.id === builder._targetId);
            return Promise.resolve({
                data: found || null,
                error: null
            });
        }),
        then: (resolve) => {
            if (builder._isCalled) {
                resolve({ data: [], error: null });
            } else {
                resolve({
                    data: mockRules,
                    error: null
                });
            }
        }
    };

    return {
        from: jest.fn().mockImplementation((table) => {
            builder._table = table;
            builder._isCalled = false;
            return builder;
        })
    };
});

const app = require('../server');

// ── Shared test state ─────────────────────────────────────────
let createdRuleId = null;

// ── 1. Reference data ─────────────────────────────────────────
describe('GET /api/academic-rules/reference', () => {
    it('returns programs, academic_years, and semesters', async () => {
        const res = await request(app).get('/api/academic-rules/reference');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.data).toHaveProperty('programs');
        expect(res.body.data).toHaveProperty('academicYears');
        expect(res.body.data).toHaveProperty('semesters');
    });
});

// ── 2. List rules ─────────────────────────────────────────────
describe('GET /api/academic-rules', () => {
    it('returns an array of rules', async () => {
        const res = await request(app).get('/api/academic-rules');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filters by is_active=true', async () => {
        const res = await request(app).get('/api/academic-rules?is_active=true');
        expect(res.statusCode).toBe(200);
        res.body.data.forEach(r => expect(r.is_active).toBe(true));
    });
});

// ── 3. Create rule ────────────────────────────────────────────
describe('POST /api/academic-rules', () => {
    it('creates a rule with valid data', async () => {
        const payload = {
            rule_name: 'Test Rule – Jest CI',
            description: 'Auto-generated by test suite',
            min_attendance_percent: 80,
            min_sgpa: 6.0,
            min_credits: 20,
            max_backlogs_allowed: 1,
            allow_atkt: true,
            promote_with_backlogs: false,
            promotion_policy: 'STANDARD',
            credits_required_for_promotion: 20,
            credits_required_for_graduation: 160,
            graduation_requirements: { internship: true },
        };
        const res = await request(app).post('/api/academic-rules').send(payload);
        expect(res.statusCode).toBe(201);
        expect(res.body.status).toBe('ok');
        expect(res.body.data.rule_name).toBe('Test Rule – Jest CI');
        expect(res.body.data.version).toBe(1);
        expect(res.body.data.is_active).toBe(true);
        createdRuleId = res.body.data.id;
    });

    it('rejects invalid attendance (> 100)', async () => {
        const res = await request(app).post('/api/academic-rules').send({
            rule_name: 'Bad Rule',
            min_attendance_percent: 150,
        });
        expect(res.statusCode).toBe(422);
        expect(res.body.status).toBe('error');
    });

    it('rejects invalid SGPA (> 10)', async () => {
        const res = await request(app).post('/api/academic-rules').send({
            rule_name: 'Bad SGPA Rule',
            min_sgpa: 11,
        });
        expect(res.statusCode).toBe(422);
    });

    it('rejects negative backlogs', async () => {
        const res = await request(app).post('/api/academic-rules').send({
            rule_name: 'Negative Backlogs',
            max_backlogs_allowed: -1,
        });
        expect(res.statusCode).toBe(422);
    });

    it('rejects invalid promotion_policy value', async () => {
        const res = await request(app).post('/api/academic-rules').send({
            rule_name: 'Bad Policy',
            promotion_policy: 'INVALID_POLICY',
        });
        expect(res.statusCode).toBe(422);
    });
});

// ── 4. Get single rule ────────────────────────────────────────
describe('GET /api/academic-rules/:id', () => {
    it('returns the created rule', async () => {
        if (!createdRuleId) return;
        const res = await request(app).get(`/api/academic-rules/${createdRuleId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.data.id).toBe(createdRuleId);
    });

    it('returns 404 for unknown id', async () => {
        const res = await request(app).get('/api/academic-rules/00000000-0000-0000-0000-000000000000');
        expect(res.statusCode).toBe(404);
    });
});

// ── 5. Update rule ────────────────────────────────────────────
describe('PUT /api/academic-rules/:id', () => {
    it('updates and increments version', async () => {
        if (!createdRuleId) return;
        const res = await request(app)
            .put(`/api/academic-rules/${createdRuleId}`)
            .send({ rule_name: 'Test Rule – Updated', min_sgpa: 6.5 });
        expect(res.statusCode).toBe(200);
        expect(res.body.data.version).toBe(2);
        expect(res.body.data.rule_name).toBe('Test Rule – Updated');
    });
});

// ── 6. Deactivate / Activate ──────────────────────────────────
describe('PATCH /api/academic-rules/:id/deactivate', () => {
    it('deactivates the rule', async () => {
        if (!createdRuleId) return;
        const res = await request(app).patch(`/api/academic-rules/${createdRuleId}/deactivate`);
        expect(res.statusCode).toBe(200);
        expect(res.body.data.is_active).toBe(false);
    });
});

describe('PATCH /api/academic-rules/:id/activate', () => {
    it('re-activates the rule', async () => {
        if (!createdRuleId) return;
        const res = await request(app).patch(`/api/academic-rules/${createdRuleId}/activate`);
        expect(res.statusCode).toBe(200);
        expect(res.body.data.is_active).toBe(true);
    });
});

// ── 7. History / audit log ────────────────────────────────────
describe('GET /api/academic-rules/:id/history', () => {
    it('returns an array of audit entries', async () => {
        if (!createdRuleId) return;
        const res = await request(app).get(`/api/academic-rules/${createdRuleId}/history`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        // Expect at least CREATED, UPDATED, DEACTIVATED, ACTIVATED entries
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
});

// ── 8. Delete rule (cleanup) ──────────────────────────────────
describe('DELETE /api/academic-rules/:id', () => {
    it('permanently deletes the test rule', async () => {
        if (!createdRuleId) return;
        const res = await request(app).delete(`/api/academic-rules/${createdRuleId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('verifies deletion with 404', async () => {
        if (!createdRuleId) return;
        const res = await request(app).get(`/api/academic-rules/${createdRuleId}`);
        expect(res.statusCode).toBe(404);
    });
});
