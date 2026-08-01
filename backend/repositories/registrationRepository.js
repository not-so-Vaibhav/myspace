// backend/repositories/registrationRepository.js
// Data-access layer for Enterprise Course Registration System tables and views.
const supabase = require('../config/supabaseClient');

const WINDOWS_TABLE   = 'course_registration_windows';
const REG_TABLE       = 'course_registrations';
const AUDIT_TABLE     = 'registration_audit_logs';
const SUBJECTS_TABLE  = 'subjects';
const ALLOC_TABLE     = 'subject_allocations';
const PREREQ_TABLE    = 'prerequisite_subjects';

function throwIfError({ error }) {
    if (error) throw new Error(error.message);
}

// ── REGISTRATION WINDOWS ──────────────────────────────────────────────────────

async function getActiveRegistrationWindow(academicYearId, semesterId) {
    let query = supabase
        .from(WINDOWS_TABLE)
        .select('*')
        .order('end_date', { ascending: false })
        .limit(1);

    if (academicYearId) query = query.eq('academic_year_id', academicYearId);
    if (semesterId) query = query.eq('semester_id', semesterId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data && data.length > 0 ? data[0] : null;
}

async function listRegistrationWindows() {
    const { data, error } = await supabase
        .from(WINDOWS_TABLE)
        .select(`
            *,
            academic_year:academic_years(year_label),
            semester:semesters(term_number)
        `)
        .order('start_date', { ascending: false });
    throwIfError({ error });
    return data || [];
}

async function upsertRegistrationWindow(windowData) {
    const { data, error } = await supabase
        .from(WINDOWS_TABLE)
        .upsert(windowData, { onConflict: 'id' })
        .select('*')
        .single();
    throwIfError({ error });
    return data;
}

// ── STUDENT DISCOVERY & SUBJECTS ─────────────────────────────────────────────

async function findStudentProfile(studentId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .single();
    throwIfError({ error });
    return data;
}

async function findAvailableCoursesForStudent({ departmentId, semesterId, batchId, search, category, facultyId, credits }) {
    // We query v_seat_utilization view which has rich joins and real-time utilization counts
    let query = supabase
        .from('v_seat_utilization')
        .select('*');

    if (semesterId) {
        query = query.eq('semester_id', semesterId);
    }
    if (category) {
        query = query.eq('subject_category', category);
    }
    if (credits) {
        query = query.eq('subject_credits', credits);
    }
    if (search) {
        query = query.or(`subject_code.ilike.%${search}%,subject_name.ilike.%${search}%,faculty_name.ilike.%${search}%`);
    }

    const { data, error } = await query;
    throwIfError({ error });
    return data || [];
}

async function findPrerequisitesForSubject(subjectId) {
    const { data, error } = await supabase
        .from(PREREQ_TABLE)
        .select(`
            id,
            prerequisite_subject_id,
            prerequisite:subjects!prerequisite_subject_id(id, code, name)
        `)
        .eq('subject_id', subjectId);
    throwIfError({ error });
    return (data || []).map(r => r.prerequisite).filter(Boolean);
}

async function findClearedSubjectsForStudent(studentId) {
    const { data, error } = await supabase
        .from('v_student_transcript')
        .select('subject_code, is_cleared, grade_points')
        .eq('student_id', studentId);
    throwIfError({ error });
    return data || [];
}

async function findPendingBacklogsForStudent(studentId) {
    const { data, error } = await supabase
        .from('v_pending_backlogs')
        .select('*')
        .eq('student_id', studentId);
    throwIfError({ error });
    return data || [];
}

// ── COURSE REGISTRATION ACTIONS ──────────────────────────────────────────────

async function findExistingRegistration(studentId, allocationId) {
    const { data, error } = await supabase
        .from(REG_TABLE)
        .select('*')
        .eq('student_id', studentId)
        .eq('allocation_id', allocationId)
        .maybeSingle();
    throwIfError({ error });
    return data;
}

async function findStudentRegistrations(studentId, semesterId) {
    let query = supabase
        .from(REG_TABLE)
        .select(`
            id,
            student_id,
            allocation_id,
            subject_id,
            semester_id,
            category,
            credits,
            status,
            registered_at,
            dropped_at,
            override_reason,
            allocation:subject_allocations(
                id,
                batch:batches(name),
                faculty:profiles(id, full_name, email),
                subject:subjects(id, code, name, type, credits, category)
            )
        `)
        .eq('student_id', studentId)
        .order('registered_at', { ascending: false });

    if (semesterId) {
        query = query.eq('semester_id', semesterId);
    }

    const { data, error } = await query;
    throwIfError({ error });
    return data || [];
}

async function createRegistration(regData) {
    const { data, error } = await supabase
        .from(REG_TABLE)
        .insert(regData)
        .select('*')
        .single();
    throwIfError({ error });
    return data;
}

async function updateRegistrationStatus(id, status, overrideReason = null) {
    const updatePayload = {
        status,
        ...(status === 'DROPPED' ? { dropped_at: new Date().toISOString() } : {}),
        ...(overrideReason ? { override_reason: overrideReason } : {})
    };
    const { data, error } = await supabase
        .from(REG_TABLE)
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();
    throwIfError({ error });
    return data;
}

// ── FACULTY DASHBOARD QUERIES ────────────────────────────────────────────────

async function findFacultyAllocatedCourses(facultyId) {
    const { data, error } = await supabase
        .from('v_seat_utilization')
        .select('*')
        .ilike('faculty_name', `%`) // returns all, filter in service if faculty_name matches or let's join subject_allocations
        .order('subject_code', { ascending: true });
    throwIfError({ error });

    // Filter by faculty_id via subject_allocations
    const { data: allocs, error: aErr } = await supabase
        .from(ALLOC_TABLE)
        .select('id')
        .eq('faculty_id', facultyId);
    throwIfError({ error: aErr });
    const myAllocIds = new Set((allocs || []).map(a => a.id));

    return (data || []).filter(r => myAllocIds.has(r.allocation_id));
}

async function findStudentsInCourse(allocationId) {
    const { data, error } = await supabase
        .from(REG_TABLE)
        .select(`
            id,
            student_id,
            status,
            registered_at,
            credits,
            student:profiles!student_id(id, full_name, email, department, semester, enrollment_no)
        `)
        .eq('allocation_id', allocationId)
        .in('status', ['REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE', 'PENDING_APPROVAL'])
        .order('registered_at', { ascending: true });
    throwIfError({ error });
    return data || [];
}

// ── AUDIT LOGGING ────────────────────────────────────────────────────────────

async function insertAuditLog(logData) {
    const { data, error } = await supabase
        .from(AUDIT_TABLE)
        .insert(logData)
        .select('*')
        .single();
    if (error) {
        console.error('Audit log insert failed:', error.message);
    }
    return data || null;
}

async function listAuditLogs(filters = {}) {
    let query = supabase
        .from(AUDIT_TABLE)
        .select(`
            *,
            student:profiles!student_id(full_name, email),
            performed_by_user:profiles!performed_by(full_name, email, role)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

    if (filters.action) query = query.eq('action', filters.action);
    if (filters.studentId) query = query.eq('student_id', filters.studentId);

    const { data, error } = await query;
    throwIfError({ error });
    return data || [];
}

// ── ADMIN ANALYTICS ──────────────────────────────────────────────────────────

async function getAnalyticsSummary() {
    const [
        { data: deptAnalytics, error: err1 },
        { data: electivePopularity, error: err2 },
        { data: seatUtilization, error: err3 },
        { data: unregisteredStudents, error: err4 },
        { data: allRegs, error: err5 }
    ] = await Promise.all([
        supabase.from('v_course_registration_analytics').select('*'),
        supabase.from('v_elective_popularity').select('*').limit(15),
        supabase.from('v_seat_utilization').select('*').limit(30),
        supabase.from('v_unregistered_students').select('*').limit(50),
        supabase.from(REG_TABLE).select('status, category, credits')
    ]);

    throwIfError({ error: err1 });
    throwIfError({ error: err2 });
    throwIfError({ error: err3 });
    throwIfError({ error: err4 });
    throwIfError({ error: err5 });

    const totalRegistrations = (allRegs || []).length;
    const activeRegistrations = (allRegs || []).filter(r => ['REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE'].includes(r.status));

    return {
        departmentStats: deptAnalytics || [],
        electivePopularity: electivePopularity || [],
        seatUtilization: seatUtilization || [],
        unregisteredStudents: unregisteredStudents || [],
        overallSummary: {
            totalRegistrations,
            activeRegistrationsCount: activeRegistrations.length,
            totalCreditsRegistered: activeRegistrations.reduce((sum, r) => sum + parseFloat(r.credits || 0), 0)
        }
    };
}

module.exports = {
    getActiveRegistrationWindow,
    listRegistrationWindows,
    upsertRegistrationWindow,
    findStudentProfile,
    findAvailableCoursesForStudent,
    findPrerequisitesForSubject,
    findClearedSubjectsForStudent,
    findPendingBacklogsForStudent,
    findExistingRegistration,
    findStudentRegistrations,
    createRegistration,
    updateRegistrationStatus,
    findFacultyAllocatedCourses,
    findStudentsInCourse,
    insertAuditLog,
    listAuditLogs,
    getAnalyticsSummary
};
