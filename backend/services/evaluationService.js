// backend/services/evaluationService.js
// Enterprise Subject Evaluation & Continuous Assessment (CA) Engine
// Handles Excel-like marks entry, real attendance percentage integration,
// dynamic TA-1/2/3 vs PAB-1/2/3 subunits, locking, student result sync, and admin analytics.

const supabase = require('../config/supabaseClient');

function throwIfError({ error }) {
    if (error) throw new Error(error.message);
}

// Default standard max marks configuration
const DEFAULT_MAX_MARKS = {
    ca_attendance: 5,
    ca_sub_1: 10, // TA-1 for Theory, PAB-1 for Practical
    ca_sub_2: 10, // TA-2 for Theory, PAB-2 for Practical
    ca_sub_3: 15, // TA-3 for Theory, PAB-3 for Practical
    ca_total: 40,
    exam: 60,     // Theory Exam or Practical Exam
    total: 100
};

/**
 * 1. Get all subject allocations for a faculty member with enrollment count & evaluation progress
 */
async function getFacultyAllocations(facultyId, customClient = null) {
    const db = customClient || supabase;

    if (!facultyId) {
        throw new Error('Faculty ID is required');
    }

    // Query subject allocations with nested relations
    const { data: allocations, error } = await db
        .from('subject_allocations')
        .select(`
            id,
            subject_id,
            batch_id,
            semester_id,
            faculty_id,
            created_at,
            subject:subjects(id, name, code, credits, type, department_id),
            batch:batches(id, name),
            semester:semesters(id, term_number, academic_year_id, academic_year:academic_years(id, year_level, label))
        `)
        .eq('faculty_id', facultyId)
        .order('created_at', { ascending: false });

    throwIfError({ error });

    if (!allocations || allocations.length === 0) {
        return [];
    }

    const allocIds = allocations.map(a => a.id);

    // Fetch enrollments count per allocation
    const { data: enrollments, error: enrollError } = await db
        .from('student_enrollments')
        .select('id, allocation_id')
        .in('allocation_id', allocIds);

    throwIfError({ error: enrollError });

    // Fetch evaluations count per allocation
    const { data: existingEvals, error: evalError } = await db
        .from('subject_evaluations')
        .select('id, allocation_id, is_locked, total_marks')
        .in('allocation_id', allocIds);

    // Group counts
    const enrollmentCounts = {};
    const evalCounts = {};
    const lockedStatus = {};

    (enrollments || []).forEach(e => {
        enrollmentCounts[e.allocation_id] = (enrollmentCounts[e.allocation_id] || 0) + 1;
    });

    (existingEvals || []).forEach(ev => {
        evalCounts[ev.allocation_id] = (evalCounts[ev.allocation_id] || 0) + 1;
        if (ev.is_locked) {
            lockedStatus[ev.allocation_id] = true;
        }
    });

    return allocations.map(alloc => {
        const totalEnrolled = enrollmentCounts[alloc.id] || 0;
        const totalGraded = evalCounts[alloc.id] || 0;
        const isLocked = !!lockedStatus[alloc.id];
        const subjectType = alloc.subject?.type || 'Theory';

        return {
            id: alloc.id,
            subject_id: alloc.subject_id,
            subject_name: alloc.subject?.name || 'Untitled Subject',
            subject_code: alloc.subject?.code || 'N/A',
            subject_type: subjectType,
            credits: alloc.subject?.credits || 0,
            batch_id: alloc.batch_id,
            batch_name: alloc.batch?.name || 'All Batches',
            semester_id: alloc.semester_id,
            semester_term: alloc.semester?.term_number || 1,
            year_level: alloc.semester?.academic_year?.year_level || 'FY',
            total_enrolled: totalEnrolled,
            total_graded: totalGraded,
            is_locked: isLocked,
            status: totalGraded === 0 ? 'NOT_STARTED' : (totalGraded >= totalEnrolled && totalEnrolled > 0 ? 'COMPLETED' : 'IN_PROGRESS'),
            ca_sub_label: subjectType === 'Practical' ? 'PAB' : 'TA',
            exam_label: subjectType === 'Practical' ? 'Practical Exam' : 'Theory Exam'
        };
    });
}

