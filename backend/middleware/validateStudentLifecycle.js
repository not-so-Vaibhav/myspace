// backend/middleware/validateStudentLifecycle.js
// Joi validation middleware for Student Lifecycle state transition endpoints.

const Joi = require('joi');
const { STATES } = require('../services/lifecycleStateMachine');

const validStatesList = Object.values(STATES);

const transitionSchema = Joi.object({
    target_state:    Joi.string().valid(...validStatesList).required(),
    transition_type: Joi.string().valid('AUTOMATIC', 'MANUAL').default('MANUAL'),
    reason:          Joi.string().trim().max(500).allow('', null).optional(),
    metadata:        Joi.object().default({}),
});

const overrideSchema = Joi.object({
    target_state: Joi.string().valid(...validStatesList).required(),
    reason:       Joi.string().trim().min(5).max(500).required()
        .messages({
            'string.empty': 'An override reason is mandatory.',
            'string.min': 'Override reason must be at least 5 characters long.',
            'any.required': 'An override reason is mandatory.'
        }),
    metadata:     Joi.object().default({}),
});

function validateTransitionReq(req, res, next) {
    const { error, value } = transitionSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(422).json({
            status: 'error',
            message: 'Validation failed',
            details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
        });
    }
    req.validatedBody = value;
    next();
}

function validateOverrideReq(req, res, next) {
    const { error, value } = overrideSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(422).json({
            status: 'error',
            message: 'Validation failed',
            details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
        });
    }
    req.validatedBody = value;
    next();
}

module.exports = { validateTransitionReq, validateOverrideReq };
