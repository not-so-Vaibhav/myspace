// backend/tests/creditEngine.test.js

// Mocking supabase client
jest.mock('../config/supabaseClient', () => ({
    from: jest.fn()
}));

const supabase = require('../config/supabaseClient');
const creditService = require('../services/creditEngineService');

describe('Credit Engine Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should calculate CGPA and Credits correctly for a student', async () => {
        const studentId = 'test-student-id';
        
        // Mock the supabase query response
        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
                data: [
                    { id: '1', subject_id: 'sub1', semester_id: 'sem1', grade_points: 8.0, is_pass: true, attempt_number: 1, subject: { credits: 4 } },
                    { id: '2', subject_id: 'sub2', semester_id: 'sem1', grade_points: 9.0, is_pass: true, attempt_number: 1, subject: { credits: 3 } },
                    { id: '3', subject_id: 'sub3', semester_id: 'sem1', grade_points: 0.0, is_pass: false, attempt_number: 1, subject: { credits: 4 } }
                ],
                error: null
            })
        };
        
        supabase.from.mockReturnValue(mockQuery);

        const metrics = await creditService.calculateStudentMetrics(studentId);

        expect(metrics).toBeDefined();
        expect(metrics.credits_registered).toBe(11);
        expect(metrics.credits_earned).toBe(7);
        expect(metrics.credits_pending).toBe(4);
        
        // SGPA calculation: (8 * 4 + 9 * 3) / 7 = 59 / 7 = 8.43
        expect(metrics.cgpa).toBe(8.43);
        expect(metrics.percentage).toBeCloseTo(8.43 * 9.5, 2);
    });

    test('should handle deduplication for multiple attempts correctly', async () => {
        const studentId = 'test-student-id';
        
        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
                data: [
                    { id: '1', subject_id: 'sub1', semester_id: 'sem1', grade_points: 0.0, is_pass: false, attempt_number: 1, subject: { credits: 4 } },
                    { id: '2', subject_id: 'sub1', semester_id: 'sem1', grade_points: 6.0, is_pass: true, attempt_number: 2, subject: { credits: 4 } } // Passed on ATKT
                ],
                error: null
            })
        };
        
        supabase.from.mockReturnValue(mockQuery);

        const metrics = await creditService.calculateStudentMetrics(studentId);

        expect(metrics.credits_registered).toBe(4);
        expect(metrics.credits_earned).toBe(4);
        expect(metrics.credits_pending).toBe(0);
        expect(metrics.cgpa).toBe(6.0);
    });
});