/**
 * 2. Get full Excel-like Evaluation Spreadsheet data for an allocation
 * Computes live attendance percentage from real attendance system
 */
async function getEvaluationSheet(allocationId, facultyId = null, customClient = null) {
    const db = customClient || supabase;

    if (!allocationId) {
        throw new Error('Allocation ID is required');
    }

    // 1. Get Allocation Details
    const { data: allocation, error: allocError } = await db
        .from('subject_allocations')
        .select(`
            id,
            subject_id,
            batch_id,
            semester_id,
            faculty_id,
            subject:subjects(id, name, code, credits, type),
            batch:batches(id, name),
            semester:semesters(id, term_number, academic_year_id, academic_year:academic_years(id, year_level)),
            faculty:profiles!faculty_id(id, full_name, email)
        `)
        .eq('id', allocationId)
        .single();

    throwIfError({ error: allocError });

    if (!allocation) {
        throw new Error('Subject allocation not found');
    }

    const subjectType = allocation.subject?.type || 'Theory';
    const isPractical = subjectType.toLowerCase() === 'practical';

    // 2. Fetch all enrolled students for this allocation
    const { data: enrollments, error: enrollError } = await db
        .from('student_enrollments')
        .select(`
            id,
            student_id,
            enrolled_at,
            student:profiles!student_id(id, full_name, email, enrollment_no, department, avatar_url)
        `)
        .eq('allocation_id', allocationId);

    throwIfError({ error: enrollError });

    // 3. Fetch real attendance sessions & student attendance records for this allocation
    const { data: sessions, error: sessionError } = await db
        .from('attendance_sessions')
        .select('id, session_date, session_time')
        .eq('allocation_id', allocationId);

    const totalSessions = (sessions && !sessionError) ? sessions.length : 0;
    const sessionIds = (sessions || []).map(s => s.id);

    let records = [];
    if (sessionIds.length > 0) {
        const { data: attRecords, error: recordError } = await db
            .from('attendance_records')
            .select('session_id, student_id, status')
            .in('session_id', sessionIds);

        if (!recordError && attRecords) {
            records = attRecords;
        }
    }

    // Map attended count per student
    const studentAttendedMap = {};
    records.forEach(r => {
        if (r.status === 'present') {
            studentAttendedMap[r.student_id] = (studentAttendedMap[r.student_id] || 0) + 1;
        }
    });

    // 4. Fetch existing evaluation marks for this allocation
    const { data: existingEvaluations, error: evalError } = await db
        .from('subject_evaluations')
        .select('*')
        .eq('allocation_id', allocationId);

    const evalMap = {};
    let isSheetLocked = false;
    let maxMarksConfig = DEFAULT_MAX_MARKS;

    (existingEvaluations || []).forEach(ev => {
        evalMap[ev.student_id] = ev;
        if (ev.is_locked) isSheetLocked = true;
        if (ev.max_marks_config) maxMarksConfig = ev.max_marks_config;
    });

    // 5. Construct merged spreadsheet rows
    const students = (enrollments || []).map((enrollment, index) => {
        const st = enrollment.student || {};
        const studentId = enrollment.student_id;
        const attended = studentAttendedMap[studentId] || 0;
        
        // Calculate real attendance %
        const attendancePct = totalSessions > 0 
            ? Number(((attended / totalSessions) * 100).toFixed(1)) 
            : 100.0;

        const ev = evalMap[studentId] || null;

        const suggestedAttMarks = attendancePct >= 90 ? 5 : (attendancePct >= 80 ? 4 : (attendancePct >= 75 ? 3 : (attendancePct >= 65 ? 2 : 0)));

        const ca_attendance_marks = ev ? Number(ev.ca_attendance_marks) : 0;
        const ca_sub_1 = ev ? Number(ev.ca_sub_1) : 0;
        const ca_sub_2 = ev ? Number(ev.ca_sub_2) : 0;
        const ca_sub_3 = ev ? Number(ev.ca_sub_3) : 0;
        const ca_total = ev ? Number(ev.ca_total) : (ca_attendance_marks + ca_sub_1 + ca_sub_2 + ca_sub_3);
        const exam_marks = ev ? Number(ev.exam_marks) : 0;
        const total_marks = ev ? Number(ev.total_marks) : (ca_total + exam_marks);
        const grade = ev ? ev.grade : (total_marks >= 40 ? 'B' : 'F');
        const is_pass = ev ? ev.is_pass : total_marks >= 40;

        return {
            row_index: index + 1,
            student_id: studentId,
            enrollment_id: enrollment.id,
            student_name: st.full_name || 'Unnamed Student',
            enrollment_no: st.enrollment_no || `MIT-${studentId.substring(0, 7).toUpperCase()}`,
            email: st.email || '',
            department: st.department || 'Engineering',
            batch_name: allocation.batch?.name || 'B1',
            year_level: allocation.semester?.academic_year?.year_level || 'FY',
            semester_term: allocation.semester?.term_number || 1,
            
            // Attendance metrics
            total_sessions: totalSessions,
            attended_sessions: attended,
            attendance_pct: attendancePct,
            suggested_attendance_marks: suggestedAttMarks,

            // CA & Exam Marks
            evaluation_id: ev ? ev.id : null,
            ca_attendance_marks: ca_attendance_marks,
            ca_sub_1: ca_sub_1,
            ca_sub_2: ca_sub_2,
            ca_sub_3: ca_sub_3,
            ca_total: ca_total,
            exam_marks: exam_marks,
            total_marks: total_marks,
            grade: grade,
            grade_points: ev ? ev.grade_points : null,
            is_pass: is_pass,
            is_locked: ev ? ev.is_locked : false,
            remarks: ev ? ev.remarks : ''
        };
    });

    students.sort((a, b) => a.student_name.localeCompare(b.student_name));

    return {
        allocation: {
            id: allocation.id,
            subject_id: allocation.subject_id,
            subject_name: allocation.subject?.name || 'Subject',
            subject_code: allocation.subject?.code || '',
            subject_type: subjectType,
            is_practical: isPractical,
            credits: allocation.subject?.credits || 0,
            batch_id: allocation.batch_id,
            batch_name: allocation.batch?.name || 'All Batches',
            semester_id: allocation.semester_id,
            semester_term: allocation.semester?.term_number || 1,
            year_level: allocation.semester?.academic_year?.year_level || 'FY',
            faculty_id: allocation.faculty_id,
            faculty_name: allocation.faculty?.full_name || 'Assigned Faculty',
            is_locked: isSheetLocked,
            total_sessions: totalSessions,
            total_enrolled: students.length,
            ca_sub_label: isPractical ? 'PAB' : 'TA',
            exam_label: isPractical ? 'Practical Exam' : 'Theory Exam'
        },
        max_marks_config: maxMarksConfig,
        students
    };
}

