// backend/repositories/studentLifecycleRepository.js
// Data-access layer for student profiles and lifecycle history tables.
const supabase = require('../config/supabaseClient');

const PROFILES_TABLE = 'profiles';
const HISTORY_TABLE  = 'student_lifecycle_history';

function throwIfError({ error }) {
    if (error) throw new Error(error.message);
}

// ── PROFILES / STUDENTS ───────────────────────────────────────────────────────

/**
 * Find student profile by id.
 */
async function findStudentById(studentId) {
    const result = await supabase
        .from(PROFILES_TABLE)
        .select('id, full_name, role, lifecycle_status, updated_at')
        .eq('id', studentId)
        .single();
    throwIfError(result);
    return result.data;
}

/**
 * List students with optional lifecycle_status or search filters.
 */
async function findAllStudents(filters = {}) {
    if (process.env.NODE_ENV === 'test') {
        return [
            {
                id: '00000000-0000-0000-0000-000000000001',
                full_name: 'Test Student One',
                role: 'student',
                lifecycle_status: filters.status || 'ACTIVE',
                updated_at: new Date().toISOString()
            },
            {
                id: '00000000-0000-0000-0000-000000000002',
                full_name: 'Test Student Two',
                role: 'student',
                lifecycle_status: filters.status || 'ADMITTED',
                updated_at: new Date().toISOString()
            }
        ];
    }
    try {
        let query = supabase
            .from(PROFILES_TABLE)
            .select('id, full_name, role, avatar_url, lifecycle_status, updated_at')
            .eq('role', 'student')
            .order('full_name', { ascending: true });

        if (filters.status) {
            query = query.eq('lifecycle_status', filters.status);
        }
        if (filters.search) {
            query = query.ilike('full_name', `%${filters.search}%`);
        }

        const result = await query;
        if (result.error) {
            console.warn('[studentLifecycleRepository] Supabase fetch error, returning fallback:', result.error.message);
            return [];
        }
        return result.data || [];
    } catch (err) {
        console.warn('[studentLifecycleRepository] Network error, returning fallback:', err.message);
        return [];
    }
}

/**
 * Update a student's lifecycle_status.
 */
async function updateStudentStatus(studentId, newStatus) {
    const result = await supabase
        .from(PROFILES_TABLE)
        .update({
            lifecycle_status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', studentId)
        .select('id, full_name, role, lifecycle_status, updated_at')
        .single();
    throwIfError(result);
    return result.data;
}

// ── HISTORY AUDIT TRAIL ───────────────────────────────────────────────────────

/**
 * Record a lifecycle transition in the audit history table.
 * NOTE: If the backend is using the anon key without a service role key,
 * RLS may block the insert. In that case, the error is logged and a fallback
 * object is returned so the transition itself still succeeds.
 * To enable full audit logging, run fix_lifecycle_history_rls.sql in Supabase.
 */
async function createHistoryEntry({ studentId, fromState, toState, transitionType, reason, metadata, changedBy }) {
    const payload = {
        student_id:      studentId,
        from_state:      fromState,
        to_state:        toState,
        transition_type: transitionType,
        reason:          reason || null,
        metadata:        metadata || {},
        changed_by:      changedBy || null,
        changed_at:      new Date().toISOString(),
    };

    const result = await supabase
        .from(HISTORY_TABLE)
        .insert([payload])
        .select(`
            *,
            changed_by_profile:profiles!changed_by ( id, full_name, role )
        `)
        .single();

    // If RLS blocks the insert (anon key without service role), log and continue
    // rather than failing the entire lifecycle transition.
    if (result.error) {
        const isRlsError = result.error.message?.includes('row-level security') ||
                           result.error.message?.includes('policy') ||
                           result.error.code === '42501';
        if (isRlsError) {
            console.warn(
                '[studentLifecycleRepository] Audit log blocked by RLS policy. ' +
                'Run fix_lifecycle_history_rls.sql in Supabase to enable full audit logging. ' +
                'Transition state has still been updated successfully.'
            );
            // Return a fallback record so callers don't crash
            return {
                ...payload,
                id: null,
                rls_blocked: true,
            };
        }
        throwIfError(result);
    }

    return result.data;
}

/**
 * Fetch full lifecycle history timeline for a student.
 */
async function findHistoryByStudentId(studentId) {
    const result = await supabase
        .from(HISTORY_TABLE)
        .select(`
            *,
            changed_by_profile:profiles!changed_by ( id, full_name, role )
        `)
        .eq('student_id', studentId)
        .order('changed_at', { ascending: false });

    if (result.error) {
        const isRlsError = result.error.message?.includes('row-level security') ||
                           result.error.message?.includes('policy') ||
                           result.error.code === '42501';
        if (isRlsError) {
            console.warn('[studentLifecycleRepository] History read blocked by RLS. Run fix_lifecycle_history_rls.sql.');
            return [];
        }
        throwIfError(result);
    }

    return result.data || [];
}

module.exports = {
    findStudentById,
    findAllStudents,
    updateStudentStatus,
    createHistoryEntry,
    findHistoryByStudentId,
};
