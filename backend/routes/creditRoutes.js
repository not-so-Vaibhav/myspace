// backend/routes/creditRoutes.js
const express = require('express');
const router = express.Router();
const creditController = require('../controllers/creditController');
// Using existing simple validate schema or Joi if needed
const Joi = require('joi');

const validateRequest = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(422).json({
            status: 'error',
            message: 'Validation failed',
            details: error.details.map(d => d.message)
        });
    }
    next();
};

const recalculateSchema = Joi.object({
    semesterId: Joi.string().uuid().required()
});

// ── EXISTING ROUTES (ZERO REGRESSION) ─────────────────────────────────────────
router.get('/metrics/:studentId', creditController.getStudentMetrics);
router.post('/recalculate/:studentId', validateRequest(recalculateSchema), creditController.recalculateMetrics);
router.get('/transcript/:studentId', creditController.getTranscript);

// ── PHASE 5 ENTERPRISE ACADEMIC CREDIT SYSTEM ROUTES ──────────────────────────
router.get('/student/:studentId/summary', creditController.getStudentCreditSummary);
router.get('/summary/:studentId', creditController.getStudentCreditSummary);
router.post('/validate-registration', creditController.validateRegistrationCredits);
router.get('/rules', creditController.getCreditRules);
router.post('/rules', creditController.upsertCreditRule);
router.put('/rules/:id', creditController.upsertCreditRule);
router.get('/reports/:type', creditController.getCreditReports);
router.post('/admin/bulk-recalculate', creditController.bulkRecalculateCredits);
router.get('/student/:studentId/graduation-status', creditController.getStudentCreditSummary);

module.exports = router;