/**
 * 3. Batch Save / Upsert Evaluations for an Allocation
 */
async function saveBatchEvaluations(allocationId, records, facultyId, maxMarksConfig = DEFAULT_MAX_MARKS, customClient = null) {
    const db = customClient || supabase;

    if (!allocationId) {
        throw new Error('Allocation ID is required');
    }
    if (!Array.isArray(records) || records.length === 0) {
        throw new Error('Records array is required and cannot be empty');
    }

    // Verify allocation exists
    const { data: allocation, error: allocError } = await db
        .from('subject_allocations')
        .select('id, subject_id, batch_id, semester_id, faculty_id, subject:subjects(type)')
        .eq('id', allocationId)
        .single();

    throwIfError({ error: allocError });

    const subjectType = allocation.subject?.type || 'Theory';

    // Prepare rows for upsert
    const upsertRows = records.map(r => {
        const ca_attendance = Math.max(0, Math.min(Number(r.ca_attendance_marks) || 0, maxMarksConfig.ca_attendance || 5));
        const ca_1 = Math.max(0, Math.min(Number(r.ca_sub_1) || 0, maxMarksConfig.ca_sub_1 || 10));
        const ca_2 = Math.max(0, Math.min(Number(r.ca_sub_2) || 0, maxMarksConfig.ca_sub_2 || 10));
        const ca_3 = Math.max(0, Math.min(Number(r.ca_sub_3) || 0, maxMarksConfig.ca_sub_3 || 15));
        const exam = Math.max(0, Math.min(Number(r.exam_marks) || 0, maxMarksConfig.exam || 60));

        const ca_total = ca_attendance + ca_1 + ca_2 + ca_3;
        const total = ca_total + exam;

        // Auto Grade Calculation
        let grade = 'F';
        let gradePoints = 0.0;
        let isPass = false;

        if (total >= 90) { grade = 'O'; gradePoints = 10.0; isPass = true; }
        else if (total >= 80) { grade = 'A+'; gradePoints = 9.0; isPass = true; }
        else if (total >= 70) { grade = 'A'; gradePoints = 8.0; isPass = true; }
        else if (total >= 60) { grade = 'B+'; gradePoints = 7.0; isPass = true; }
        else if (total >= 50) { grade = 'B'; gradePoints = 6.0; isPass = true; }
        else if (total >= 40) { grade = 'C'; gradePoints = 5.0; isPass = true; }
        else { grade = 'F'; gradePoints = 0.0; isPass = false; }

        return {
            allocation_id: allocationId,
            student_id: r.student_id,
            subject_id: r.subject_id || allocation.subject_id,
            semester_id: r.semester_id || allocation.semester_id,
            batch_id: r.batch_id || allocation.batch_id,
            attendance_pct: Number(r.attendance_pct) || 0,
            ca_attendance_marks: ca_attendance,
            ca_sub_1: ca_1,
            ca_sub_2: ca_2,
            ca_sub_3: ca_3,
            exam_marks: exam,
            evaluation_type: subjectType,
            max_marks_config: maxMarksConfig,
            grade: grade,
            grade_points: gradePoints,
            is_pass: isPass,
            entered_by: facultyId || null,
            remarks: r.remarks || null,
            is_locked: !!r.is_locked
        };
    });

    // Execute upsert into subject_evaluations
    const { data: savedData, error: upsertError } = await db
        .from('subject_evaluations')
        .upsert(upsertRows, {
            onConflict: 'allocation_id,student_id',
            ignoreDuplicates: false
        })
        .select();

    throwIfError({ error: upsertError });

    // Optional: Synchronize with student_results
    try {
        const resultsRows = upsertRows.map(row => ({
            student_id: row.student_id,
            allocation_id: row.allocation_id,
            subject_id: row.subject_id,
            semester_id: row.semester_id,
            internal_marks: row.ca_attendance_marks + row.ca_sub_1 + row.ca_sub_2 + row.ca_sub_3,
            external_marks: row.exam_marks,
            grade: row.grade,
            grade_points: row.grade_points,
            is_pass: row.is_pass,
            attempt_number: 1,
            exam_type: 'Regular',
            entered_by: facultyId || null,
            remarks: row.remarks
        }));

        await db.from('student_results').upsert(resultsRows, {
            onConflict: 'student_id,subject_id,semester_id,attempt_number',
            ignoreDuplicates: false
        });
    } catch (syncErr) {
        console.warn('⚠️ Syncing to student_results skipped:', syncErr.message);
    }

    return {
        success: true,
        saved_count: (savedData || []).length,
        records: savedData
    };
}

