// frontend/src/services/evaluationService.js
// Enterprise Subject Evaluation, Marks Entry & Excel Data Hub Service

import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

const API_BASE_URL = 'http://localhost:5001/api/evaluation';

export const DEFAULT_MAX_MARKS = {
    ca_attendance: 5,
    ca_sub_1: 10,
    ca_sub_2: 10,
    ca_sub_3: 15,
    ca_total: 40,
    exam: 60,
    total: 100
};

/**
 * 1. Fetch faculty's allocated subjects with evaluation status
 */
export async function fetchFacultyAllocations(facultyId) {
    try {
        const response = await fetch(`${API_BASE_URL}/allocations?facultyId=${facultyId}`);
        if (response.ok) {
            const resData = await response.json();
            if (resData.status === 'success') return resData.data;
        }
    } catch (err) {
        console.warn('Backend API unreachable, falling back to direct Supabase query:', err);
    }

    // Direct Supabase fallback
    const { data: allocations, error } = await supabase
        .from('subject_allocations')
        .select(`
            id,
            subject_id,
            batch_id,
            semester_id,
            faculty_id,
            subject:subjects(id, name, code, credits, type),
            batch:batches(id, name),
            semester:semesters(id, term_number, academic_year:academic_years(year_level))
        `)
        .eq('faculty_id', facultyId);

    if (error) throw error;
    if (!allocations) return [];

    const allocIds = allocations.map(a => a.id);

    // Fetch student counts
    const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('id, allocation_id')
        .in('allocation_id', allocIds);

    const { data: evals } = await supabase
        .from('subject_evaluations')
        .select('id, allocation_id, is_locked')
        .in('allocation_id', allocIds);

    const enrollMap = {};
    const evalMap = {};
    const lockMap = {};

    (enrollments || []).forEach(e => { enrollMap[e.allocation_id] = (enrollMap[e.allocation_id] || 0) + 1; });
    (evals || []).forEach(ev => {
        evalMap[ev.allocation_id] = (evalMap[ev.allocation_id] || 0) + 1;
        if (ev.is_locked) lockMap[ev.allocation_id] = true;
    });

    return allocations.map(a => {
        const type = a.subject?.type || 'Theory';
        const isPractical = type.toLowerCase() === 'practical';
        const enrolled = enrollMap[a.id] || 0;
        const graded = evalMap[a.id] || 0;
        return {
            id: a.id,
            subject_id: a.subject_id,
            subject_name: a.subject?.name || 'Subject',
            subject_code: a.subject?.code || 'N/A',
            subject_type: type,
            is_practical: isPractical,
            credits: a.subject?.credits || 0,
            batch_name: a.batch?.name || 'All Batches',
            semester_term: a.semester?.term_number || 1,
            year_level: a.semester?.academic_year?.year_level || 'FY',
            total_enrolled: enrolled,
            total_graded: graded,
            is_locked: !!lockMap[a.id],
            status: graded === 0 ? 'NOT_STARTED' : (graded >= enrolled && enrolled > 0 ? 'COMPLETED' : 'IN_PROGRESS'),
            ca_sub_label: isPractical ? 'PAB' : 'TA',
            exam_label: isPractical ? 'Practical Exam' : 'Theory Exam'
        };
    });
}

/**
 * 2. Fetch full Spreadsheet Evaluation Sheet for an allocation
 */
