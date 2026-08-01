// backend/tests/graduationEngine.test.js

jest.mock('../config/supabaseClient', () => ({
    from: jest.fn()
}));
jest.mock('../services/creditEngineService', () => ({
    calculateStudentMetrics: jest.fn()
}));
jest.mock('../services/studentLifecycleService', () => ({
    transitionStudentState: jest.fn()
}));
jest.mock('../repositories/academicRulesRepository', () => ({
    findEffectiveRule: jest.fn()
}));

const supabase = require('../config/supabaseClient');
const graduationService = require('../services/graduationService');
const creditService = require('../services/creditEngineService');
const lifecycleService = require('../services/studentLifecycleService');

describe('Graduation Engine Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should identify eligible student correctly', async () => {
        const studentId = 'student-uuid';
        
        // Mock Supabase Chain
        const mockHistoryQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
                data: { semester: { program_id: 'prog1' } },
                error: null
            })
        };
        const mockProgramQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: { total_semesters: 8, total_credits: 160, name: 'B.Tech CS' },
                error: null
            })
        };
        const mockSemestersQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            not: jest.fn().mockResolvedValue({ data: [{ id: '1' }], error: null })
        };
        const mockAllSemestersQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
                data: [{semester_id: 's1'}, {semester_id: 's2'}, {semester_id: 's3'}, {semester_id: 's4'}, {semester_id: 's5'}, {semester_id: 's6'}, {semester_id: 's7'}, {semester_id: 's8'}],
                error: null
            })
        };
        const mockBacklogsQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            // eq is called twice for backlogs
        };
        mockBacklogsQuery.eq.mockReturnValueOnce(mockBacklogsQuery).mockResolvedValueOnce({
            data: [], error: null
        });

        // Supabase routing logic mock
        supabase.from.mockImplementation((table) => {
            if (table === 'student_semester_history') {
                return {
                    select: (fields) => {
                        if (fields === 'id') return mockSemestersQuery.select();
                        if (fields === 'semester_id') return mockAllSemestersQuery.select();
                        return mockHistoryQuery.select();
                    }
                };
            }
            if (table === 'programs') return mockProgramQuery;
            if (table === 'backlog_records') return mockBacklogsQuery;
        });

        creditService.calculateStudentMetrics.mockResolvedValue({
            credits_earned: 165,
            cgpa: 8.5
        });

        const eligibility = await graduationService.checkEligibility(studentId);

        expect(eligibility.isEligible).toBe(true);
        expect(eligibility.issues.length).toBe(0);
    });

    test('should deny eligibility if backlogs exist', async () => {
        const studentId = 'student-uuid';
        
        // Similar mocks, but with backlogs
        const mockHistoryQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
                data: { semester: { program_id: 'prog1' } },
                error: null
            })
        };
        const mockProgramQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: { total_semesters: 8, total_credits: 160, name: 'B.Tech CS' },
                error: null
            })
        };
        const mockSemestersQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            not: jest.fn().mockResolvedValue({ data: [{ id: '1' }], error: null })
        };
        const mockAllSemestersQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
                data: [{semester_id: 's1'}, {semester_id: 's2'}, {semester_id: 's3'}, {semester_id: 's4'}, {semester_id: 's5'}, {semester_id: 's6'}, {semester_id: 's7'}, {semester_id: 's8'}],
                error: null
            })
        };
        const mockBacklogsQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
        };
        mockBacklogsQuery.eq.mockReturnValueOnce(mockBacklogsQuery).mockResolvedValueOnce({
            data: [{ id: 'bl1', subject: { name: 'Math' } }], error: null
        });

        supabase.from.mockImplementation((table) => {
            if (table === 'student_semester_history') {
                return {
                    select: (fields) => {
                        if (fields === 'id') return mockSemestersQuery.select();
                        if (fields === 'semester_id') return mockAllSemestersQuery.select();
                        return mockHistoryQuery.select();
                    }
                };
            }
            if (table === 'programs') return mockProgramQuery;
            if (table === 'backlog_records') return mockBacklogsQuery;
        });

        creditService.calculateStudentMetrics.mockResolvedValue({
            credits_earned: 165,
            cgpa: 8.5
        });

        const eligibility = await graduationService.checkEligibility(studentId);

        expect(eligibility.isEligible).toBe(false);
        expect(eligibility.issues).toContain('Student has 1 pending backlogs (Math).');
    });
});