/**
 * 4. Lock or Unlock Evaluation Sheet
 */
async function lockEvaluationSheet(allocationId, facultyId, isLocked = true, customClient = null) {
    const db = customClient || supabase;

    if (!allocationId) {
        throw new Error('Allocation ID is required');
    }

    const { data, error } = await db
        .from('subject_evaluations')
        .update({
            is_locked: isLocked,
            locked_by: facultyId || null,
            locked_at: isLocked ? new Date().toISOString() : null
        })
        .eq('allocation_id', allocationId)
        .select();

    throwIfError({ error });

    return {
        success: true,
        is_locked: isLocked,
        affected_rows: (data || []).length
    };
}

/**
 * 5. Get Student's own Subject Evaluations (Read-only for student)
 */
async function getStudentEvaluations(studentId, customClient = null) {
    const db = customClient || supabase;

    if (!studentId) {
        throw new Error('Student ID is required');
    }

    // 1. Fetch student enrollments
    const { data: enrollments, error: enrollError } = await db
        .from('student_enrollments')
        .select(`
            id,
            allocation_id,
            enrolled_at,
            allocation:subject_allocations(
                id,
                subject:subjects(id, name, code, credits, type),
                batch:batches(id, name),
                semester:semesters(id, term_number, academic_year:academic_years(year_level)),
                faculty:profiles!faculty_id(id, full_name, email)
            )
        `)
        .eq('student_id', studentId);

    throwIfError({ error: enrollError });

    if (!enrollments || enrollments.length === 0) {
        return [];
    }

    const allocIds = enrollments.map(e => e.allocation_id);

    // 2. Fetch evaluation records
    const { data: evals, error: evalError } = await db
        .from('subject_evaluations')
        .select('*')
        .in('allocation_id', allocIds)
        .eq('student_id', studentId);

    const evalMap = {};
    (evals || []).forEach(ev => {
        evalMap[ev.allocation_id] = ev;
    });

    // 3. Fetch attendance stats
    const { data: sessions } = await db
        .from('attendance_sessions')
        .select('id, allocation_id')
        .in('allocation_id', allocIds);

    const allocSessionCounts = {};
    const sessionToAlloc = {};
    (sessions || []).forEach(s => {
        allocSessionCounts[s.allocation_id] = (allocSessionCounts[s.allocation_id] || 0) + 1;
        sessionToAlloc[s.id] = s.allocation_id;
    });

    const sessionIds = (sessions || []).map(s => s.id);
    const allocAttendedCounts = {};

    if (sessionIds.length > 0) {
        const { data: attRecords } = await db
            .from('attendance_records')
            .select('session_id, status')
            .eq('student_id', studentId)
            .in('session_id', sessionIds);

        (attRecords || []).forEach(r => {
            if (r.status === 'present') {
                const allocId = sessionToAlloc[r.session_id];
                if (allocId) {
                    allocAttendedCounts[allocId] = (allocAttendedCounts[allocId] || 0) + 1;
                }
            }
        });
    }

    return enrollments.map(e => {
        const alloc = e.allocation || {};
        const sub = alloc.subject || {};
        const subjectType = sub.type || 'Theory';
        const isPractical = subjectType.toLowerCase() === 'practical';
        const ev = evalMap[e.allocation_id] || null;

        const totalSess = allocSessionCounts[e.allocation_id] || 0;
        const attendedSess = allocAttendedCounts[e.allocation_id] || 0;
        const attPct = totalSess > 0 ? Number(((attendedSess / totalSess) * 100).toFixed(1)) : 100.0;

        return {
            allocation_id: e.allocation_id,
            subject_id: sub.id,
            subject_name: sub.name || 'Subject',
            subject_code: sub.code || 'N/A',
            subject_type: subjectType,
            is_practical: isPractical,
            credits: sub.credits || 0,
            faculty_name: alloc.faculty?.full_name || 'Assigned Faculty',
            batch_name: alloc.batch?.name || 'B1',
            semester_term: alloc.semester?.term_number || 1,
            year_level: alloc.semester?.academic_year?.year_level || 'FY',
            
            // Attendance
            total_sessions: totalSess,
            attended_sessions: attendedSess,
            attendance_pct: attPct,

            // Marks
            has_evaluation: !!ev,
            ca_attendance_marks: ev ? Number(ev.ca_attendance_marks) : null,
            ca_sub_1: ev ? Number(ev.ca_sub_1) : null,
            ca_sub_2: ev ? Number(ev.ca_sub_2) : null,
            ca_sub_3: ev ? Number(ev.ca_sub_3) : null,
            ca_total: ev ? Number(ev.ca_total) : null,
            exam_marks: ev ? Number(ev.exam_marks) : null,
            total_marks: ev ? Number(ev.total_marks) : null,
            grade: ev ? ev.grade : null,
            grade_points: ev ? ev.grade_points : null,
            is_pass: ev ? ev.is_pass : null,
            is_locked: ev ? ev.is_locked : false,
            ca_sub_label: isPractical ? 'PAB' : 'TA',
            exam_label: isPractical ? 'Practical Exam' : 'Theory Exam'
        };
    });
}