export async function fetchEvaluationSheet(allocationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/sheet/${allocationId}`);
        if (response.ok) {
            const resData = await response.json();
            if (resData.status === 'success') return resData.data;
        }
    } catch (err) {
        console.warn('Backend API unreachable for sheet, falling back to direct Supabase:', err);
    }

    // Direct Supabase Fallback
    const { data: alloc, error: allocErr } = await supabase
        .from('subject_allocations')
        .select(`
            id,
            subject_id,
            batch_id,
            semester_id,
            faculty_id,
            subject:subjects(id, name, code, credits, type),
            batch:batches(id, name),
            semester:semesters(id, term_number, academic_year:academic_years(year_level)),
            faculty:profiles!faculty_id(id, full_name)
        `)
        .eq('id', allocationId)
        .single();

    if (allocErr) throw allocErr;

    const subjectType = alloc.subject?.type || 'Theory';
    const isPractical = subjectType.toLowerCase() === 'practical';

    // Enrollments
    const { data: enrollments, error: enrollErr } = await supabase
        .from('student_enrollments')
        .select(`
            id,
            student_id,
            student:profiles!student_id(id, full_name, email, enrollment_no, department)
        `)
        .eq('allocation_id', allocationId);

    if (enrollErr) throw enrollErr;

    // Attendance sessions
    const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('allocation_id', allocationId);

    const totalSessions = (sessions || []).length;
    const sessionIds = (sessions || []).map(s => s.id);

    let attRecords = [];
    if (sessionIds.length > 0) {
        const { data: records } = await supabase
            .from('attendance_records')
            .select('session_id, student_id, status')
            .in('session_id', sessionIds);
        if (records) attRecords = records;
    }

    const studentAttendedMap = {};
    attRecords.forEach(r => {
        if (r.status === 'present') {
            studentAttendedMap[r.student_id] = (studentAttendedMap[r.student_id] || 0) + 1;
        }
    });

    // Existing evaluations
    const { data: evals } = await supabase
        .from('subject_evaluations')
        .select('*')
        .eq('allocation_id', allocationId);

    const evalMap = {};
    let isSheetLocked = false;
    let maxMarksConfig = DEFAULT_MAX_MARKS;

    (evals || []).forEach(ev => {
        evalMap[ev.student_id] = ev;
        if (ev.is_locked) isSheetLocked = true;
        if (ev.max_marks_config) maxMarksConfig = ev.max_marks_config;
    });

    const students = (enrollments || []).map((e, idx) => {
        const st = e.student || {};
        const attended = studentAttendedMap[e.student_id] || 0;
        const attPct = totalSessions > 0 ? Number(((attended / totalSessions) * 100).toFixed(1)) : 100.0;
        const ev = evalMap[e.student_id] || null;

        const ca_attendance = ev ? Number(ev.ca_attendance_marks) : 0;
        const ca_1 = ev ? Number(ev.ca_sub_1) : 0;
        const ca_2 = ev ? Number(ev.ca_sub_2) : 0;
        const ca_3 = ev ? Number(ev.ca_sub_3) : 0;
        const ca_total = ca_attendance + ca_1 + ca_2 + ca_3;
        const exam = ev ? Number(ev.exam_marks) : 0;
        const total = ca_total + exam;

        return {
            row_index: idx + 1,
            student_id: e.student_id,
            enrollment_id: e.id,
            student_name: st.full_name || 'Student',
            enrollment_no: st.enrollment_no || `MIT-${e.student_id.substring(0, 7).toUpperCase()}`,
            email: st.email || '',
            department: st.department || 'Engineering',
            batch_name: alloc.batch?.name || 'B1',
            year_level: alloc.semester?.academic_year?.year_level || 'FY',
            semester_term: alloc.semester?.term_number || 1,
            
            total_sessions: totalSessions,
            attended_sessions: attended,
            attendance_pct: attPct,
            suggested_attendance_marks: attPct >= 90 ? 5 : (attPct >= 80 ? 4 : (attPct >= 75 ? 3 : (attPct >= 65 ? 2 : 0))),

            evaluation_id: ev?.id || null,
            ca_attendance_marks: ca_attendance,
            ca_sub_1: ca_1,
            ca_sub_2: ca_2,
            ca_sub_3: ca_3,
            ca_total: ca_total,
            exam_marks: exam,
            total_marks: total,
            grade: ev?.grade || (total >= 40 ? 'B' : 'F'),
            grade_points: ev?.grade_points || null,
            is_pass: ev?.is_pass !== undefined ? ev.is_pass : (total >= 40),
            is_locked: !!ev?.is_locked,
            remarks: ev?.remarks || ''
        };
    });

    students.sort((a, b) => a.student_name.localeCompare(b.student_name));

    return {
        allocation: {
            id: alloc.id,
            subject_id: alloc.subject_id,
            subject_name: alloc.subject?.name || 'Subject',
            subject_code: alloc.subject?.code || '',
            subject_type: subjectType,
            is_practical: isPractical,
            credits: alloc.subject?.credits || 0,
            batch_name: alloc.batch?.name || 'All Batches',
            semester_term: alloc.semester?.term_number || 1,
            year_level: alloc.semester?.academic_year?.year_level || 'FY',
            faculty_name: alloc.faculty?.full_name || 'Faculty',
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
 * 3. Batch Save Evaluation Marks
 */
export async function saveBatchEvaluations(allocationId, records, facultyId, maxMarksConfig = DEFAULT_MAX_MARKS) {
    // 1. Get auth token if available
    let token = null;
    try {
        const sessionRes = await supabase.auth.getSession();
        token = sessionRes?.data?.session?.access_token || localStorage.getItem('token') || localStorage.getItem('access_token');
    } catch {
        // ignore session retrieval error
    }

    // 2. Try Backend REST API first
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/save-batch`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                allocation_id: allocationId,
                records,
                faculty_id: facultyId,
                max_marks_config: maxMarksConfig
            })
        });

        if (response.ok) {
            const resData = await response.json();
            if (resData.status === 'success') return resData.data;
        } else {
            const errRes = await response.json().catch(() => ({}));
            console.warn('Backend API save responded with error, falling back to direct Supabase:', errRes.message);
        }
    } catch (err) {
        console.warn('Backend API save failed, falling back to direct Supabase upsert:', err);
    }

    // 3. Direct Supabase fallback: Fetch allocation metadata for subject_id, semester_id, batch_id
    const { data: allocMeta, error: allocMetaErr } = await supabase
        .from('subject_allocations')
        .select('id, subject_id, semester_id, batch_id, subject:subjects(type)')
        .eq('id', allocationId)
        .single();

    if (allocMetaErr) {
        console.error('Failed to fetch allocation metadata for upsert:', allocMetaErr);
        throw allocMetaErr;
    }

    const subjectId = allocMeta.subject_id;
    const semesterId = allocMeta.semester_id;
    const batchId = allocMeta.batch_id;
    const subjectType = allocMeta.subject?.type || 'Theory';

    // Direct Supabase upsert rows
    const upsertRows = records.map(r => {
        const ca_attendance = Math.max(0, Math.min(Number(r.ca_attendance_marks) || 0, maxMarksConfig.ca_attendance || 5));
        const ca_1 = Math.max(0, Math.min(Number(r.ca_sub_1) || 0, maxMarksConfig.ca_sub_1 || 10));
        const ca_2 = Math.max(0, Math.min(Number(r.ca_sub_2) || 0, maxMarksConfig.ca_sub_2 || 10));
        const ca_3 = Math.max(0, Math.min(Number(r.ca_sub_3) || 0, maxMarksConfig.ca_sub_3 || 15));
        const exam = Math.max(0, Math.min(Number(r.exam_marks) || 0, maxMarksConfig.exam || 60));
        const total = ca_attendance + ca_1 + ca_2 + ca_3 + exam;

        let grade = 'F';
        let gradePoints = 0;
        let isPass = false;

        if (total >= 90) { grade = 'O'; gradePoints = 10; isPass = true; }
        else if (total >= 80) { grade = 'A+'; gradePoints = 9; isPass = true; }
        else if (total >= 70) { grade = 'A'; gradePoints = 8; isPass = true; }
        else if (total >= 60) { grade = 'B+'; gradePoints = 7; isPass = true; }
        else if (total >= 50) { grade = 'B'; gradePoints = 6; isPass = true; }
        else if (total >= 40) { grade = 'C'; gradePoints = 5; isPass = true; }

        return {
            allocation_id: allocationId,
            student_id: r.student_id,
            subject_id: r.subject_id || subjectId,
            semester_id: r.semester_id || semesterId,
            batch_id: r.batch_id || batchId,
            evaluation_type: subjectType,
            attendance_pct: Number(r.attendance_pct) || 0,
            ca_attendance_marks: ca_attendance,
            ca_sub_1: ca_1,
            ca_sub_2: ca_2,
            ca_sub_3: ca_3,
            exam_marks: exam,
            max_marks_config: maxMarksConfig,
            grade,
            grade_points: gradePoints,
            is_pass: isPass,
            entered_by: facultyId || null,
            remarks: r.remarks || null,
            is_locked: !!r.is_locked
        };
    });

    const { data, error } = await supabase
        .from('subject_evaluations')
        .upsert(upsertRows, { onConflict: 'allocation_id,student_id' })
        .select();

    if (error) {
        console.error('Direct Supabase upsert error:', error);
        throw error;
    }
    return { success: true, saved_count: (data || []).length, records: data };
}

