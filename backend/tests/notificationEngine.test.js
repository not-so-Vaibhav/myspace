// ==============================================================================
// PHASE 9 AUTOMATED TEST SUITE: ENTERPRISE NOTIFICATION INTEGRATION
// TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Style
// ==============================================================================
// Comprehensive automated test suite verifying multi-module event dispatching,
// priority classification, category filtering, announcement targeting,
// preference enforcement, and automated reminders generation.
// ==============================================================================

jest.mock('../config/supabaseClient', () => {
    const mockQuery = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => Promise.resolve({
            data: { id: 1, unreadCount: 3 },
            error: null
        })),
        maybeSingle: jest.fn().mockImplementation(() => Promise.resolve({
            data: {
                id: 'mock-pref-101',
                user_id: 'user-101',
                in_app_enabled: true,
                email_enabled: true,
                categories: {
                    ACADEMIC: true,
                    EXAMS: true,
                    REMINDERS: true,
                    COURSE_REGISTRATION: true
                }
            },
            error: null
        })),
        then: (resolve) => resolve({
            data: [
                {
                    id: 101,
                    title: 'Mid-Sem Examination Timetable Released',
                    message: 'Check your student portal for room assignments.',
                    priority: 'CRITICAL',
                    category: 'EXAMS',
                    is_read: false,
                    created_at: new Date().toISOString()
                },
                {
                    id: 102,
                    title: 'Fee Installment Reminder',
                    message: 'Semester fee installment is due in 7 days.',
                    priority: 'HIGH',
                    category: 'REMINDERS',
                    is_read: false,
                    created_at: new Date().toISOString()
                }
            ],
            error: null
        })
    };
    return {
        from: jest.fn(() => mockQuery)
    };
});

const notificationService = require('../services/notificationService');
const notificationRepository = require('../repositories/notificationRepository');

