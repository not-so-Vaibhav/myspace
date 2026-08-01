// backend/middleware/validateAcademicRule.js
// Joi validation middleware for academic rule create / update payloads.
const Joi = require('joi');

const ruleSchema = Joi.object({
    rule_name:          Joi.string().trim().min(3).max(200).required(),
    description:        Joi.string().trim().max(1000).allow('', null).optional(),

    // Scope (all optional – null = global)
    program_id:         Joi.string().uuid().allow(null).optional(),
    academic_year_id:   Joi.string().uuid().allow(null).optional(),
    semester_id:        Joi.string().uuid().allow(null).optional(),

    // Attendance
    min_attendance_percent: Joi.number().min(0).max(100).precision(2).default(75),

    // Academic Performance
    min_sgpa:           Joi.number().min(0).max(10).precision(2).default(5),
    min_credits:        Joi.number().min(0).precision(2).default(0),
    max_backlogs_allowed: Joi.number().integer().min(0).default(2),

    // Credit Requirements
    credits_required_for_promotion:  Joi.number().min(0).precision(2).default(0),
    credits_required_for_graduation: Joi.number().min(0).precision(2).default(0),

    // Policy flags
    allow_atkt:             Joi.boolean().default(true),
    promote_with_backlogs:  Joi.boolean().default(false),
    promotion_policy:       Joi.string().valid('STANDARD', 'STRICT', 'LIBERAL').default('STANDARD'),

    // Graduation requirements (free-form JSON)
    graduation_requirements: Joi.object().default({}),
}).options({ allowUnknown: false });

const updateSchema = ruleSchema.fork(
    ['rule_name'],
    (schema) => schema.optional()
);

function validateCreate(req, res, next) {
    const { error, value } = ruleSchema.validate(req.body, { abortEarly: false });
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

function validateUpdate(req, res, next) {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
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

module.exports = { validateCreate, validateUpdate };
