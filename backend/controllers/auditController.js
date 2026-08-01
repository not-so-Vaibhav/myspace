// backend/controllers/auditController.js
// Enterprise Audit Trail Controller — HTTP request handlers for audit logs,
// student activity history, and Admin Dashboard stats.

const service = require('../services/auditService');

async function recordLog(req, res, next) {
    try {
        const log = await service.recordAuditLog({
            userId: req.user?.id || req.body.userId,
            userName: req.user?.name || req.body.userName || 'System Administrator',
            userEmail: req.user?.email || req.body.userEmail,
            role: req.user?.role || req.body.role || 'admin',
            action: req.body.action,
            module: req.body.module,
            affectedRecord: req.body.affectedRecord || req.body.affected_record,
            oldValue: req.body.oldValue || req.body.old_value,
            newValue: req.body.newValue || req.body.new_value,
            ipAddress: req.ip || req.body.ipAddress || '127.0.0.1',
            deviceInfo: req.headers['user-agent'] || 'Mozilla/5.0 Enterprise Client',
            browser: req.body.browser || 'Chrome Enterprise',
            status: req.body.status || 'SUCCESS'
        });
        res.status(201).json({ status: 'ok', data: log });
    } catch (err) {
        next(err);
    }
}

async function recordActivity(req, res, next) {
    try {
        const activity = await service.recordStudentActivityLog({
            studentId: req.body.studentId || req.user?.id,
            activityType: req.body.activityType || req.body.activity_type,
            title: req.body.title,
            description: req.body.description,
            metadata: req.body.metadata,
            ipAddress: req.ip || '127.0.0.1',
            deviceInfo: req.headers['user-agent'] || 'Student Portal'
        });
        res.status(201).json({ status: 'ok', data: activity });
    } catch (err) {
        next(err);
    }
}

async function searchLogs(req, res, next) {
    try {
        const result = await service.searchAuditLogs({
            module: req.query.module,
            action: req.query.action,
            role: req.query.role,
            status: req.query.status,
            search: req.query.search,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            page: req.query.page || 1,
            limit: req.query.limit || 50
        });
        res.json({ status: 'ok', ...result });
    } catch (err) {
        next(err);
    }
}

async function getStats(req, res, next) {
    try {
        const stats = await service.getAdminDashboardStats();
        res.json({ status: 'ok', data: stats });
    } catch (err) {
        next(err);
    }
}

async function exportLogs(req, res, next) {
    try {
        const exported = await service.exportAuditLogs({
            module: req.query.module,
            action: req.query.action,
            role: req.query.role,
            status: req.query.status,
            search: req.query.search,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        });
        res.json({ status: 'ok', count: exported.length, data: exported });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    recordLog,
    recordActivity,
    searchLogs,
    getStats,
    exportLogs
};
