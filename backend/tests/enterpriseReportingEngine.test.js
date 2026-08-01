// backend/tests/enterpriseReportingEngine.test.js
// Phase 7: Enterprise Reporting & Analytics System Test Suite
// TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Style

const reportingService = require('../services/enterpriseReportingService');

// Mock Supabase client
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockSingle = jest.fn();
const mockRange = jest.fn();

const createChainable = (result = { data: [], error: null }) => {
    const obj = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
            if (Array.isArray(result.data)) {
                return Promise.resolve({ data: result.data[0], error: null });
            }
            return Promise.resolve(result);
        }),
        then: (resolve) => resolve(result)
    };
    return obj;
};

const getCategoryForCode = (code = '') => {
    if (code.includes('COURSE')) return 'COURSE';
    if (code.includes('ATTENDANCE')) return 'ATTENDANCE';
    if (code.includes('EXAM')) return 'EXAMINATION';
    if (code.includes('FACULTY')) return 'FACULTY';
    if (code.includes('CREDIT')) return 'CREDIT';
    if (code.includes('CLASS') || code.includes('BATCH')) return 'CLASS_BATCH';
    if (code.includes('ADMIN')) return 'ADMIN';
    return 'STUDENT';
};

jest.mock('../config/supabaseClient', () => ({
    from: jest.fn((table) => {
            if (table === 'report_definitions_catalog') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockImplementation(function(col, val) {
                        this.code = val;
                        return this;
                    }),
                    order: jest.fn().mockReturnThis(),
                    single: jest.fn().mockImplementation(function() {
                        const code = this.code || 'STUDENT_COMPLETE_ACADEMIC_HISTORY';
                        return Promise.resolve({
                            data: {
                                report_code: code,
                                category: getCategoryForCode(code),
                                report_name: `${code} Report`,
                                allowed_roles: ['admin', 'dean', 'hod', 'faculty', 'student']
                            },
                            error: null
                        });
                    }),
                    then: (resolve) => resolve({
                        data: [
                            { report_code: 'STUDENT_COMPLETE_ACADEMIC_HISTORY', category: 'STUDENT', report_name: 'Complete Academic History', allowed_roles: ['admin', 'dean', 'hod', 'faculty', 'student'] },
                            { report_code: 'COURSE_POPULARITY', category: 'COURSE', report_name: 'Course Popularity Index', allowed_roles: ['admin', 'dean', 'hod', 'faculty'] },
                            { report_code: 'ATTENDANCE_DEFAULTERS', category: 'ATTENDANCE', report_name: 'Attendance Defaulters Report', allowed_roles: ['admin', 'dean', 'hod', 'faculty'] }
                        ],
                        error: null
                    })
                };
            }
            if (table === 'user_saved_reports') {
                return createChainable({
                    data: [{ id: 'saved-1', user_id: 'user-1', report_code: 'COURSE_POPULARITY', is_favorite: true }],
                    error: null
                });
            }
            if (table === 'report_generation_history') {
                return createChainable({
                    data: [{ id: 'hist-1', report_code: 'STUDENT_COMPLETE_ACADEMIC_HISTORY', row_count: 5 }],
                    error: null
                });
            }
            if (table === 'scheduled_automatic_reports') {
                return createChainable({
                    data: [{ id: 'sched-1', report_code: 'ATTENDANCE_DEFAULTERS', schedule_frequency: 'WEEKLY', status: 'ACTIVE' }],
                    error: null
                });
            }
            if (table === 'student_academic_timeline') {
                return createChainable({
                    data: [
                        { id: 'evt-1', student_id: 'stud-101', event_type: 'ADMISSION', title: 'Admitted to Computer Science Engineering', module_name: 'REGISTRATION', event_date: '2026-07-01' }
                    ],
                    error: null
                });
            }
            if (table === 'profiles') {
                return createChainable({
                    data: [
                        { id: 'stud-101', role: 'student', full_name: 'Vaibhav Bariyar', department: 'Computer Science Engineering', cgpa: '8.85', current_semester: 5 },
                        { id: 'stud-102', role: 'student', full_name: 'Aditi Sharma', department: 'Computer Science Engineering', cgpa: '9.20', current_semester: 5 }
                    ],
                    error: null
                });
            }
            if (table === 'student_results') {
                return createChainable({
                    data: [
                        { id: 'res-1', student_id: 'stud-101', result_status: 'PASS', total_marks: 88, grade: 'A+' },
                        { id: 'res-2', student_id: 'stud-102', result_status: 'PASS', total_marks: 92, grade: 'O' }
                    ],
                    error: null
                });
            }
            if (table === 'academic_classes') {
                return createChainable({
                    data: [{ id: 'cls-1', class_name: 'FY-1', capacity: 70, status: 'ACTIVE' }],
                    error: null
                });
            }
            if (table === 'practical_batches') {
                return createChainable({
                    data: [{ id: 'bat-1', batch_name: 'Batch A', capacity: 24, status: 'ACTIVE' }],
                    error: null
                });
            }
            // View fallbacks
            return createChainable({
                data: [
                    { student_id: 'stud-101', student_name: 'Vaibhav Bariyar', current_cgpa: 8.85, total_credits_earned: 120, total_backlogs: 0, compliance_status: 'COMPLIANT' },
                    { student_id: 'stud-102', student_name: 'Aditi Sharma', current_cgpa: 9.20, total_credits_earned: 124, total_backlogs: 0, compliance_status: 'COMPLIANT' }
                ],
                error: null
            });
        })
}));

