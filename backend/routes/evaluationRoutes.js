// backend/routes/evaluationRoutes.js
// Express Router for Phase 10: Subject Evaluation & Continuous Assessment System

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/evaluationController');

// 1. Faculty Allocations with progress overview
router.get('/allocations', ctrl.getFacultyAllocations);

// 2. Full Spreadsheet Evaluation Roster for an Allocation (Live attendance % + student list + marks)
router.get('/sheet/:allocationId', ctrl.getEvaluationSheet);

// 3. Save / Upsert batch evaluation marks
router.post('/save-batch', ctrl.saveBatchEvaluations);

// 4. Lock or unlock evaluation sheet
router.post('/lock/:allocationId', ctrl.lockEvaluationSheet);

// 5. Student read-only evaluation breakdown
router.get('/student/my-evaluations', ctrl.getStudentEvaluations);

// 6. Admin Institutional Overview & Reports
router.get('/admin/all', ctrl.getAllEvaluationsAdmin);

module.exports = router;
