// backend/tests/evaluationEngine.test.js

jest.mock('../config/supabaseClient', () => ({
    from: jest.fn()
}));

const supabase = require('../config/supabaseClient');
const evaluationService = require('../services/evaluationService');

describe('Subject Evaluation Engine & CA Subunits', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return default max marks configuration correctly', () => {
        expect(evaluationService.DEFAULT_MAX_MARKS).toBeDefined();
        expect(evaluationService.DEFAULT_MAX_MARKS.ca_attendance).toBe(5);
        expect(evaluationService.DEFAULT_MAX_MARKS.ca_sub_1).toBe(10);
        expect(evaluationService.DEFAULT_MAX_MARKS.ca_sub_2).toBe(10);
        expect(evaluationService.DEFAULT_MAX_MARKS.ca_sub_3).toBe(15);
        expect(evaluationService.DEFAULT_MAX_MARKS.exam).toBe(60);
        expect(evaluationService.DEFAULT_MAX_MARKS.total).toBe(100);
    });

    test('should correctly distinguish between Theory (TA) and Practical (PAB) subunits', async () => {
        const facultyId = 'faculty-uuid-1';

        // Mock subject allocations query
        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
                data: [
                    {
                        id: 'alloc-1',
                        subject_id: 'sub-1',
                        subject: { id: 'sub-1', name: 'Database Systems', code: 'CS201', type: 'Theory', credits: 4 },
                        batch: { id: 'b1', name: 'B1' },
                        semester: { id: 'sem1', term_number: 3, academic_year: { year_level: 'SY' } }
                    },
                    {
                        id: 'alloc-2',
                        subject_id: 'sub-2',
                        subject: { id: 'sub-2', name: 'DBMS Lab', code: 'CS202', type: 'Practical', credits: 2 },
                        batch: { id: 'b2', name: 'B2' },
                        semester: { id: 'sem1', term_number: 3, academic_year: { year_level: 'SY' } }
                    }
                ],
                error: null
            }),
            in: jest.fn().mockResolvedValue({ data: [], error: null })
        };

        supabase.from.mockReturnValue(mockQuery);

        const allocations = await evaluationService.getFacultyAllocations(facultyId);

        expect(allocations).toHaveLength(2);
        expect(allocations[0].subject_type).toBe('Theory');
        expect(allocations[0].ca_sub_label).toBe('TA');
        expect(allocations[0].exam_label).toBe('Theory Exam');

        expect(allocations[1].subject_type).toBe('Practical');
        expect(allocations[1].ca_sub_label).toBe('PAB');
        expect(allocations[1].exam_label).toBe('Practical Exam');
    });

    test('should validate marks within range and compute correct grades on batch save', async () => {
        const allocationId = 'alloc-1';
        const facultyId = 'faculty-1';

        // Mock allocation fetch
        const mockAllocQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: {
                    id: allocationId,
                    subject_id: 'sub-1',
                    batch_id: 'b1',
                    semester_id: 'sem1',
                    faculty_id: facultyId,
                    subject: { type: 'Theory' }
                },
                error: null
            })
        };

        // Mock upsert
        const mockUpsertQuery = {
            upsert: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({
                data: [
                    { id: 'eval-1', student_id: 'st-1', total_marks: 92, grade: 'O', is_pass: true },
                    { id: 'eval-2', student_id: 'st-2', total_marks: 35, grade: 'F', is_pass: false }
                ],
                error: null
            })
        };

        supabase.from.mockImplementation((tableName) => {
            if (tableName === 'subject_allocations') return mockAllocQuery;
            if (tableName === 'subject_evaluations') return mockUpsertQuery;
            return {
                upsert: jest.fn().mockResolvedValue({ data: [], error: null })
            };
        });

        const records = [
            {
                student_id: 'st-1',
                attendance_pct: 95.0,
                ca_attendance_marks: 5,
                ca_sub_1: 10,
                ca_sub_2: 10,
                ca_sub_3: 15,
                exam_marks: 52
            },
            {
                student_id: 'st-2',
                attendance_pct: 50.0,
                ca_attendance_marks: 0,
                ca_sub_1: 5,
                ca_sub_2: 5,
                ca_sub_3: 5,
                exam_marks: 20
            }
        ];

        const result = await evaluationService.saveBatchEvaluations(allocationId, records, facultyId);

        expect(result.success).toBe(true);
        expect(result.saved_count).toBe(2);
        expect(mockUpsertQuery.upsert).toHaveBeenCalled();
    });
});
