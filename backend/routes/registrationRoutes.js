// backend/routes/registrationRoutes.js
// Express router for Phase 4: Enterprise Course Registration System
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/registrationController');

// ── REGISTRATION WINDOWS ──────────────────────────────────────────────────────
router.get('/window', ctrl.getRegistrationWindow);
router.post('/window', ctrl.upsertRegistrationWindow);

// ── STUDENT DISCOVERY & REGISTRATION ─────────────────────────────────────────
router.get('/available-courses', ctrl.getAvailableCourses);
router.post('/register', ctrl.registerCourse);
router.post('/drop', ctrl.dropCourse);
router.get('/my-dashboard', ctrl.getStudentDashboard);
router.get('/history', ctrl.getRegistrationHistory);

// ── FACULTY DASHBOARD ────────────────────────────────────────────────────────
router.get('/faculty/courses', ctrl.getFacultyCourses);
router.get('/faculty/students/:allocationId', ctrl.getFacultyCourseStudents);

// ── ADMIN BULK & ANALYTICS ───────────────────────────────────────────────────
router.post('/admin/force-register', ctrl.adminForceRegister);
router.post('/admin/force-drop', ctrl.adminForceDrop);
router.post('/admin/bulk-register', ctrl.adminBulkRegister);
router.get('/admin/analytics', ctrl.getAdminAnalytics);
router.get('/admin/audit-logs', ctrl.getAuditLogs);

module.exports = router;