/**
 * 6. Admin Query Engine: View all evaluations across the university
 */
async function getAllEvaluationsAdmin(filters = {}, customClient = null) {
    const db = customClient || supabase;

    let query = db
        .from('subject_allocations')
        .select(`
            id,
            subject:subjects(id, name, code, credits, type, department_id),
            batch:batches(id, name),
            semester:semesters(id, term_number, academic_year:academic_years(id, year_level)),
            faculty:profiles!faculty_id(id, full_name, email)
        `);

    const { data: allocations, error } = await query;
    throwIfError({ error });

    if (!allocations || allocations.length === 0) {
        return [];
    }

    const allocIds = allocations.map(a => a.id);

    // Get counts
    const { data: enrollments } = await db
        .from('student_enrollments')
        .select('id, allocation_id')
        .in('allocation_id', allocIds);

    const { data: evaluations } = await db
        .from('subject_evaluations')
        .select('id, allocation_id, total_marks, is_pass, is_locked')
        .in('allocation_id', allocIds);

    const enrollMap = {};
    const evalMap = {};
    const passMap = {};
    const lockMap = {};

    (enrollments || []).forEach(e => {
        enrollMap[e.allocation_id] = (enrollMap[e.allocation_id] || 0) + 1;
    });

    (evaluations || []).forEach(ev => {
        evalMap[ev.allocation_id] = (evalMap[ev.allocation_id] || 0) + 1;
        if (ev.is_pass) passMap[ev.allocation_id] = (passMap[ev.allocation_id] || 0) + 1;
        if (ev.is_locked) lockMap[ev.allocation_id] = true;
    });

    return allocations.map(a => {
        const enrolled = enrollMap[a.id] || 0;
        const graded = evalMap[a.id] || 0;
        const passed = passMap[a.id] || 0;
        const isLocked = !!lockMap[a.id];

        return {
            allocation_id: a.id,
            subject_id: a.subject?.id,
            subject_name: a.subject?.name,
            subject_code: a.subject?.code,
            subject_type: a.subject?.type || 'Theory',
            faculty_id: a.faculty?.id,
            faculty_name: a.faculty?.full_name || 'Faculty Member',
            batch_name: a.batch?.name || 'All',
            semester_term: a.semester?.term_number || 1,
            year_level: a.semester?.academic_year?.year_level || 'FY',
            total_enrolled: enrolled,
            total_graded: graded,
            total_passed: passed,
            pass_percentage: graded > 0 ? Number(((passed / graded) * 100).toFixed(1)) : 0,
            completion_percentage: enrolled > 0 ? Number(((graded / enrolled) * 100).toFixed(1)) : 0,
            is_locked: isLocked,
            status: graded === 0 ? 'PENDING' : (graded >= enrolled && enrolled > 0 ? 'SUBMITTED' : 'IN_PROGRESS')
        };
    });
}

module.exports = {
    DEFAULT_MAX_MARKS,
    getFacultyAllocations,
    getEvaluationSheet,
    saveBatchEvaluations,
    lockEvaluationSheet,
    getStudentEvaluations,
    getAllEvaluationsAdmin
};
