// backend/routes/graduationRoutes.js
const express = require('express');
const router = express.Router();
const graduationController = require('../controllers/graduationController');
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

const processSchema = Joi.object({
    force: Joi.boolean().default(false),
    remarks: Joi.string().allow('').optional()
});

router.get('/eligibility/:studentId', graduationController.checkEligibility);
router.post('/process/:studentId', validateRequest(processSchema), graduationController.processGraduation);

module.exports = router;
