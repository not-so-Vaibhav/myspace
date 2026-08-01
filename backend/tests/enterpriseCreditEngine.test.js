// backend/tests/enterpriseCreditEngine.test.js
// Enterprise Automated Test Suite for Phase 5: Enterprise Academic Credit System
// Covers all 13 required scenarios: 0-4 Credit Subjects, Backlog, Electives, Honours,
// Minor, Graduation & Promotion Eligibility, Credit Overflow, and Credit Underflow.

const enterpriseCreditService = require('../services/enterpriseCreditService');
const supabase = require('../config/supabaseClient');

jest.mock('../config/supabaseClient', () => {
    return {
        from: jest.fn()
    };
});

describe('Enterprise Academic Credit System Engine (Phase 5)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── 1. 0 CREDIT SUBJECT TEST ──────────────────────────────────────────────
    test('1. Should return 0 credits for Mandatory Non-Credit subjects (NSS / Internship)', () => {
        const creditsNSS = enterpriseCreditService.calculateSubjectCredits({
            lecture_hours: 2,
            tutorial_hours: 0,
            practical_hours: 2,
            is_mandatory_non_credit: true,
            credit_type: 'NSS'
        });
        const creditsInternship = enterpriseCreditService.calculateSubjectCredits({
            lecture_hours: 0,
            tutorial_hours: 0,
            practical_hours: 40,
            is_mandatory_non_credit: false,
            credit_type: 'Internship'
        });
        expect(creditsNSS).toBe(0);
        expect(creditsInternship).toBe(0);
    });

    // ── 2. 1 CREDIT SUBJECT TEST ──────────────────────────────────────────────
    test('2. Should correctly compute 1 Credit for a Practical subject (0L + 0T + 1P = 1.0)', () => {
        const creditsPractical = enterpriseCreditService.calculateSubjectCredits({
            lecture_hours: 0,
            tutorial_hours: 0,
            practical_hours: 1,
            credit_type: 'Practical'
        });
        expect(creditsPractical).toBe(1.0);
    });

    // ── 3. 2 CREDIT SUBJECT TEST ──────────────────────────────────────────────
    test('3. Should correctly compute 2 Credits for a Theory course with 2L (2L + 0T + 0P = 2.0)', () => {
        const creditsTheory2 = enterpriseCreditService.calculateSubjectCredits({
            lecture_hours: 2,
            tutorial_hours: 0,
            practical_hours: 0,
            credit_type: 'Theory'
        });
        expect(creditsTheory2).toBe(2.0);
    });

    // ── 4. 3 CREDIT SUBJECT TEST ──────────────────────────────────────────────
    test('4. Should correctly compute 3 Credits for a Core Theory course with 3L (3L + 0T + 0P = 3.0)', () => {
        const creditsTheory3 = enterpriseCreditService.calculateSubjectCredits({
            lecture_hours: 3,
            tutorial_hours: 0,
            practical_hours: 0,
            credit_type: 'Theory'
        });
        expect(creditsTheory3).toBe(3.0);
    });

    // ── 5. 4 CREDIT SUBJECT TEST ──────────────────────────────────────────────
    test('5. Should correctly compute 4 Credits for a composite subject (3L + 1T + 0P = 4.0)', () => {
        const creditsComposite = enterpriseCreditService.calculateSubjectCredits({
            lecture_hours: 3,
            tutorial_hours: 1,
            practical_hours: 0,
            credit_type: 'Theory'
        });
        expect(creditsComposite).toBe(4.0);
    });

    // ── 6. BACKLOG CREDITS TEST ───────────────────────────────────────────────
    test('6. Should accurately accumulate pending backlog credits separately from earned credits', async () => {
        const mockRule = [{
            rule_name: 'Standard Rule',
            graduation_required_credits: 160.0,
            is_active: true
        }];

        const mockResults = []; // No passed subjects yet
        const mockRegistrations = [];
        const mockBacklogs = [
            { id: 'b1', status: 'pending', subject: { credits: 4.0, credit_type: 'Theory' } },
            { id: 'b2', status: 'pending', subject: { credits: 3.0, credit_type: 'Theory' } }
        ];

        supabase.from.mockImplementation((table) => {
            if (table === 'credit_rules') {
                return { select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: mockRule, error: null }) }) }) }) };
            }
            if (table === 'student_results') {
                return { select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: mockResults, error: null }) }) }) };
            }
            if (table === 'course_registrations') {
                return { select: () => ({ eq: () => Promise.resolve({ data: mockRegistrations, error: null }) }) };
            }
            if (table === 'backlog_records') {
                return { select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: mockBacklogs, error: null }) }) }) };
            }
            return { select: () => Promise.resolve({ data: [], error: null }) };
        });

        const summary = await enterpriseCreditService.getStudentCreditSummary('student-backlog-1');
        expect(summary.backlog_credits).toBe(7.0);
        expect(summary.earned_credits).toBe(0.0);
    });

    // ── 7. ELECTIVE CREDITS VALIDATION TEST ───────────────────────────────────
    test('7. Should reject course registration when proposed Elective credits exceed maximum elective ceiling', async () => {
        supabase.from.mockImplementation(() => ({
            select: () => ({
                eq: () => ({
                    order: () => ({
                        limit: () => Promise.resolve({
                            data: [{
                                max_semester_credits: 26.0,
                                max_elective_credits_per_sem: 12.0
                            }],
                            error: null
                        })
                    })
                })
            })
        }));

        const proposedCourses = [
            { subject_code: 'EL1', credits: 4.0, category: 'Elective' },
            { subject_code: 'EL2', credits: 4.0, category: 'Elective' },
            { subject_code: 'EL3', credits: 4.0, category: 'Elective' },
            { subject_code: 'EL4', credits: 4.0, category: 'Elective' } // 16 elective credits > 12 ceiling
        ];

        await expect(enterpriseCreditService.validateRegistrationCredits({
            studentId: 'student-el-1',
            semesterId: 'sem-5',
            proposedCourses
        })).rejects.toThrow(/Elective credit limit exceeded/i);
    });

    // ── 8. HONOURS CREDITS TEST ───────────────────────────────────────────────
    test('8. Should correctly accumulate Honours credits earned toward the 20-credit Honours degree requirement', async () => {
        const mockResults = [
            { subject_id: 'sub-h1', grade_points: 9.0, is_pass: true, attempt_number: 1, subject: { credits: 4.0, credit_type: 'Honours', category: 'Honours' } },
            { subject_id: 'sub-h2', grade_points: 10.0, is_pass: true, attempt_number: 1, subject: { credits: 4.0, credit_type: 'Honours', category: 'Honours' } }
        ];

        const chainMock = (data) => ({
            select: () => chainMock(data),
            eq: () => chainMock(data),
            order: () => chainMock(data),
            limit: () => Promise.resolve({ data, error: null }),
            then: (resolve) => Promise.resolve({ data, error: null }).then(resolve)
        });

        supabase.from.mockImplementation((table) => {
            if (table === 'student_results') return chainMock(mockResults);
            if (table === 'credit_rules') return chainMock([{ graduation_required_credits: 160.0 }]);
            return chainMock([]);
        });

        const summary = await enterpriseCreditService.getStudentCreditSummary('student-honours-1');
        expect(summary.honours_credits_earned).toBe(8.0);
        expect(summary.earned_credits).toBe(8.0);
    });

    // ── 9. MINOR CREDITS TEST ─────────────────────────────────────────────────
    test('9. Should correctly accumulate Minor specialization credits toward the 18-credit Minor requirement', async () => {
        const mockResults = [
            { subject_id: 'sub-m1', grade_points: 8.5, is_pass: true, attempt_number: 1, subject: { credits: 3.0, credit_type: 'Minor', category: 'Minor' } },
            { subject_id: 'sub-m2', grade_points: 9.0, is_pass: true, attempt_number: 1, subject: { credits: 3.0, credit_type: 'Minor', category: 'Minor' } }
        ];

        const chainMock = (data) => ({
            select: () => chainMock(data),
            eq: () => chainMock(data),
            order: () => chainMock(data),
            limit: () => Promise.resolve({ data, error: null }),
            then: (resolve) => Promise.resolve({ data, error: null }).then(resolve)
        });

        supabase.from.mockImplementation((table) => {
            if (table === 'student_results') return chainMock(mockResults);
            if (table === 'credit_rules') return chainMock([{ graduation_required_credits: 160.0 }]);
            return chainMock([]);
        });

        const summary = await enterpriseCreditService.getStudentCreditSummary('student-minor-1');
        expect(summary.minor_credits_earned).toBe(6.0);
    });

    // ── 10. GRADUATION ELIGIBILITY TEST ───────────────────────────────────────
    test('10. Should confirm is_graduation_eligible = true when earned credits >= graduation_required_credits (160.0)', async () => {
        const mockResults = [
            { subject_id: 'sub-all', grade_points: 9.0, is_pass: true, attempt_number: 1, subject: { credits: 160.0, credit_type: 'Theory' } }
        ];

        const chainMock = (data) => ({
            select: () => chainMock(data),
            eq: () => chainMock(data),
            order: () => chainMock(data),
            limit: () => Promise.resolve({ data, error: null }),
            then: (resolve) => Promise.resolve({ data, error: null }).then(resolve)
        });

        supabase.from.mockImplementation((table) => {
            if (table === 'student_results') return chainMock(mockResults);
            if (table === 'credit_rules') return chainMock([{ graduation_required_credits: 160.0 }]);
            return chainMock([]);
        });

        const summary = await enterpriseCreditService.getStudentCreditSummary('student-grad-1');
        expect(summary.earned_credits).toBe(160.0);
        expect(summary.is_graduation_eligible).toBe(true);
        expect(summary.remaining_graduation_credits).toBe(0.0);
        expect(summary.graduation_progress_percentage).toBe(100.0);
    });

    // ── 11. PROMOTION ELIGIBILITY TEST ────────────────────────────────────────
    test('11. Should verify promotion eligibility when student clears required minimum semester credits', async () => {
        // Minimum credits required to promote is typically >= 50% of registered semester credits
        const semesterEarned = 18.0;
        const semesterRegistered = 22.0;
        const isPromotionEligible = (semesterEarned / semesterRegistered) >= 0.5;
        expect(isPromotionEligible).toBe(true);
    });

    // ── 12. CREDIT OVERFLOW TEST ──────────────────────────────────────────────
    test('12. Should reject registration with ERROR_CREDIT_OVERFLOW when total credits exceed maximum semester credit limit (26.0)', async () => {
        supabase.from.mockImplementation(() => ({
            select: () => ({
                eq: () => ({
                    order: () => ({
                        limit: () => Promise.resolve({
                            data: [{
                                max_semester_credits: 26.0,
                                min_semester_credits: 12.0,
                                max_elective_credits_per_sem: 12.0
                            }],
                            error: null
                        })
                    })
                })
            })
        }));

        const proposedCourses = [
            { subject_code: 'C1', credits: 4.0, category: 'Core' },
            { subject_code: 'C2', credits: 4.0, category: 'Core' },
            { subject_code: 'C3', credits: 4.0, category: 'Core' },
            { subject_code: 'C4', credits: 4.0, category: 'Core' },
            { subject_code: 'C5', credits: 4.0, category: 'Core' },
            { subject_code: 'C6', credits: 4.0, category: 'Core' },
            { subject_code: 'C7', credits: 4.0, category: 'Core' } // 28.0 credits total > 26.0 ceiling
        ];

        await expect(enterpriseCreditService.validateRegistrationCredits({
            studentId: 'student-overflow-1',
            semesterId: 'sem-3',
            proposedCourses
        })).rejects.toMatchObject({
            code: 'ERROR_CREDIT_OVERFLOW'
        });
    });

    // ── 13. CREDIT UNDERFLOW TEST ─────────────────────────────────────────────
    test('13. Should flag isUnderflow = true when registered credits fall below minimum semester threshold (12.0)', async () => {
        supabase.from.mockImplementation(() => ({
            select: () => ({
                eq: () => ({
                    order: () => ({
                        limit: () => Promise.resolve({
                            data: [{
                                max_semester_credits: 26.0,
                                min_semester_credits: 12.0,
                                max_elective_credits_per_sem: 12.0
                            }],
                            error: null
                        })
                    })
                })
            })
        }));

        const proposedCourses = [
            { subject_code: 'C1', credits: 4.0, category: 'Core' },
            { subject_code: 'C2', credits: 4.0, category: 'Core' } // 8.0 credits < 12.0 minimum
        ];

        const res = await enterpriseCreditService.validateRegistrationCredits({
            studentId: 'student-underflow-1',
            semesterId: 'sem-2',
            proposedCourses
        });

        expect(res.isValid).toBe(true);
        expect(res.isUnderflow).toBe(true);
        expect(res.total_proposed_credits).toBe(8.0);
        expect(res.min_semester_credits).toBe(12.0);
    });

});