/**
 * 4. Lock / Unlock Evaluation Sheet
 */
export async function lockEvaluationSheet(allocationId, facultyId, isLocked = true) {
    try {
        const response = await fetch(`${API_BASE_URL}/lock/${allocationId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_locked: isLocked, faculty_id: facultyId })
        });
        if (response.ok) {
            const resData = await response.json();
            if (resData.status === 'success') return resData.data;
        }
    } catch (err) {
        console.warn('Backend API lock failed, falling back to direct Supabase update:', err);
    }

    const { data, error } = await supabase
        .from('subject_evaluations')
        .update({
            is_locked: isLocked,
            locked_by: facultyId || null,
            locked_at: isLocked ? new Date().toISOString() : null
        })
        .eq('allocation_id', allocationId)
        .select();

    if (error) throw error;
    return { success: true, is_locked: isLocked, affected_rows: (data || []).length };
}

/**
 * 5. Fetch Student's own Subject Evaluations
 */
export async function fetchStudentEvaluations(studentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/student/my-evaluations?studentId=${studentId}`);
        if (response.ok) {
            const resData = await response.json();
            if (resData.status === 'success') return resData.data;
        }
    } catch (err) {
        console.warn('Backend API student fetch failed, falling back to direct Supabase:', err);
    }

    const { data: enrollments, error } = await supabase
        .from('student_enrollments')
        .select(`
            id,
            allocation_id,
            allocation:subject_allocations(
                id,
                subject:subjects(id, name, code, credits, type),
                batch:batches(id, name),
                semester:semesters(id, term_number, academic_year:academic_years(year_level)),
                faculty:profiles!faculty_id(id, full_name)
            )
        `)
        .eq('student_id', studentId);

    if (error) throw error;
    if (!enrollments) return [];

    const allocIds = enrollments.map(e => e.allocation_id);

    const { data: evals } = await supabase
        .from('subject_evaluations')
        .select('*')
        .in('allocation_id', allocIds)
        .eq('student_id', studentId);

    const evalMap = {};
    (evals || []).forEach(ev => { evalMap[ev.allocation_id] = ev; });

    return enrollments.map(e => {
        const alloc = e.allocation || {};
        const sub = alloc.subject || {};
        const isPractical = (sub.type || '').toLowerCase() === 'practical';
        const ev = evalMap[e.allocation_id] || null;

        return {
            allocation_id: e.allocation_id,
            subject_id: sub.id,
            subject_name: sub.name || 'Subject',
            subject_code: sub.code || 'N/A',
            subject_type: sub.type || 'Theory',
            is_practical: isPractical,
            credits: sub.credits || 0,
            faculty_name: alloc.faculty?.full_name || 'Faculty',
            batch_name: alloc.batch?.name || 'B1',
            semester_term: alloc.semester?.term_number || 1,
            year_level: alloc.semester?.academic_year?.year_level || 'FY',
            
            attendance_pct: ev ? Number(ev.attendance_pct) : 100,
            has_evaluation: !!ev,
            ca_attendance_marks: ev ? Number(ev.ca_attendance_marks) : null,
            ca_sub_1: ev ? Number(ev.ca_sub_1) : null,
            ca_sub_2: ev ? Number(ev.ca_sub_2) : null,
            ca_sub_3: ev ? Number(ev.ca_sub_3) : null,
            ca_total: ev ? Number(ev.ca_total) : null,
            exam_marks: ev ? Number(ev.exam_marks) : null,
            total_marks: ev ? Number(ev.total_marks) : null,
            grade: ev?.grade || null,
            grade_points: ev?.grade_points || null,
            is_pass: ev?.is_pass,
            is_locked: !!ev?.is_locked,
            ca_sub_label: isPractical ? 'PAB' : 'TA',
            exam_label: isPractical ? 'Practical Exam' : 'Theory Exam'
        };
    });
}

