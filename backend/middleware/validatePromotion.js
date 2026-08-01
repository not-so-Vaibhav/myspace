// backend/middleware/validatePromotion.js
// Joi validation middleware for Academic Promotion Engine requests.

const Joi = require('joi');

const evaluateSchema = Joi.object({
    student_id:            Joi.string().uuid().required(),
    from_semester_id:      Joi.string().uuid().required(),
    from_academic_year_id: Joi.string().uuid().required(),
    to_semester_id:        Joi.string().uuid().allow(null).optional(),
    to_academic_year_id:   Joi.string().uuid().allow(null).optional(),
    auto_approve:          Joi.boolean().default(true),
});

const approveSchema = Joi.object({
    remarks: Joi.string().trim().max(500).allow('', null).optional(),
});

function validateEvaluateReq(req, res, next) {
    const { error, value } = evaluateSchema.validate(req.body, { abortEarly: false });
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

function validateApproveReq(req, res, next) {
    const { error, value } = approveSchema.validate(req.body, { abortEarly: false });
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

module.exports = { validateEvaluateReq, validateApproveReq };
