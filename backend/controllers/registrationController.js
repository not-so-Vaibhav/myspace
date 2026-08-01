// backend/controllers/registrationController.js
// Enterprise Course Registration Controller
const registrationService = require('../services/registrationService');
const registrationRepository = require('../repositories/registrationRepository');

// Helper for extracting IP address
function getClientIp(req) {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
}

/**
 * GET /api/registration/window
 * Retrieve active registration window
 */
async function getRegistrationWindow(req, res) {
    try {
        const { academicYearId, semesterId } = req.query;
        const window = await registrationRepository.getActiveRegistrationWindow(academicYearId, semesterId);
        res.json({
            success: true,
            window: window || { status: 'OPEN', min_credits: 12.0, max_credits: 26.0 }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * POST /api/registration/window (Admin/Dean only)
 * Create or update a registration window
 */
async function upsertRegistrationWindow(req, res) {
    try {
        const windowData = req.body;
        const updated = await registrationRepository.upsertRegistrationWindow(windowData);
        res.json({ success: true, window: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * GET /api/registration/available-courses
 * Student discovery endpoint
 */
async function getAvailableCourses(req, res) {
    try {
        const studentId = req.user?.id || req.query.studentId;
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Student ID is required.' });
        }
        const data = await registrationService.getStudentCourseDiscovery(studentId, req.query);
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * POST /api/registration/register
 * Student self-registration
 */
async function registerCourse(req, res) {
    try {
        const studentId = req.user?.id || req.body.studentId;
        const { allocationId } = req.body;
        if (!studentId || !allocationId) {
            return res.status(400).json({ success: false, message: 'studentId and allocationId are required.' });
        }

        const result = await registrationService.registerCourse(
            studentId,
            allocationId,
            req.user?.id || studentId,
            { isAdminOverride: false, ipAddress: getClientIp(req) }
        );

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(err.statusCode || 500).json({
            success: false,
            message: err.message,
            validationErrors: err.validationErrors || []
        });
    }
}

/**
 * POST /api/registration/drop
 * Student course drop
 */
async function dropCourse(req, res) {
    try {
        const studentId = req.user?.id || req.body.studentId;
        const { allocationId, reason } = req.body;
        if (!studentId || !allocationId) {
            return res.status(400).json({ success: false, message: 'studentId and allocationId are required.' });
        }

        const result = await registrationService.dropCourse(
            studentId,
            allocationId,
            req.user?.id || studentId,
            { isAdminOverride: false, reason, ipAddress: getClientIp(req) }
        );

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
}

/**
 * GET /api/registration/my-dashboard
 * Student dashboard summary
 */
async function getStudentDashboard(req, res) {
    try {
        const studentId = req.user?.id || req.query.studentId;
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Student ID is required.' });
        }
        const data = await registrationService.getStudentDashboardData(studentId);
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * GET /api/registration/history
 * Retrieve student registration history
 */
async function getRegistrationHistory(req, res) {
    try {
        const studentId = req.user?.id || req.query.studentId;
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Student ID is required.' });
        }
        const registrations = await registrationRepository.findStudentRegistrations(studentId, req.query.semesterId);
        res.json({ success: true, registrations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * GET /api/registration/faculty/courses
 * Faculty dashboard allocated courses
 */
async function getFacultyCourses(req, res) {
    try {
        const facultyId = req.user?.id || req.query.facultyId;
        if (!facultyId) {
            return res.status(400).json({ success: false, message: 'Faculty ID is required.' });
        }
        const summary = await registrationService.getFacultyRegistrationSummary(facultyId);
        res.json({ success: true, ...summary });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * GET /api/registration/faculty/students/:allocationId
 * View registered students in a faculty's allocation
 */
async function getFacultyCourseStudents(req, res) {
    try {
        const { allocationId } = req.params;
        const result = await registrationService.getFacultyCourseStudents(allocationId);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * POST /api/registration/admin/force-register
 * Admin override registration
 */
async function adminForceRegister(req, res) {
    try {
        const { studentId, allocationId, reason } = req.body;
        if (!studentId || !allocationId) {
            return res.status(400).json({ success: false, message: 'studentId and allocationId are required.' });
        }

        const result = await registrationService.registerCourse(
            studentId,
            allocationId,
            req.user?.id || 'admin',
            { isAdminOverride: true, overrideReason: reason || 'Admin override', ipAddress: getClientIp(req) }
        );

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
}

/**
 * POST /api/registration/admin/force-drop
 * Admin override course drop
 */
async function adminForceDrop(req, res) {
    try {
        const { studentId, allocationId, reason } = req.body;
        if (!studentId || !allocationId) {
            return res.status(400).json({ success: false, message: 'studentId and allocationId are required.' });
        }

        const result = await registrationService.dropCourse(
            studentId,
            allocationId,
            req.user?.id || 'admin',
            { isAdminOverride: true, reason: reason || 'Admin force drop', ipAddress: getClientIp(req) }
        );

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
}

/**
 * POST /api/registration/admin/bulk-register
 * Admin bulk import
 */
async function adminBulkRegister(req, res) {
    try {
        const { registrations } = req.body;
        if (!Array.isArray(registrations) || registrations.length === 0) {
            return res.status(400).json({ success: false, message: 'An array of registrations is required.' });
        }

        const result = await registrationService.adminBulkRegister(
            registrations,
            req.user?.id || 'admin',
            getClientIp(req)
        );

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * GET /api/registration/admin/analytics
 * Enterprise Analytics dashboard
 */
async function getAdminAnalytics(req, res) {
    try {
        const analytics = await registrationService.getAdminAnalytics();
        res.json({ success: true, ...analytics });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * GET /api/registration/admin/audit-logs
 * List registration audit logs
 */
async function getAuditLogs(req, res) {
    try {
        const logs = await registrationRepository.listAuditLogs(req.query);
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    getRegistrationWindow,
    upsertRegistrationWindow,
    getAvailableCourses,
    registerCourse,
    dropCourse,
    getStudentDashboard,
    getRegistrationHistory,
    getFacultyCourses,
    getFacultyCourseStudents,
    adminForceRegister,
    adminForceDrop,
    adminBulkRegister,
    getAdminAnalytics,
    getAuditLogs
};