/**
 * 6. Fetch Admin Global Overview of Evaluations
 */
export async function fetchAdminEvaluations() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/all`);
        if (response.ok) {
            const resData = await response.json();
            if (resData.status === 'success') return resData.data;
        }
    } catch (err) {
        console.warn('Backend API admin fetch failed:', err);
    }

    const { data: allocations, error } = await supabase
        .from('subject_allocations')
        .select(`
            id,
            subject:subjects(id, name, code, credits, type),
            batch:batches(id, name),
            semester:semesters(id, term_number, academic_year:academic_years(year_level)),
            faculty:profiles!faculty_id(id, full_name, email)
        `);

    if (error) throw error;
    if (!allocations) return [];

    const allocIds = allocations.map(a => a.id);

    const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('id, allocation_id')
        .in('allocation_id', allocIds);

    const { data: evals } = await supabase
        .from('subject_evaluations')
        .select('id, allocation_id, is_pass, is_locked')
        .in('allocation_id', allocIds);

    const enrollMap = {};
    const evalMap = {};
    const passMap = {};
    const lockMap = {};

    (enrollments || []).forEach(e => { enrollMap[e.allocation_id] = (enrollMap[e.allocation_id] || 0) + 1; });
    (evals || []).forEach(ev => {
        evalMap[ev.allocation_id] = (evalMap[ev.allocation_id] || 0) + 1;
        if (ev.is_pass) passMap[ev.allocation_id] = (passMap[ev.allocation_id] || 0) + 1;
        if (ev.is_locked) lockMap[ev.allocation_id] = true;
    });

    return allocations.map(a => {
        const enrolled = enrollMap[a.id] || 0;
        const graded = evalMap[a.id] || 0;
        const passed = passMap[a.id] || 0;
        return {
            allocation_id: a.id,
            subject_id: a.subject?.id,
            subject_name: a.subject?.name,
            subject_code: a.subject?.code,
            subject_type: a.subject?.type || 'Theory',
            faculty_name: a.faculty?.full_name || 'Faculty Member',
            batch_name: a.batch?.name || 'All',
            semester_term: a.semester?.term_number || 1,
            year_level: a.semester?.academic_year?.year_level || 'FY',
            total_enrolled: enrolled,
            total_graded: graded,
            total_passed: passed,
            pass_percentage: graded > 0 ? Number(((passed / graded) * 100).toFixed(1)) : 0,
            completion_percentage: enrolled > 0 ? Number(((graded / enrolled) * 100).toFixed(1)) : 0,
            is_locked: !!lockMap[a.id],
            status: graded === 0 ? 'PENDING' : (graded >= enrolled && enrolled > 0 ? 'SUBMITTED' : 'IN_PROGRESS')
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL & CSV EXPORT / IMPORT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export current evaluation sheet to formatted .xlsx file
 */
export function exportToExcel(allocation, students, maxMarksConfig = DEFAULT_MAX_MARKS) {
    const subLabel = allocation.ca_sub_label || (allocation.is_practical ? 'PAB' : 'TA');
    const examLabel = allocation.exam_label || (allocation.is_practical ? 'Practical Exam' : 'Theory Exam');

    const headers = [
        'Roll #',
        'Student Name',
        'Enrollment Number',
        'Batch',
        'Year',
        'Real Attendance (%)',
        `CA Attendance (Max ${maxMarksConfig.ca_attendance || 5})`,
        `${subLabel}-1 (Max ${maxMarksConfig.ca_sub_1 || 10})`,
        `${subLabel}-2 (Max ${maxMarksConfig.ca_sub_2 || 10})`,
        `${subLabel}-3 (Max ${maxMarksConfig.ca_sub_3 || 15})`,
        `CA Total (Max ${maxMarksConfig.ca_total || 40})`,
        `${examLabel} (Max ${maxMarksConfig.exam || 60})`,
        `Grand Total (Max ${maxMarksConfig.total || 100})`,
        'Grade',
        'Result',
        'Remarks'
    ];

    const rows = students.map((s, idx) => [
        idx + 1,
        s.student_name,
        s.enrollment_no,
        s.batch_name,
        s.year_level,
        s.attendance_pct,
        s.ca_attendance_marks,
        s.ca_sub_1,
        s.ca_sub_2,
        s.ca_sub_3,
        s.ca_total,
        s.exam_marks,
        s.total_marks,
        s.grade,
        s.is_pass ? 'PASS' : 'FAIL',
        s.remarks || ''
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set column widths
    worksheet['!cols'] = [
        { wch: 8 },  // Roll #
        { wch: 25 }, // Student Name
        { wch: 20 }, // Enrollment No
        { wch: 10 }, // Batch
        { wch: 8 },  // Year
        { wch: 20 }, // Attendance %
        { wch: 18 }, // CA Attendance
        { wch: 14 }, // TA-1
        { wch: 14 }, // TA-2
        { wch: 14 }, // TA-3
        { wch: 14 }, // CA Total
        { wch: 20 }, // Exam
        { wch: 16 }, // Total
        { wch: 10 }, // Grade
        { wch: 12 }, // Result
        { wch: 25 }  // Remarks
    ];

    const workbook = XLSX.utils.book_new();
    const sheetName = `${allocation.subject_code || 'Evaluation'}_Marks`.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const fileName = `${allocation.subject_code || 'Subject'}_${allocation.batch_name || 'Batch'}_Evaluation_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

