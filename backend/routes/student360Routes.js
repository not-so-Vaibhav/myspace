// backend/routes/student360Routes.js
// Student 360° Profile & Academic Journey Routes
// No auth middleware — matches the pattern used by all other ERP route files in this project
// (batchManagementRoutes, creditRoutes, graduationRoutes, registrationRoutes, reportingRoutes).

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/student360Controller');

// 1. Search Engine & 13+ Advanced Filters
router.get('/search', ctrl.search);

// 2. Complete 360° Profile
router.get('/profile/:studentId', ctrl.getProfile);

// 3. Chronological Academic Timeline (28+ event categories)
router.get('/timeline/:studentId', ctrl.getTimeline);

// 4. Academic Record (Results, Attendance, Credits, Backlogs, Certificates)
router.get('/academic-record/:studentId', ctrl.getAcademicRecord);

// 5. Activity History Logs
router.get('/activity-history/:studentId', ctrl.getActivityHistory);

// 6. Report Integration Export (Excel, CSV, PDF, Print)
router.get('/export/:studentId', ctrl.exportProfile);

module.exports = router;
