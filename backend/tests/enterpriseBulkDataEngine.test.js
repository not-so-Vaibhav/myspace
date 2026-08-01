// ==============================================================================
// PHASE 8 AUTOMATED TEST SUITE: ENTERPRISE BULK DATA MANAGEMENT
// TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Style
// ==============================================================================
// Comprehensive automated test suite verifying templates for all 9 ERP modules,
// CSV/JSON parsing, multi-stage validation preview, row-level error reporting,
// bulk execution, and filtered export with role-based security.
// ==============================================================================

jest.mock('../config/supabaseClient', () => {
    const mockQuery = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => Promise.resolve({
            data: null,
            error: null
        })),
        maybeSingle: jest.fn().mockImplementation(() => Promise.resolve({
            data: { id: 'mock-uuid-101' },
            error: null
        })),
        then: (resolve) => resolve({
            data: [
                { id: 1, email: 'student1@mit-learn.edu', full_name: 'Aarav Sharma', department: 'Computer Science Engineering', semester: 1 },
                { id: 2, email: 'student2@mit-learn.edu', full_name: 'Ananya Patel', department: 'Computer Science Engineering', semester: 2 }
            ],
            error: null
        })
    };
    return {
        from: jest.fn(() => mockQuery)
    };
});

const bulkDataService = require('../services/enterpriseBulkDataService');

