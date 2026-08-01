// backend/repositories/academicRulesRepository.js
// Pure data-access layer.  No business logic here – only Supabase queries.
const supabase = require('../config/supabaseClient');

const TABLE       = 'academic_rules';
const HISTORY_TABLE = 'academic_rule_history';

// ── Helpers ──────────────────────────────────────────────────────────────────
function throwIfError({ error }) {
    if (error) throw new Error(error.message);
}

// ── SELECT ────────────────────────────────────────────────────────────────────

/**
 * Fetch all rules (optionally filtered by scope).
 * @param {object} filters  { programId, academicYearId, semesterId, isActive }
 */
async function findAll(filters = {}) {
    let query = supabase
        .from(TABLE)
        .select(`
            *,
            program:programs ( id, name, code ),
            academic_year:academic_years ( id, year_level ),
            semester:semesters ( id, term_number )
        `)
        .order('created_at', { ascending: false });

    if (filters.programId !== undefined) {
        if (filters.programId === null) query = query.is('program_id', null);
        else query = query.eq('program_id', filters.programId);
    }
    if (filters.academicYearId !== undefined) {
        if (filters.academicYearId === null) query = query.is('academic_year_id', null);
        else query = query.eq('academic_year_id', filters.academicYearId);
    }
    if (filters.semesterId !== undefined) {
        if (filters.semesterId === null) query = query.is('semester_id', null);
        else query = query.eq('semester_id', filters.semesterId);
    }
    if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);

    const result = await query;
    throwIfError(result);
    return result.data;
}

/**
 * Find a single rule by primary key.
 */
async function findById(id) {
    const result = await supabase
        .from(TABLE)
        .select(`
            *,
            program:programs ( id, name, code ),
            academic_year:academic_years ( id, year_level ),
            semester:semesters ( id, term_number )
        `)
        .eq('id', id)
        .maybeSingle();
    throwIfError(result);
    return result.data;
}

/**
 * Resolve the effective rule for a given scope (most specific wins).
 * Priority: program+year+semester > program+year > program > global default
 */
async function findEffectiveRule({ programId, academicYearId, semesterId }) {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('is_active', true)
        .or(
            `and(program_id.eq.${programId},academic_year_id.eq.${academicYearId},semester_id.eq.${semesterId}),` +
            `and(program_id.eq.${programId},academic_year_id.eq.${academicYearId},semester_id.is.null),` +
            `and(program_id.eq.${programId},academic_year_id.is.null,semester_id.is.null),` +
            `and(program_id.is.null,academic_year_id.is.null,semester_id.is.null)`
        )
        .order('program_id', { ascending: false, nullsFirst: false })
        .order('academic_year_id', { ascending: false, nullsFirst: false })
        .order('semester_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data || null;
}

// ── INSERT ────────────────────────────────────────────────────────────────────

async function create(payload) {
    const result = await supabase
        .from(TABLE)
        .insert([payload])
        .select()
        .single();
    throwIfError(result);
    return result.data;
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

async function update(id, payload) {
    const result = await supabase
        .from(TABLE)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
    throwIfError(result);
    return result.data;
}

// ── ACTIVATE / DEACTIVATE ─────────────────────────────────────────────────────

async function setActiveState(id, isActive, updatedBy) {
    const result = await supabase
        .from(TABLE)
        .update({ is_active: isActive, updated_by: updatedBy })
        .eq('id', id)
        .select()
        .single();
    throwIfError(result);
    return result.data;
}

// ── DELETE (soft: deactivate; hard: remove) ───────────────────────────────────

async function remove(id) {
    const result = await supabase
        .from(TABLE)
        .delete()
        .eq('id', id);
    throwIfError(result);
}

// ── HISTORY ───────────────────────────────────────────────────────────────────

async function findHistory(ruleId) {
    const result = await supabase
        .from(HISTORY_TABLE)
        .select(`
            *,
            changed_by_profile:profiles!changed_by ( id, full_name, role )
        `)
        .eq('rule_id', ruleId)
        .order('changed_at', { ascending: false });
    throwIfError(result);
    return result.data;
}

// ── REFERENCE DATA ────────────────────────────────────────────────────────────

async function fetchPrograms() {
    const r = await supabase.from('programs').select('id, name, code').eq('status', 'active').order('name');
    throwIfError(r);
    return r.data;
}

async function fetchAcademicYears() {
    const r = await supabase.from('academic_years').select('id, year_level').order('year_level', { ascending: false });
    throwIfError(r);
    return r.data;
}

async function fetchSemesters() {
    const r = await supabase.from('semesters').select('id, term_number').order('term_number');
    throwIfError(r);
    return r.data;
}

module.exports = {
    findAll,
    findById,
    findEffectiveRule,
    create,
    update,
    setActiveState,
    remove,
    findHistory,
    fetchPrograms,
    fetchAcademicYears,
    fetchSemesters,
};
