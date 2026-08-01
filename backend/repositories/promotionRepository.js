// backend/repositories/promotionRepository.js
// Data-access repository layer for Academic Promotion Engine.

const supabase  = require('../config/supabaseClient');
const rulesRepo = require('./academicRulesRepository');
const creditEngine = require('../services/creditEngineService');

function throwIfError({ error }) {
    if (error) throw new Error(error.message);
}

// ── STUDENT METRICS COMPOSITION ───────────────────────────────────────────────

/**
 * Fetch student metrics required for promotion evaluation.
 * Returns safe defaults when optional tables / views are absent.
 */
async function fetchStudentMetrics(studentId) {
    // 1. Core academic metrics (SGPA, CGPA, Credits)
    const academicMetrics = await creditEngine.calculateStudentMetrics(studentId);

    // 5. Active backlogs
    let backlogsCount = 0;
    try {
        const { data: bl, error: bErr } = await supabase
            .from('backlog_records')
            .select('id')
            .eq('student_id', studentId)
            .eq('status', 'PENDING');
        if (!bErr) backlogsCount = (bl || []).length;
    } catch (_) {}

    // 6. Attendance percentage (safe default: 85%)
    let attendancePercent = 85.0;
    try {
        const { data: att } = await supabase
            .from('attendance')
            .select('status')
            .eq('student_id', studentId);
        if (att && att.length > 0) {
            const present = att.filter(a => a.status === 'present').length;
            attendancePercent = parseFloat(((present / att.length) * 100).toFixed(1));
        }
    } catch (_) {}

    return {
        student_id: studentId,
        sgpa: academicMetrics.sgpa,
        cgpa: academicMetrics.cgpa,
        earned_credits: academicMetrics.semester_credits_earned || academicMetrics.credits_earned,
        total_earned_credits: academicMetrics.credits_earned,
        backlogs_count: backlogsCount,
        attendance_percent: attendancePercent,
        is_final_semester: false,
    };
}

/**
 * Resolve effective active academic rule for a given scope.
 * Delegates to academicRulesRepository which implements scope priority logic.
 */
async function fetchActiveRule({ programId, academicYearId, semesterId }) {
    return rulesRepo.findEffectiveRule({
        programId:      programId      || null,
        academicYearId: academicYearId || null,
        semesterId:     semesterId     || null,
    });
}

// ── PROMOTION HISTORY ─────────────────────────────────────────────────────────

async function createPromotionRecord(payload) {
    const result = await supabase
        .from('promotion_history')
        .insert([payload])
        .select(`
            *,
            student:profiles!student_id ( id, full_name ),
            rule:academic_rules!academic_rule_id ( id, rule_name, version )
        `)
        .single();
    throwIfError(result);
    return result.data;
}

async function updatePromotionStatus(id, approvalStatus, remarks, decidedBy) {
    const result = await supabase
        .from('promotion_history')
        .update({
            approval_status: approvalStatus,
            remarks:    remarks    || null,
            decided_by: decidedBy  || null,
            decided_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    throwIfError(result);
    return result.data;
}

async function findPromotionHistory(filters = {}) {
    let query = supabase
        .from('promotion_history')
        .select(`
            *,
            student:profiles!student_id ( id, full_name, role )
        `)
        .order('decided_at', { ascending: false });

    if (filters.studentId)      query = query.eq('student_id', filters.studentId);
    if (filters.approvalStatus) query = query.eq('approval_status', filters.approvalStatus);

    const result = await query;
    throwIfError(result);

    const history = result.data || [];
    const ruleIds = [...new Set(history.map(h => h.academic_rule_id).filter(Boolean))];
    let rulesMap = {};
    if (ruleIds.length > 0) {
        const { data: rules } = await supabase
            .from('academic_rules')
            .select('id, rule_name, version')
            .in('id', ruleIds);
        if (rules) {
            rulesMap = Object.fromEntries(rules.map(r => [r.id, r]));
        }
    }

    return history.map(item => ({
        ...item,
        rule: item.academic_rule_id ? (rulesMap[item.academic_rule_id] || null) : null
    }));
}

// ── SEMESTER HISTORY & NOTIFICATIONS ──────────────────────────────────────────

async function upsertStudentSemesterHistory(payload) {
    const result = await supabase
        .from('student_semester_history')
        .upsert(payload, { onConflict: 'student_id,semester_id' })
        .select();
    if (result.error) console.warn('[Semester History] upsert warning:', result.error.message);
}

async function sendNotification({ userId, title, message, type = 'PROMOTION' }) {
    const result = await supabase
        .from('notifications')
        .insert([{ user_id: userId, title, message, type }]);
    if (result.error) console.warn('[Notification] insert warning:', result.error.message);
}

module.exports = {
    fetchStudentMetrics,
    fetchActiveRule,
    createPromotionRecord,
    updatePromotionStatus,
    findPromotionHistory,
    upsertStudentSemesterHistory,
    sendNotification,
};
