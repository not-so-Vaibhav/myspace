// backend/routes/studentLifecycleRoutes.js
// Express router for the Student Lifecycle Engine.

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/studentLifecycleController');
const { validateTransitionReq, validateOverrideReq } = require('../middleware/validateStudentLifecycle');

// ── Static / Collection routes ────────────────────────────────────────────────
router.get('/students', ctrl.listStudents);      // GET /api/student-lifecycle/students
router.get('/states',   ctrl.getStatesMatrix);   // GET /api/student-lifecycle/states

// ── Member routes (student-specific) ──────────────────────────────────────────
router.get('/:studentId',          ctrl.getStudentLifecycle);                        // GET  /api/student-lifecycle/:studentId
router.get('/:studentId/history',  ctrl.getHistory);                                 // GET  /api/student-lifecycle/:studentId/history
router.post('/:studentId/transition', validateTransitionReq, ctrl.transition);       // POST /api/student-lifecycle/:studentId/transition
router.post('/:studentId/override',   validateOverrideReq,   ctrl.override);         // POST /api/student-lifecycle/:studentId/override

module.exports = router;
