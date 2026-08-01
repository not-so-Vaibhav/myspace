// backend/controllers/academicRulesController.js
// Thin HTTP layer: parse request → call service → return response.
const service = require('../services/academicRulesService');

// Helper to extract caller identity (from JWT or a simple header in dev)
function getCallerId(req) {
    return req.user?.id || req.headers['x-user-id'] || null;
}

// ── GET /api/academic-rules ───────────────────────────────────
async function index(req, res, next) {
    try {
        const filters = {
            programId:      req.query.program_id,
            academicYearId: req.query.academic_year_id,
            semesterId:     req.query.semester_id,
            isActive:       req.query.is_active === undefined ? undefined : req.query.is_active === 'true',
        };
        const rules = await service.listRules(filters);
        res.json({ status: 'ok', count: rules.length, data: rules });
    } catch (err) {
        next(err);
    }
}

// ── GET /api/academic-rules/effective ────────────────────────
async function getEffective(req, res, next) {
    try {
        const { program_id, academic_year_id, semester_id } = req.query;
        if (!program_id) return res.status(400).json({ status: 'error', message: 'program_id is required' });

        const rule = await service.getEffectiveRule({
            programId: program_id,
            academicYearId: academic_year_id || null,
            semesterId: semester_id || null,
        });
        res.json({ status: 'ok', data: rule });
    } catch (err) {
        next(err);
    }
}

// ── GET /api/academic-rules/reference ────────────────────────
async function getReference(req, res, next) {
    try {
        const data = await service.getReferenceData();
        res.json({ status: 'ok', data });
    } catch (err) {
        next(err);
    }
}

// ── GET /api/academic-rules/:id ───────────────────────────────
async function show(req, res, next) {
    try {
        const rule = await service.getRuleById(req.params.id);
        res.json({ status: 'ok', data: rule });
    } catch (err) {
        next(err);
    }
}

// ── GET /api/academic-rules/:id/history ───────────────────────
async function history(req, res, next) {
    try {
        const logs = await service.getRuleHistory(req.params.id);
        res.json({ status: 'ok', count: logs.length, data: logs });
    } catch (err) {
        next(err);
    }
}

// ── POST /api/academic-rules ──────────────────────────────────
async function create(req, res, next) {
    try {
        const rule = await service.createRule(req.validatedBody, getCallerId(req));
        res.status(201).json({ status: 'ok', message: 'Rule created', data: rule });
    } catch (err) {
        next(err);
    }
}

// ── PUT /api/academic-rules/:id ───────────────────────────────
async function update(req, res, next) {
    try {
        const rule = await service.updateRule(req.params.id, req.validatedBody, getCallerId(req));
        res.json({ status: 'ok', message: 'Rule updated', data: rule });
    } catch (err) {
        next(err);
    }
}

// ── PATCH /api/academic-rules/:id/activate ───────────────────
async function activate(req, res, next) {
    try {
        const rule = await service.activateRule(req.params.id, getCallerId(req));
        res.json({ status: 'ok', message: 'Rule activated', data: rule });
    } catch (err) {
        next(err);
    }
}

// ── PATCH /api/academic-rules/:id/deactivate ─────────────────
async function deactivate(req, res, next) {
    try {
        const rule = await service.deactivateRule(req.params.id, getCallerId(req));
        res.json({ status: 'ok', message: 'Rule deactivated', data: rule });
    } catch (err) {
        next(err);
    }
}

// ── DELETE /api/academic-rules/:id ───────────────────────────
async function destroy(req, res, next) {
    try {
        const result = await service.deleteRule(req.params.id);
        res.json({ status: 'ok', ...result });
    } catch (err) {
        next(err);
    }
}

module.exports = { index, getEffective, getReference, show, history, create, update, activate, deactivate, destroy };
