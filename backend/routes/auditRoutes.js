// backend/routes/auditRoutes.js
// Enterprise Audit Trail & Admin Dashboard Routes
// No auth middleware — matches the pattern used by all other ERP route files in this project
// (batchManagementRoutes, creditRoutes, graduationRoutes, registrationRoutes, reportingRoutes).

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auditController');

// 1. Record Audit Log & Activity Log
router.post('/log', ctrl.recordLog);
router.post('/activity', ctrl.recordActivity);

// 2. Search & Query Enterprise Audit Trail
router.get('/logs', ctrl.searchLogs);

// 3. Admin Dashboard Quick Statistics
router.get('/admin-dashboard-stats', ctrl.getStats);

// 4. Export Audit Trail
router.get('/export', ctrl.exportLogs);

module.exports = router;