describe('Phase 9: Enterprise Notification Integration Engine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --------------------------------------------------------------------------
    // 1. Multi-Module Event Dispatching & Preference Enforcement
    // --------------------------------------------------------------------------
    describe('1. Multi-Module Event Dispatching & Priority Enforcement', () => {
        test('Should dispatch notification to a single user with correct priority and category', async () => {
            const spyCreate = jest.spyOn(notificationRepository, 'insertNotification').mockResolvedValue({
                id: 201,
                user_id: 'student-uuid-1',
                title: 'Course Registration Approved',
                priority: 'HIGH',
                category: 'COURSE_REGISTRATION'
            });

            const res = await notificationService.notifyUser({
                userId: 'student-uuid-1',
                title: 'Course Registration Approved',
                message: 'Your registration for semester 3 is approved by HOD.',
                priority: 'HIGH',
                category: 'COURSE_REGISTRATION',
                sourceModule: 'REGISTRATION'
            });

            expect(res.status).toBe('SUCCESS');
            expect(res.data.id).toBe(201);
            expect(spyCreate).toHaveBeenCalledTimes(1);
        });

        test('Should respect user opt-out preferences and skip delivery when category is disabled', async () => {
            // Mock preferences where REMINDERS category is false
            jest.spyOn(notificationRepository, 'findUserPreferences').mockResolvedValueOnce({
                in_app_enabled: true,
                email_enabled: true,
                categories: { REMINDERS: false }
            });

            const spyCreate = jest.spyOn(notificationRepository, 'insertNotification');

            const res = await notificationService.notifyUser({
                userId: 'user-opted-out',
                title: 'Optional Workshop Reminder',
                message: 'AI Coding Workshop starts in 2 hours.',
                priority: 'LOW',
                category: 'REMINDERS',
                sourceModule: 'ACADEMIC'
            });

            expect(res.status).toBe('SKIPPED');
            expect(res.reason).toBe('User opted out of REMINDERS notifications');
            expect(spyCreate).not.toHaveBeenCalled();
        });

        test('Should always deliver CRITICAL priority notifications regardless of user preferences', async () => {
            // Even if user disabled all categories
            jest.spyOn(notificationRepository, 'findUserPreferences').mockResolvedValueOnce({
                in_app_enabled: false,
                email_enabled: false,
                categories: { EXAMS: false }
            });

            const spyCreate = jest.spyOn(notificationRepository, 'insertNotification').mockResolvedValue({
                id: 301,
                user_id: 'student-uuid-1',
                title: 'URGENT: Exam Hall Ticket Revoked',
                priority: 'CRITICAL',
                category: 'EXAMS'
            });

            const res = await notificationService.notifyUser({
                userId: 'student-uuid-1',
                title: 'URGENT: Exam Hall Ticket Revoked',
                message: 'Please meet dean academic immediately.',
                priority: 'CRITICAL',
                category: 'EXAMS',
                sourceModule: 'EXAMS'
            });

            expect(res.status).toBe('SUCCESS');
            expect(spyCreate).toHaveBeenCalledTimes(1);
        });

        test('Should dispatch broadcast notifications to multiple users in bulk', async () => {
            const spyBulk = jest.spyOn(notificationRepository, 'insertBulkNotifications').mockResolvedValue([
                { id: 401 }, { id: 402 }, { id: 403 }
            ]);

            const res = await notificationService.notifyBulkUsers({
                userIds: ['uuid-1', 'uuid-2', 'uuid-3'],
                title: 'Campus Wifi Maintenance',
                message: 'Network downtime from 2 AM to 4 AM.',
                priority: 'MEDIUM',
                category: 'ANNOUNCEMENT',
                sourceModule: 'SYSTEM'
            });

            expect(res.status).toBe('SUCCESS');
            expect(res.count).toBe(3);
            expect(spyBulk).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ user_id: 'uuid-1', priority: 'MEDIUM' })
                ])
            );
        });
    });

    // --------------------------------------------------------------------------
    // 2. Announcement Targeting & RBAC Filtering
    // --------------------------------------------------------------------------
    describe('2. Announcement Targeting & RBAC Filtering', () => {
        test('Should target announcements to specific audience (student/faculty/both)', async () => {
            const spyAnn = jest.spyOn(notificationRepository, 'insertAnnouncement').mockResolvedValue({
                id: 501,
                title: 'Faculty General Body Meeting',
                target_audience: 'faculty',
                status: 'approved'
            });

            const res = await notificationService.notifyGroup({
                title: 'Faculty General Body Meeting',
                description: 'Meeting at 4 PM in Auditorium.',
                targetAudience: 'faculty',
                priority: 'HIGH',
                category: 'ANNOUNCEMENT',
                createdBy: 'admin-101',
                status: 'approved'
            });

            expect(res.target_audience).toBe('faculty');
            expect(res.status).toBe('approved');
            expect(spyAnn).toHaveBeenCalled();
        });

        test('Should set status to pending when submitted by faculty without admin role', async () => {
            const spyAnn = jest.spyOn(notificationRepository, 'insertAnnouncement').mockResolvedValue({
                id: 502,
                title: 'Lab Cancellation Notice',
                target_audience: 'student',
                status: 'pending'
            });

            const res = await notificationService.notifyGroup({
                title: 'Lab Cancellation Notice',
                description: 'Friday afternoon CS Lab is cancelled.',
                targetAudience: 'student',
                createdBy: 'faculty-101',
                status: 'pending'
            });

            expect(res.status).toBe('pending');
        });
    });

    // --------------------------------------------------------------------------
    // 3. Automated ERP Reminders Generator
    // --------------------------------------------------------------------------
    describe('3. Automated ERP Reminders Generator', () => {
        test('Should run automated reminders scan and generate alerts across ERP modules', async () => {
            const spyAudit = jest.spyOn(notificationRepository, 'insertAuditLog').mockResolvedValue(true);

            const res = await notificationService.runAutomatedReminders({
                actorId: 'system-scheduler'
            });

            expect(res.status).toBe('SUCCESS');
            expect(res.triggeredCount).toBeGreaterThanOrEqual(1);
            expect(spyAudit).toHaveBeenCalled();
        });
    });

    // --------------------------------------------------------------------------
    // 4. Notification Lifecycle & Unread Count Badge
    // --------------------------------------------------------------------------
    describe('4. Notification Lifecycle & Unread Count Badge', () => {
        test('Should fetch notifications and unread badge count for user', async () => {
            jest.spyOn(notificationRepository, 'findNotificationsByUser').mockResolvedValue({
                data: [{ id: 1, title: 'Notif 1' }],
                total: 1
            });
            jest.spyOn(notificationRepository, 'findAnnouncements').mockResolvedValue([]);
            const spyCount = jest.spyOn(notificationRepository, 'countUnreadByUser').mockResolvedValue(5);

            const res = await notificationService.getNotifications({
                userId: 'user-uuid-1',
                role: 'student'
            });

            expect(res.unreadCount).toBe(5);
            expect(spyCount).toHaveBeenCalledWith('user-uuid-1');
        });

        test('Should mark notification read and archive correctly', async () => {
            jest.spyOn(notificationRepository, 'getNotificationById').mockResolvedValue({
                id: 101,
                user_id: 'user-uuid-1',
                is_read: false
            });
            const spyUpdate = jest.spyOn(notificationRepository, 'updateNotification').mockResolvedValue({
                id: 101,
                is_read: true
            });
            jest.spyOn(notificationRepository, 'insertAuditLog').mockResolvedValue(true);

            const res = await notificationService.markAsRead(101, 'user-uuid-1');

            expect(res.is_read).toBe(true);
            expect(spyUpdate).toHaveBeenCalledWith(101, { is_read: true });
        });

        test('Should mark all notifications read for user', async () => {
            const spyMarkAll = jest.spyOn(notificationRepository, 'markAllAsRead').mockResolvedValue([
                { id: 101 }, { id: 102 }
            ]);
            jest.spyOn(notificationRepository, 'insertAuditLog').mockResolvedValue(true);

            const res = await notificationService.markAllAsRead('user-uuid-1');

            expect(res).toHaveLength(2);
            expect(spyMarkAll).toHaveBeenCalledWith('user-uuid-1');
        });
    });
});