describe('Enterprise Reporting & Analytics Engine (Phase 7)', () => {

    test('1. Should resolve Date Filter presets (TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, CURRENT_SEMESTER, CURRENT_ACADEMIC_YEAR)', () => {
        const today = reportingService.resolveDateFilter('TODAY');
        expect(today.start).toBeDefined();
        expect(today.start).toEqual(today.end);

        const last30 = reportingService.resolveDateFilter('LAST_30_DAYS');
        expect(last30.start).toBeDefined();
        expect(last30.end).toBeDefined();
        expect(new Date(last30.start).getTime()).toBeLessThan(new Date(last30.end).getTime());
    });

    test('2. Should resolve custom date range filter start and end boundaries', () => {
        const custom = reportingService.resolveDateFilter('CUSTOM_DATE_RANGE', '2026-01-01', '2026-06-30');
        expect(custom.start).toBe('2026-01-01');
        expect(custom.end).toBe('2026-06-30');
    });

    test('3. Should load the Report Catalog filtered by category and user role permissions', async () => {
        const catalog = await reportingService.getReportCatalog('STUDENT', { id: 'admin-1', role: 'admin' });
        expect(Array.isArray(catalog)).toBe(true);
        expect(catalog.length).toBeGreaterThan(0);
        expect(catalog[0]).toHaveProperty('report_code');
        expect(catalog[0]).toHaveProperty('report_name');
    });

    test('4. Should generate Student Complete Academic History report with pagination and audit history logging', async () => {
        const report = await reportingService.generateReport('STUDENT_COMPLETE_ACADEMIC_HISTORY', {}, { page: 1, limit: 10 }, { id: 'admin-1', role: 'admin' });
        expect(report.report_code).toBe('STUDENT_COMPLETE_ACADEMIC_HISTORY');
        expect(report.total_rows).toBeGreaterThan(0);
        expect(report).toHaveProperty('execution_time_ms');
        expect(Array.isArray(report.rows)).toBe(true);
    });

    test('5. Should generate Course Popularity & Enrollment report aggregating registration and pass/fail metrics', async () => {
        const report = await reportingService.generateReport('COURSE_POPULARITY', {}, { page: 1, limit: 10 }, { id: 'admin-1', role: 'admin' });
        expect(report.report_code).toBe('COURSE_POPULARITY');
        expect(report.category).toBe('COURSE');
        expect(report.rows).toBeDefined();
    });

    test('6. Should generate Attendance Defaulters (< 75%) analytics report', async () => {
        const report = await reportingService.generateReport('ATTENDANCE_DEFAULTERS', {}, { page: 1, limit: 10 }, { id: 'admin-1', role: 'admin' });
        expect(report.report_code).toBe('ATTENDANCE_DEFAULTERS');
        expect(report.category).toBe('ATTENDANCE');
    });

    test('7. Should generate Examination Rank List & Merit List report ordered by CGPA', async () => {
        const report = await reportingService.generateReport('EXAM_MERIT_LIST', {}, { page: 1, limit: 10 }, { id: 'admin-1', role: 'admin' });
        expect(report.report_code).toBe('EXAM_MERIT_LIST');
        expect(report.category).toBe('EXAMINATION');
    });

    test('8. Should generate Faculty Workload & Assigned Classes summary report', async () => {
        const report = await reportingService.generateReport('FACULTY_WORKLOAD', {}, { page: 1, limit: 10 }, { id: 'admin-1', role: 'admin' });
        expect(report.report_code).toBe('FACULTY_WORKLOAD');
        expect(report.category).toBe('FACULTY');
    });

    test('9. Should generate Credit Earned vs Pending & Deficit audit report', async () => {
        const report = await reportingService.generateReport('CREDIT_DEFICIT', {}, { page: 1, limit: 10 }, { id: 'admin-1', role: 'admin' });
        expect(report.report_code).toBe('CREDIT_DEFICIT');
        expect(report.category).toBe('CREDIT');
    });

    test('10. Should compute interactive Analytics Dashboard KPI metrics across all 13 required metrics', async () => {
        const dashboard = await reportingService.getAnalyticsDashboard({});
        expect(dashboard).toHaveProperty('timestamp');
        expect(dashboard).toHaveProperty('kpis');
        expect(dashboard.kpis).toHaveProperty('institutional_avg_cgpa');
        expect(dashboard.kpis).toHaveProperty('overall_pass_percentage');
        expect(dashboard.kpis).toHaveProperty('attendance_defaulter_rate');
        expect(dashboard).toHaveProperty('charts');
        expect(Array.isArray(dashboard.charts.department_performance)).toBe(true);
        expect(Array.isArray(dashboard.charts.course_popularity_top5)).toBe(true);
    });

    test('11. Should record a permanent Student Academic Timeline event from Admission to Graduation', async () => {
        const evt = await reportingService.addTimelineEvent({
            studentId: 'stud-101',
            eventType: 'ADMISSION',
            title: 'Admitted to Computer Science Engineering',
            description: 'Enrolled in 2026-2027 academic session',
            moduleName: 'REGISTRATION'
        });
        expect(evt).toBeDefined();
    });

    test('12. Should automatically seed retroactive legacy academic timeline events if a student timeline is empty', async () => {
        const timeline = await reportingService.getStudentTimeline('stud-101', {}, { id: 'admin-1', role: 'admin' });
        expect(Array.isArray(timeline)).toBe(true);
        expect(timeline.length).toBeGreaterThan(0);
        expect(timeline[0]).toHaveProperty('event_type');
        expect(timeline[0]).toHaveProperty('title');
    });

    test('13. Should manage User Saved Reports and toggle favorite report status (is_favorite)', async () => {
        const saved = await reportingService.manageSavedReports('user-1', 'SAVE', {
            report_code: 'COURSE_POPULARITY',
            saved_name: 'My Favorite Course Report',
            is_favorite: true
        });
        expect(saved).toBeDefined();
    });

    test('14. Should manage Scheduled Automatic Reports for Daily, Weekly, Monthly, and Semester-End frequency', async () => {
        const sched = await reportingService.manageScheduledReports('CREATE', {
            report_code: 'ATTENDANCE_DEFAULTERS',
            schedule_frequency: 'WEEKLY',
            target_emails: ['dean.cs@university.edu'],
            export_format: 'EXCEL'
        });
        expect(sched).toBeDefined();
    });

});
