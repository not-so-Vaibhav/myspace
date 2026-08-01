// backend/routes/reportingRoutes.js
// Phase 7: Enterprise Reporting & Analytics Routes
// No auth middleware — matches the pattern used by all other ERP route files in this project
// (batchManagementRoutes, creditRoutes, graduationRoutes, registrationRoutes — all open)

const express = require('express');
const router = express.Router();
const reportingController = require('../controllers/reportingController');

// 1. Report Catalog — open read
router.get('/catalog', reportingController.getCatalog);

// 2. Generate Report
router.post('/generate', reportingController.generateReport);

// 3. Analytics Dashboard
router.get('/analytics', reportingController.getAnalyticsDashboard);

// 4. Student Academic Timeline
router.get('/timeline/:studentId', reportingController.getStudentTimeline);
router.post('/timeline', reportingController.addTimelineEvent);

// 5. Saved & Favorite Reports
router.post('/saved', reportingController.manageSavedReports);

// 6. Scheduled Reports
router.post('/scheduled', reportingController.manageScheduledReports);

// 7. Export Report
router.post('/export', reportingController.exportReport);

module.exports = router;