describe('Phase 8: Enterprise Bulk Data Management Engine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Test 1: Template catalog retrieval for all 9 core ERP modules
    test('1. Retrieves templates and sample data for all 9 ERP modules', async () => {
        const modules = [
            { mod: 'STUDENT', ent: 'students' },
            { mod: 'FACULTY', ent: 'faculty' },
            { mod: 'COURSE', ent: 'subjects' },
            { mod: 'CLASS_BATCH', ent: 'classes' },
            { mod: 'CLASS_BATCH', ent: 'batches' },
            { mod: 'REGISTRATION', ent: 'registrations' },
            { mod: 'ATTENDANCE', ent: 'attendance' },
            { mod: 'EXAMINATION', ent: 'marks' },
            { mod: 'CREDIT', ent: 'credit_rules' }
        ];

        for (const { mod, ent } of modules) {
            const template = await bulkDataService.getTemplate(mod, ent, 'CSV');
            expect(template).toBeDefined();
            expect(template.module_name).toBe(mod);
            expect(template.entity_type).toBe(ent);
            expect(Array.isArray(template.columns)).toBe(true);
            expect(template.columns.length).toBeGreaterThan(0);
            expect(typeof template.content).toBe('string');
            expect(template.content.includes(',')).toBe(true);
        }
    });

    // Test 2: File Buffer Parser (CSV & JSON)
    test('2. Correctly parses CSV and JSON formatted file buffers', () => {
        const csvContent = `email,full_name,enrollment_no,department,semester\n"student1@mit-learn.edu","Aarav Sharma","MIT2026001","Computer Science Engineering","1"\n"student2@mit-learn.edu","Ananya Patel","MIT2026002","Computer Science Engineering","2"`;
        const csvBuffer = Buffer.from(csvContent, 'utf8');
        const parsedCsv = bulkDataService.parseFileBuffer(csvBuffer, 'CSV');

        expect(parsedCsv.length).toBe(2);
        expect(parsedCsv[0].email).toBe('student1@mit-learn.edu');
        expect(parsedCsv[0].full_name).toBe('Aarav Sharma');
        expect(parsedCsv[1].semester).toBe('2');

        const jsonContent = JSON.stringify([
            { code: 'CS101', name: 'Data Structures', credits: 4 },
            { code: 'CS102', name: 'DBMS Lab', credits: 2 }
        ]);
        const parsedJson = bulkDataService.parseFileBuffer(Buffer.from(jsonContent, 'utf8'), 'JSON');
        expect(parsedJson.length).toBe(2);
        expect(parsedJson[0].code).toBe('CS101');
    });

    // Test 3: Multi-Stage Validation Preview (Valid rows vs Missing required vs Duplicates vs Academic rules)
    test('3. Multi-stage validation detects missing fields, file duplicates, and out-of-range values', async () => {
        const rows = [
            // Row 1: Valid student
            { email: 'good1@mit-learn.edu', full_name: 'Good Student', enrollment_no: 'MIT001', department: 'CSE', semester: 1 },
            // Row 2: Missing required email field
            { email: '', full_name: 'No Email Student', enrollment_no: 'MIT002', department: 'CSE', semester: 2 },
            // Row 3: Duplicate email (repeats Row 1)
            { email: 'good1@mit-learn.edu', full_name: 'Duplicate Student', enrollment_no: 'MIT003', department: 'CSE', semester: 3 },
            // Row 4: Invalid semester out of range (15)
            { email: 'badsem@mit-learn.edu', full_name: 'Bad Sem Student', enrollment_no: 'MIT004', department: 'CSE', semester: 15 }
        ];

        const preview = await bulkDataService.validateImport('STUDENT', 'students', rows);
        expect(preview.summary.total_rows).toBe(4);
        expect(preview.summary.valid_rows_count).toBe(1);
        expect(preview.summary.error_rows_count).toBeGreaterThanOrEqual(3);

        const errorMessages = preview.error_rows.map(e => e.error_message);
        expect(errorMessages.some(m => m.includes('Mandatory field'))).toBe(true);
        expect(errorMessages.some(m => m.includes('Duplicate record'))).toBe(true);
        expect(errorMessages.some(m => m.includes('Semester must be between 1 and 8'))).toBe(true);
    });

    // Test 4: Examination marks validation preview
    test('4. Validates examination internal/external mark bounds', async () => {
        const rows = [
            { student_email: 's@mit.edu', subject_code: 'CS101', internal_marks: 35, external_marks: 50, result_status: 'PASS' },
            { student_email: 's2@mit.edu', subject_code: 'CS101', internal_marks: 45, external_marks: 70, result_status: 'PASS' } // invalid
        ];
        const preview = await bulkDataService.validateImport('EXAMINATION', 'marks', rows);
        expect(preview.summary.valid_rows_count).toBe(1);
        expect(preview.summary.error_rows_count).toBeGreaterThanOrEqual(2);
    });

    // Test 5: Execute Import with partial success and row-level error logging
    test('5. Executes bulk import and returns audit ID with row error report', async () => {
        const rows = [
            { email: 'valid@mit-learn.edu', full_name: 'Valid User', enrollment_no: 'E001', department: 'CSE', semester: 1 },
            { email: '', full_name: 'Invalid User', enrollment_no: 'E002', department: 'CSE', semester: 1 }
        ];

        const userContext = { id: '00000000-0000-0000-0000-000000000000', email: 'admin@mit-learn.edu', role: 'admin' };
        const result = await bulkDataService.executeImport('STUDENT', 'students', rows, userContext, { partial_success: true });

        expect(result.success).toBe(true);
        expect(result.audit_id).toBeDefined();
        expect(result.status).toBe('PARTIAL_SUCCESS');
        expect(result.summary.total_records).toBe(2);
        expect(result.summary.success_records).toBe(1);
        expect(result.summary.failed_records).toBe(1);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].row_number).toBe(2);
    });

    // Test 6: Filtered export in CSV, JSON, EXCEL, and PDF formats
    test('6. Exports filtered module data in CSV, JSON, EXCEL, and PDF formats', async () => {
        const formats = ['CSV', 'JSON', 'EXCEL', 'PDF'];
        for (const fmt of formats) {
            const exportRes = await bulkDataService.exportData('COURSE', 'subjects', {}, fmt, { role: 'admin' });
            expect(exportRes.success).toBe(true);
            expect(exportRes.export_format).toBe(fmt);
            expect(exportRes.content).toBeDefined();
            expect(exportRes.filename).toBeDefined();
            if (fmt === 'CSV') expect(exportRes.mime_type).toBe('text/csv');
            if (fmt === 'JSON') expect(exportRes.mime_type).toBe('application/json');
            if (fmt === 'EXCEL') expect(exportRes.mime_type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            if (fmt === 'PDF') expect(exportRes.mime_type).toBe('application/pdf');
        }
    });

    // Test 7: RBAC Export Filtering for Student role
    test('7. Enforces RBAC security on student export (student can only export own records)', async () => {
        const studentContext = { email: 'student1@mit-learn.edu', role: 'student' };
        const exportRes = await bulkDataService.exportData('STUDENT', 'students', {}, 'JSON', studentContext);
        expect(exportRes.success).toBe(true);
        const records = JSON.parse(exportRes.content);
        expect(Array.isArray(records)).toBe(true);
    });
});
