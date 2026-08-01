// backend/services/academicRulesService.js
// Business logic layer: versioning, validation orchestration, audit helpers.
const repo = require('../repositories/academicRulesRepository');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strip DB-managed / read-only fields from incoming payload.
 */
function sanitizePayload(payload) {
    const {
        id, created_at, updated_at, version,
        program, academic_year, semester,  // joined relations – not columns
        ...clean
    } = payload;
    return clean;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * List all rules, optionally scoped.
 */
async function listRules(filters = {}) {
    return repo.findAll({
        programId:      filters.programId,
        academicYearId: filters.academicYearId,
        semesterId:     filters.semesterId,
        isActive:       filters.isActive !== undefined ? filters.isActive : undefined,
    });
}

/**
 * Get a single rule by id.
 */
async function getRuleById(id) {
    const rule = await repo.findById(id);
    if (!rule) throw Object.assign(new Error('Rule not found'), { status: 404 });
    return rule;
}

/**
 * Resolve the effective rule for a given academic context.
 */
async function getEffectiveRule({ programId, academicYearId, semesterId }) {
    const rule = await repo.findEffectiveRule({ programId, academicYearId, semesterId });
    if (!rule) throw Object.assign(new Error('No active rule found for this scope'), { status: 404 });
    return rule;
}

/**
 * Create a new rule at version 1.
 * Ensures no other active rule exists for the exact same scope.
 */
async function createRule(payload, createdBy) {
    // Scope conflict check
    const existing = await repo.findAll({
        programId:      payload.program_id      || null,
        academicYearId: payload.academic_year_id || null,
        semesterId:     payload.semester_id      || null,
        isActive:       true,
    });

    if (existing.length > 0) {
        throw Object.assign(
            new Error('An active rule already exists for this scope. Deactivate it first, or create a new version.'),
            { status: 409 }
        );
    }

    const clean = sanitizePayload(payload);
    return repo.create({ ...clean, version: 1, is_active: true, created_by: createdBy, updated_by: createdBy });
}

/**
 * Update a rule.
 * Strategy: increment the version number; the audit trigger records a snapshot automatically.
 */
async function updateRule(id, payload, updatedBy) {
    const existing = await getRuleById(id);

    const clean = sanitizePayload(payload);
    const newVersion = existing.version + 1;

    return repo.update(id, { ...clean, version: newVersion, updated_by: updatedBy });
}

/**
 * Activate a rule (and optionally deactivate sibling rules for the same scope).
 */
async function activateRule(id, updatedBy) {
    const rule = await getRuleById(id);

    // Deactivate any sibling active rules for the same scope first
    const siblings = await repo.findAll({
        programId:      rule.program_id,
        academicYearId: rule.academic_year_id,
        semesterId:     rule.semester_id,
        isActive:       true,
    });

    for (const sibling of siblings) {
        if (sibling.id !== id) {
            await repo.setActiveState(sibling.id, false, updatedBy);
        }
    }

    return repo.setActiveState(id, true, updatedBy);
}

/**
 * Deactivate a rule.
 */
async function deactivateRule(id, updatedBy) {
    await getRuleById(id);
    return repo.setActiveState(id, false, updatedBy);
}

/**
 * Hard delete a rule (prefer deactivate for compliance).
 */
async function deleteRule(id) {
    await getRuleById(id);
    await repo.remove(id);
    return { message: 'Rule permanently deleted' };
}

// ── HISTORY / VERSIONING ──────────────────────────────────────────────────────

/**
 * Fetch full audit history for a rule.
 */
async function getRuleHistory(id) {
    await getRuleById(id); // validate existence
    return repo.findHistory(id);
}

// ── REFERENCE DATA ────────────────────────────────────────────────────────────

async function getReferenceData() {
    const [programs, academicYears, semesters] = await Promise.all([
        repo.fetchPrograms(),
        repo.fetchAcademicYears(),
        repo.fetchSemesters(),
    ]);
    return { programs, academicYears, semesters };
}

module.exports = {
    listRules,
    getRuleById,
    getEffectiveRule,
    createRule,
    updateRule,
    activateRule,
    deactivateRule,
    deleteRule,
    getRuleHistory,
    getReferenceData,
};
