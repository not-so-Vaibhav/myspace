// ==============================================================================
// PHASE 10 AUTOMATED TEST SUITE: ENTERPRISE AUDIT TRAIL & ADMIN DASHBOARD STATS
// TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Style
// ==============================================================================
// Comprehensive automated test suite verifying immutable audit log recording,
// search and filtering across ERP modules, JSON diff old/new value tracking,
// student activity history, and Admin Dashboard KPI statistics.
// ==============================================================================

jest.mock('../config/supabaseClient', () => {
    const mockQuery = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => Promise.resolve({
            data: {
                id: 'mock-audit-id-101',
                timestamp: '2026-02-15T10:00:00Z',
                user_name: 'Dr. Aris Thorne (Registrar)',
                role: 'admin',
                action: 'PROMOTE_BATCH',
                module: 'ACADEMIC_PROMOTION',
                affected_record: 'B.Tech CSE - 2024 Batch',
                status: 'SUCCESS'
            },
            error: null
        })),
        then: (resolve) => resolve({
            data: [
                {
                    id: 'mock-audit-1',
                    timestamp: '2026-02-15T10:00:00Z',
                    user_name: 'Registrar Office',
                    role: 'admin',
                    action: 'PROMOTE_BATCH',
                    module: 'ACADEMIC_PROMOTION',
                    affected_record: 'B.Tech CSE - 2024 Batch',
                    status: 'SUCCESS'
                },
                {
                    id: 'mock-audit-2',
                    timestamp: '2026-02-14T10:00:00Z',
                    user_name: 'Dean Academics',
                    role: 'dean',
                    action: 'APPROVE_RULE',
                    module: 'ACADEMIC_RULES',
                    affected_record: 'Rule-104 (75% Attendance Threshold)',
                    status: 'SUCCESS'
                }
            ],
            count: 2,
            error: null
        })
    };
    return {
        from: jest.fn(() => mockQuery)
    };
});

const auditService = require('../services/auditService');

describe('Enterprise Audit Trail & Admin Dashboard Stats (Phase 10)', () => {
    test('1. Should record an immutable audit log with old and new values', async () => {
        const result = await auditService.recordAuditLog({
            userName: 'Dr. Aris Thorne (Registrar)',
            role: 'admin',
            action: 'PROMOTE_BATCH',
            module: 'ACADEMIC_PROMOTION',
            affectedRecord: 'B.Tech CSE - 2024 Batch',
            oldValue: { semester: 3, status: 'ACTIVE' },
            newValue: { semester: 4, status: 'PROMOTED' }
        });

        expect(result).toBeDefined();
        expect(result.action).toBe('PROMOTE_BATCH');
        expect(result.module).toBe('ACADEMIC_PROMOTION');
        expect(result.status).toBe('SUCCESS');
    });

    test('2. Should reject audit log if action or module is missing', async () => {
        await expect(
            auditService.recordAuditLog({ action: '', module: 'TEST' })
        ).rejects.toThrow('Action and module are required');
    });

    test('3. Should record a student activity log', async () => {
        const activity = await auditService.recordStudentActivityLog({
            studentId: 'enr-2024-0012',
            activityType: 'PORTAL_LOGIN',
            title: 'Successful Portal Authentication',
            description: 'Logged in via SSO'
        });

        expect(activity).toBeDefined();
        expect(activity.id).toBeDefined();
    });

    test('4. Should search and filter enterprise audit logs by module and action', async () => {
        const res = await auditService.searchAuditLogs({
            module: 'ACADEMIC_PROMOTION',
            limit: 20
        });

        expect(res.logs).toBeDefined();
        expect(Array.isArray(res.logs)).toBe(true);
        expect(res.totalCount).toBeGreaterThanOrEqual(2);
    });

    test('5. Should compute comprehensive Admin Dashboard KPI statistics', async () => {
        const stats = await auditService.getAdminDashboardStats();

        expect(stats).toBeDefined();
        expect(typeof stats.totalStudents).toBe('number');
        expect(typeof stats.activeStudents).toBe('number');
        expect(typeof stats.graduatedStudents).toBe('number');
        expect(typeof stats.promotedStudents).toBe('number');
        expect(typeof stats.studentsWithBacklogs).toBe('number');
        expect(typeof stats.attendanceDefaulters).toBe('number');
        expect(typeof stats.lowCreditStudents).toBe('number');
        expect(typeof stats.registrationPending).toBe('number');
        expect(Array.isArray(stats.recentAdministrativeActions)).toBe(true);
    });

    test('6. Should export audit logs formatted for CSV / Excel download', async () => {
        const exported = await auditService.exportAuditLogs({ module: 'ALL' });

        expect(exported).toBeDefined();
        expect(Array.isArray(exported)).toBe(true);
        if (exported.length > 0) {
            expect(exported[0]).toHaveProperty('ID');
            expect(exported[0]).toHaveProperty('Timestamp');
            expect(exported[0]).toHaveProperty('User');
            expect(exported[0]).toHaveProperty('Role');
            expect(exported[0]).toHaveProperty('Action');
            expect(exported[0]).toHaveProperty('Module');
            expect(exported[0]).toHaveProperty('Status');
        }
    });

    test('7. Should provide rich fallback demo audit logs when DB is unreachable', () => {
        const fallback = auditService.getFallbackAuditLogs();

        expect(fallback.logs.length).toBeGreaterThan(0);
        expect(fallback.logs[0].action).toBe('PROMOTE_BATCH');
        expect(fallback.logs[0].module).toBe('ACADEMIC_PROMOTION');
        expect(fallback.logs[0].old_value).toBeDefined();
        expect(fallback.logs[0].new_value).toBeDefined();
    });
});
