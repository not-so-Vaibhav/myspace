// backend/routes/academicRulesRoutes.js
// Express router for the Academic Rules Engine.
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/academicRulesController');
const { validateCreate, validateUpdate } = require('../middleware/validateAcademicRule');

// ── Reference / utility endpoints (no :id ambiguity) ─────────
router.get('/reference', ctrl.getReference);    // GET /api/academic-rules/reference
router.get('/effective', ctrl.getEffective);    // GET /api/academic-rules/effective?program_id=&...

// ── Collection endpoints ──────────────────────────────────────
router.get('/',  ctrl.index);                   // GET  /api/academic-rules
router.post('/', validateCreate, ctrl.create);  // POST /api/academic-rules

// ── Member endpoints ─────────────────────────────────────────
router.get('/:id',             ctrl.show);                         // GET    /api/academic-rules/:id
router.put('/:id',             validateUpdate, ctrl.update);       // PUT    /api/academic-rules/:id
router.delete('/:id',          ctrl.destroy);                      // DELETE /api/academic-rules/:id
router.patch('/:id/activate',  ctrl.activate);                     // PATCH  /api/academic-rules/:id/activate
router.patch('/:id/deactivate', ctrl.deactivate);                  // PATCH  /api/academic-rules/:id/deactivate
router.get('/:id/history',     ctrl.history);                      // GET    /api/academic-rules/:id/history

module.exports = router;
