// backend/routes/promotionRoutes.js
// Express router for the Academic Promotion Engine.

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/promotionController');
const { validateEvaluateReq, validateApproveReq } = require('../middleware/validatePromotion');

router.post('/evaluate', validateEvaluateReq, ctrl.evaluate); // POST /api/academic-promotion/evaluate
router.post('/:id/approve', validateApproveReq, ctrl.approve); // POST /api/academic-promotion/:id/approve
router.get('/history', ctrl.history);                         // GET  /api/academic-promotion/history

module.exports = router;
