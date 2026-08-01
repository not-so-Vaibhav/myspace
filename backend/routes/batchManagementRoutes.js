// backend/routes/batchManagementRoutes.js
// Express Router for Phase 6: Enterprise Class & Practical Batch Management System

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/batchManagementController');

// ── 1. ACADEMIC CLASSES ──────────────────────────────────────────────────────
router.post('/classes', ctrl.createClass);
router.get('/classes', ctrl.listClasses);
router.get('/classes/:id', ctrl.getClassById);

// ── 2. PRACTICAL BATCHES ─────────────────────────────────────────────────────
router.post('/batches', ctrl.createBatch);
router.get('/batches', ctrl.listBatches);
router.get('/batches/:id', ctrl.getBatchById);

// ── 3. AUTOMATIC BATCH GENERATION ────────────────────────────────────────────
router.post('/batches/auto-generate', ctrl.autoGenerateBatches);

// ── 4. STUDENT ALLOCATION & TRANSFERS ────────────────────────────────────────
router.post('/allocations/manual', ctrl.manualAllocateStudent);
router.post('/allocations/auto', ctrl.autoAllocateStudents);
router.post('/allocations/bulk', ctrl.bulkAllocateStudents);
router.post('/transfers/batch', ctrl.transferStudentBatch);
router.post('/transfers/class', ctrl.transferStudentClass);

// ── 5. FACULTY ALLOCATION ────────────────────────────────────────────────────
router.post('/faculty-allocations', ctrl.allocateFaculty);
router.get('/faculty-allocations', ctrl.listFacultyAllocations);

// ── 6. ATTENDANCE & TIMETABLE INTEGRATION ────────────────────────────────────
router.get('/attendance-roster', ctrl.getAttendanceRoster);
router.post('/timetables', ctrl.createTimetableEntry);
router.get('/timetables', ctrl.getTimetable);

// ── 7. ENTERPRISE REPORTS ────────────────────────────────────────────────────
router.get('/reports/:type', ctrl.generateReport);

module.exports = router;
