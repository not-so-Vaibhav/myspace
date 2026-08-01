// backend/tests/workflowAutomation.test.js

jest.mock('../config/supabaseClient', () => ({
    from: jest.fn()
}));
jest.mock('../services/promotionService', () => ({
    evaluateStudent: jest.fn()
}));
jest.mock('../services/graduationService', () => ({
    processGraduation: jest.fn()
}));

const supabase = require('../config/supabaseClient');
const workflowService = require('../services/workflowAutomationService');
const promotionService = require('../services/promotionService');
const graduationService = require('../services/graduationService');

describe('Workflow Automation Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should process end of semester for a batch of students', async () => {
        const semesterId = 'sem1';
        const academicYearId = 'ay1';
        
        const mockSupabaseResponse = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => ({
                eq: jest.fn().mockResolvedValue({
                    data: [
                        { student_id: 'student1' },
                        { student_id: 'student2' },
                        { student_id: 'student3' }
                    ],
                    error: null
                })
            }))
        };
        
        supabase.from.mockReturnValue(mockSupabaseResponse);

        // Student 1: Promoted
        // Student 2: Graduated
        // Student 3: Held Back
        promotionService.evaluateStudent
            .mockResolvedValueOnce({ evaluation: { decision: 'PROMOTED' } })
            .mockResolvedValueOnce({ evaluation: { decision: 'GRADUATED' } })
            .mockResolvedValueOnce({ evaluation: { decision: 'HELD_BACK' } });
            
        graduationService.processGraduation.mockResolvedValue({ status: 'success' });

        const result = await workflowService.processEndOfSemester(semesterId, academicYearId);

        expect(result.totalEvaluated).toBe(3);
        expect(result.promoted).toBe(1);
        expect(result.graduated).toBe(1);
        expect(result.heldBack).toBe(1);
        expect(result.errors.length).toBe(0);
        
        expect(promotionService.evaluateStudent).toHaveBeenCalledTimes(3);
        expect(graduationService.processGraduation).toHaveBeenCalledTimes(1);
        expect(graduationService.processGraduation).toHaveBeenCalledWith('student2', null, false, expect.any(String));
    });

    test('should handle errors gracefully per student', async () => {
        const semesterId = 'sem1';
        const academicYearId = 'ay1';
        
        const mockSupabaseResponse = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => ({
                eq: jest.fn().mockResolvedValue({
                    data: [
                        { student_id: 'student1' },
                        { student_id: 'student2' }
                    ],
                    error: null
                })
            }))
        };
        
        supabase.from.mockReturnValue(mockSupabaseResponse);

        promotionService.evaluateStudent
            .mockResolvedValueOnce({ evaluation: { decision: 'PROMOTED' } })
            .mockRejectedValueOnce(new Error('Evaluation failed for student 2'));

        const result = await workflowService.processEndOfSemester(semesterId, academicYearId);

        expect(result.totalEvaluated).toBe(2);
        expect(result.promoted).toBe(1);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].studentId).toBe('student2');
        expect(result.errors[0].error).toBe('Evaluation failed for student 2');
    });
});