/**
 * Export current evaluation sheet to plain CSV
 */
export function exportToCsv(allocation, students, maxMarksConfig = DEFAULT_MAX_MARKS) {
    const subLabel = allocation.ca_sub_label || (allocation.is_practical ? 'PAB' : 'TA');
    const examLabel = allocation.exam_label || (allocation.is_practical ? 'Practical Exam' : 'Theory Exam');

    const headers = [
        'Roll #',
        'Student Name',
        'Enrollment Number',
        'Batch',
        'Year',
        'Attendance Pct',
        'CA Attendance',
        `${subLabel}-1`,
        `${subLabel}-2`,
        `${subLabel}-3`,
        'CA Total',
        examLabel,
        'Grand Total',
        'Grade',
        'Result',
        'Remarks'
    ];

    const csvRows = [headers.join(',')];

    students.forEach((s, idx) => {
        const row = [
            idx + 1,
            `"${(s.student_name || '').replace(/"/g, '""')}"`,
            `"${(s.enrollment_no || '').replace(/"/g, '""')}"`,
            `"${s.batch_name || ''}"`,
            `"${s.year_level || ''}"`,
            s.attendance_pct || 0,
            s.ca_attendance_marks || 0,
            s.ca_sub_1 || 0,
            s.ca_sub_2 || 0,
            s.ca_sub_3 || 0,
            s.ca_total || 0,
            s.exam_marks || 0,
            s.total_marks || 0,
            `"${s.grade || ''}"`,
            s.is_pass ? 'PASS' : 'FAIL',
            `"${(s.remarks || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${allocation.subject_code || 'Subject'}_Evaluation_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Parse uploaded Excel or CSV file
 */
export async function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                resolve(jsonRows);
            } catch (err) {
                reject(new Error(`Failed to parse file: ${err.message}`));
            }
        };
        reader.onerror = (err) => reject(new Error('File reading failed'));
        reader.readAsArrayBuffer(file);
    });
}
