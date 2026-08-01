// backend/tests/registrationEngine.test.js
// Enterprise Automated Test Suite for Phase 4: Course Registration Engine
const registrationService = require('../services/registrationService');
const registrationRepository = require('../repositories/registrationRepository');

jest.mock('../repositories/registrationRepository');

describe('Enterprise Course Registration Engine (Phase 4)', () => {
    const mockStudent = {
        id: 'student-1',
        full_name: 'Aarav Sharma',
        lifecycle_status: 'active',
        department: 'Computer Science',
        semester: 5
    };

    const mockCourse = {
        allocation_id: 'alloc-1',
        subject_id: 'sub-1',
        subject_code: 'CS101',
        subject_name: 'Intro to CS',
        subject_credits: 4,
        capacity: 60,
        enrolled_count: 10,
        semester_id: 'sem-1'
    };

    const mockOpenWindow = {
        id: 'win-1',
        status: 'OPEN',
        start_date: '2026-01-01T00:00:00Z',
        end_date: '2026-12-31T23:59:59Z',
        min_credits: 12,
        max_credits: 26,
        allow_late_registration: false
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Default happy-path profile & course catalog
        registrationRepository.findStudentProfile.mockResolvedValue(mockStudent);
        registrationRepository.findAvailableCoursesForStudent.mockResolvedValue([mockCourse]);
        registrationRepository.findExistingRegistration.mockResolvedValue(null);
        registrationRepository.findStudentRegistrations.mockResolvedValue([]);
        registrationRepository.findPrerequisitesForSubject.mockResolvedValue([]);
        registrationRepository.findClearedSubjectsForStudent.mockResolvedValue([]);
        registrationRepository.findPendingBacklogsForStudent.mockResolvedValue([]);
        registrationRepository.createRegistration.mockResolvedValue({
            id: 'reg-1',
            student_id: 'student-1',
            allocation_id: 'alloc-1',
            status: 'REGISTERED'
        });
        registrationRepository.insertAuditLog.mockResolvedValue({ id: 'log-1' });
    });

    // ── 1. REGISTRATION WINDOW ENFORCEMENT ──────────────────────────────────────
    test('1. Should reject registration when window is closed or expired', async () => {
        registrationRepository.getActiveRegistrationWindow.mockResolvedValueOnce({
            id: 'win-closed',
            status: 'CLOSED',
            start_date: '2026-01-01T00:00:00Z',
            end_date: '2026-01-10T00:00:00Z',
            min_credits: 12,
            max_credits: 26
        });

        await expect(
            registrationService.registerCourse('student-1', 'alloc-1', 'student-1')
        ).rejects.toThrow(/Registration window status is CLOSED/);
    });

    test('2. Should allow registration process to proceed when window is OPEN', async () => {
        registrationRepository.getActiveRegistrationWindow.mockResolvedValueOnce(mockOpenWindow);

        const result = await registrationService.registerCourse('student-1', 'alloc-1', 'student-1');
        expect(result.registration.status).toBe('REGISTERED');
        expect(registrationRepository.createRegistration).toHaveBeenCalledWith(
            expect.objectContaining({ student_id: 'student-1', allocation_id: 'alloc-1' })
        );
    });

    // ── 2. CREDIT LIMIT VALIDATION ──────────────────────────────────────────────
    test('3. Should reject registration if adding course exceeds maximum semester credit limit', async () => {
        registrationRepository.getActiveRegistrationWindow.mockResolvedValueOnce({
            ...mockOpenWindow,
            max_credits: 24
        });
        // Student already registered for 22 credits -> 22 + 4 = 26 > 24 max
        registrationRepository.findStudentRegistrations.mockResolvedValueOnce([
            { allocation_id: 'existing-alloc', credits: 22, status: 'REGISTERED' }
        ]);

        await expect(
            registrationService.registerCourse('student-1', 'alloc-1', 'student-1')
        ).rejects.toThrow(/Credit limit exceeded/);
    });

    // ── 3. PREREQUISITE CLEARANCE ENGINE ────────────────────────────────────────
    test('4. Should reject course registration if prerequisite subject is uncleared/failed', async () => {
        registrationRepository.getActiveRegistrationWindow.mockResolvedValueOnce(mockOpenWindow);
        // CS101 requires CS099 as prerequisite
        registrationRepository.findPrerequisitesForSubject.mockResolvedValueOnce([
            { id: 'sub-prereq', code: 'CS099', name: 'Programming Fundamentals' }
        ]);
        // Student has NOT cleared CS099
        registrationRepository.findClearedSubjectsForStudent.mockResolvedValueOnce([]);

        await expect(
            registrationService.registerCourse('student-1', 'alloc-1', 'student-1')
        ).rejects.toThrow(/Prerequisite not cleared: You must complete "CS099/);
    });

    test('5. Should allow registration if student has cleared required prerequisite subjects', async () => {
        registrationRepository.getActiveRegistrationWindow.mockResolvedValueOnce(mockOpenWindow);
        registrationRepository.findPrerequisitesForSubject.mockResolvedValueOnce([
            { id: 'sub-prereq', code: 'CS099', name: 'Programming Fundamentals' }
        ]);
        // Student HAS cleared CS099
        registrationRepository.findClearedSubjectsForStudent.mockResolvedValueOnce([
            { subject_code: 'CS099', is_cleared: true }
        ]);

        const result = await registrationService.registerCourse('student-1', 'alloc-1', 'student-1');
        expect(result.registration.status).toBe('REGISTERED');
    });

    // ── 4. SEAT CAPACITY ENFORCEMENT ────────────────────────────────────────────
    test('6. Should reject registration when course seats are full (enrolled_count >= capacity)', async () => {
        registrationRepository.getActiveRegistrationWindow.mockResolvedValueOnce(mockOpenWindow);
        registrationRepository.findAvailableCoursesForStudent.mockResolvedValueOnce([
            {
                ...mockCourse,
                capacity: 60,
                enrolled_count: 60 // Full!
            }
        ]);

        await expect(
            registrationService.registerCourse('student-1', 'alloc-1', 'student-1')
        ).rejects.toThrow(/Course "CS101" is FULL/);
    });

    test('7. Should successfully register student when seats remain available', async () => {
        registrationRepository.getActiveRegistrationWindow.mockResolvedValueOnce(mockOpenWindow);
        registrationRepository.findAvailableCoursesForStudent.mockResolvedValueOnce([
            {
                ...mockCourse,
                capacity: 60,
                enrolled_count: 59 // 1 seat left
            }
        ]);

        const result = await registrationService.registerCourse('student-1', 'alloc-1', 'student-1');
        expect(result.registration.status).toBe('REGISTERED');
    });

    // ── 5. DUPLICATE REGISTRATION PREVENTION ────────────────────────────────────
    test('8. Should reject duplicate registration if student is already registered for the subject', async () => {
        registrationRepository.getActiveRegistrationWindow.mockResolvedValueOnce(mockOpenWindow);
        registrationRepository.findExistingRegistration.mockResolvedValueOnce({
            id: 'reg-existing',
            student_id: 'student-1',
            allocation_id: 'alloc-1',
            status: 'REGISTERED'
        });

        await expect(
            registrationService.registerCourse('student-1', 'alloc-1', 'student-1')
        ).rejects.toThrow(/Student is already registered for "CS101 - Intro to CS"/);
    });

    // ── 6. ADMIN OVERRIDE CAPABILITY ────────────────────────────────────────────
    test('9. Should allow Admin override even when window is CLOSED and course is FULL', async () => {
        registrationRepository.getActiveRegistrationWindow.mockResolvedValueOnce({
            id: 'win-closed',
            status: 'CLOSED'
        });
        registrationRepository.findAvailableCoursesForStudent.mockResolvedValueOnce([
            {
                ...mockCourse,
                capacity: 60,
                enrolled_count: 60 // Full!
            }
        ]);
        registrationRepository.createRegistration.mockResolvedValueOnce({
            id: 'reg-override',
            student_id: 'student-1',
            allocation_id: 'alloc-1',
            status: 'ADMIN_OVERRIDE'
        });

        const result = await registrationService.registerCourse(
            'student-1',
            'alloc-1',
            'admin-user',
            { isAdminOverride: true, overrideReason: 'Dean special override' }
        );

        expect(result.registration.status).toBe('ADMIN_OVERRIDE');
        expect(result.isAdminOverride).toBe(true);
    });

    // ── 7. IMMUTABLE AUDIT LOGGING & TRIGGER COMPATIBILITY ──────────────────────
    test('10. Should record immutable audit log with IP address and performed_by user metadata', async () => {
        registrationRepository.getActiveRegistrationWindow.mockResolvedValueOnce(mockOpenWindow);

        await registrationService.registerCourse(
            'student-1',
            'alloc-1',
            'student-1',
            { ipAddress: '192.168.1.100' }
        );

        expect(registrationRepository.insertAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                student_id: 'student-1',
                allocation_id: 'alloc-1',
                action: 'REGISTERED',
                performed_by: 'student-1',
                ip_address: '192.168.1.100'
            })
        );
    });
});
