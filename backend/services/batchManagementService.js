// backend/services/batchManagementService.js
// Enterprise Class & Practical Batch Management System Engine (Phase 6)
// Supports academic class hierarchy, automatic batch generation (70 -> 24, 23, 23),
// student/faculty allocation, transfer audit logs, attendance/timetable integration, and reports.

const supabase = require('../config/supabaseClient');

function throwIfError({ error }) {
    if (error) throw new Error(error.message);
}

// ── 1. ACADEMIC CLASSES MANAGEMENT ───────────────────────────────────────────

async function createClass(data) {
    const {
        program_name = 'Computer Science Engineering',
        academic_year = '2026-2027',
        year_level = 'First Year',
        class_name,
        capacity = 70,
        class_teacher_id = null,
        coordinator_id = null,
        classroom = 'Room 101',
        status = 'ACTIVE'
    } = data;

    if (!class_name) {
        throw new Error('Class Name is required (e.g., FY-1, FY-2, SY-1)');
    }

    const { data: newClass, error } = await supabase
        .from('academic_classes')
        .insert([{
            program_name,
            academic_year,
            year_level,
            class_name,
            capacity,
            class_teacher_id,
            coordinator_id,
            classroom,
            status
        }])
        .select()
        .single();

    throwIfError({ error });
    return newClass;
}

async function listClasses(filters = {}) {
    let query = supabase.from('v_class_strength_summary').select('*');
    if (filters.program_name) {
        query = query.eq('program_name', filters.program_name);
    }
    if (filters.academic_year) {
        query = query.eq('academic_year', filters.academic_year);
    }
    if (filters.year_level) {
        query = query.eq('year_level', filters.year_level);
    }
    const { data, error } = await query;
    throwIfError({ error });
    return data || [];
}

async function getClassById(classId) {
    const { data, error } = await supabase
        .from('academic_classes')
        .select('*')
        .eq('id', classId)
        .single();
    throwIfError({ error });
    return data;
}

// ── 2. PRACTICAL BATCHES MANAGEMENT ──────────────────────────────────────────

async function createBatch(data) {
    const {
        class_id,
        batch_name,
        capacity = 24,
        assigned_lab = 'Computer Lab 1',
        faculty_id = null,
        status = 'ACTIVE'
    } = data;

    if (!class_id || !batch_name) {
        throw new Error('Class ID and Batch Name are required');
    }

    // Check parent class exists
    const { data: parentClass, error: classErr } = await supabase
        .from('academic_classes')
        .select('id, class_name')
        .eq('id', class_id)
        .single();
    if (classErr || !parentClass) {
        throw new Error('Parent class not found');
    }

    // Check duplicate batch name under same class
    const { data: existing, error: existErr } = await supabase
        .from('practical_batches')
        .select('id')
        .eq('class_id', class_id)
        .eq('batch_name', batch_name);
    if (existing && existing.length > 0) {
        throw new Error(`Duplicate Batch Name: ${batch_name} already exists in class ${parentClass.class_name}`);
    }

    const { data: newBatch, error } = await supabase
        .from('practical_batches')
        .insert([{
            class_id,
            batch_name,
            capacity,
            assigned_lab,
            faculty_id,
            status
        }])
        .select()
        .single();

    throwIfError({ error });
    return newBatch;
}

async function listBatches(filters = {}) {
    let query = supabase.from('v_batch_capacity_report').select('*');
    if (filters.class_id) {
        query = query.eq('class_id', filters.class_id);
    }
    const { data, error } = await query;
    throwIfError({ error });
    return data || [];
}

async function getBatchById(batchId) {
    const { data, error } = await supabase
        .from('practical_batches')
        .select('*')
        .eq('id', batchId)
        .single();
    throwIfError({ error });
    return data;
}

// ── 3. AUTOMATIC BATCH GENERATION ENGINE ─────────────────────────────────────

/**
 * Given totalStudents (e.g. 70) and batchSize (e.g. 24),
 * automatically generates Batches A, B, C with distributed capacities (e.g., 24, 23, 23).
 */
async function autoGenerateBatches({ classId, totalStudents = 70, batchSize = 24, assignedLab = 'Computer Lab 1', facultyId = null }) {
    if (!classId) throw new Error('Class ID is required for automatic batch generation');
    if (batchSize <= 0 || totalStudents <= 0) {
        throw new Error('Total Students and Batch Size must be greater than 0');
    }

    const numBatches = Math.ceil(totalStudents / batchSize);
    const baseCapacity = Math.floor(totalStudents / numBatches);
    const remainder = totalStudents % numBatches;

    const createdBatches = [];

    for (let i = 0; i < numBatches; i++) {
        // Alphabetical batch naming: Batch A, Batch B, Batch C...
        const letter = String.fromCharCode(65 + i);
        const batch_name = `Batch ${letter}`;
        const capacity = baseCapacity + (i < remainder ? 1 : 0);

        const batch = await createBatch({
            class_id: classId,
            batch_name,
            capacity,
            assigned_lab: `${assignedLab} - ${letter}`,
            faculty_id: facultyId,
            status: 'ACTIVE'
        });
        createdBatches.push(batch);
    }

    return {
        status: 'success',
        class_id: classId,
        total_students: totalStudents,
        batch_size_config: batchSize,
        batches_created: numBatches,
        batches: createdBatches
    };
}

// ── 4. STUDENT ALLOCATION & TRANSFER ENGINE ──────────────────────────────────

/**
 * Validates and allocates a single student to a class and batch.
 */
async function manualAllocateStudent({ studentId, classId, batchId, allocatedBy = null }) {
    if (!studentId || !classId || !batchId) {
        throw new Error('studentId, classId, and batchId are required');
    }

    // 1. Verify batch belongs to class
    const { data: batch, error: bErr } = await supabase
        .from('practical_batches')
        .select('id, class_id, capacity, batch_name')
        .eq('id', batchId)
        .single();
    if (bErr || !batch) throw new Error('Target practical batch not found');
    if (batch.class_id !== classId) {
        throw new Error('Invalid Allocation: Target batch does not belong to target class');
    }

    // 2. Check for duplicate active allocation
    const { data: activeAlloc, error: allocErr } = await supabase
        .from('student_batch_allocations')
        .select('id, class_id, batch_id')
        .eq('student_id', studentId)
        .eq('status', 'ACTIVE');

    if (activeAlloc && activeAlloc.length > 0) {
        throw new Error('Duplicate Student Allocation: Student is already actively allocated to a class and batch. Use transfer instead.');
    }

    // 3. Check capacity overflow
    const { data: enrolled, error: eErr } = await supabase
        .from('student_batch_allocations')
        .select('id')
        .eq('batch_id', batchId)
        .eq('status', 'ACTIVE');
    const currentCount = (enrolled && enrolled.length) ? enrolled.length : 0;
    if (currentCount >= batch.capacity) {
        throw new Error(`Capacity Overflow: Batch ${batch.batch_name} is at maximum capacity (${batch.capacity})`);
    }

    // 4. Create active allocation
    const { data: newAlloc, error } = await supabase
        .from('student_batch_allocations')
        .insert([{
            student_id: studentId,
            class_id: classId,
            batch_id: batchId,
            allocated_by: allocatedBy,
            status: 'ACTIVE'
        }])
        .select()
        .single();

    throwIfError({ error });
    return newAlloc;
}

/**
 * Automatically allocates a list of students evenly across all active practical batches in a class.
 */
async function autoAllocateStudents({ classId, studentIds = [], allocatedBy = null }) {
    if (!classId || !studentIds.length) {
        throw new Error('classId and non-empty studentIds array are required');
    }

    // Fetch active batches for class
    const { data: batches, error: bErr } = await supabase
        .from('practical_batches')
        .select('*')
        .eq('class_id', classId)
        .eq('status', 'ACTIVE')
        .order('batch_name', { ascending: true });

    if (bErr || !batches || batches.length === 0) {
        throw new Error('No active practical batches found for this class. Please generate batches first.');
    }

    const allocations = [];
    const errors = [];
    let batchIndex = 0;

    for (const studentId of studentIds) {
        try {
            const targetBatch = batches[batchIndex % batches.length];
            const alloc = await manualAllocateStudent({
                studentId,
                classId,
                batchId: targetBatch.id,
                allocatedBy
            });
            allocations.push(alloc);
            batchIndex++;
        } catch (err) {
            errors.push({ studentId, error: err.message });
        }
    }

    return {
        status: 'success',
        allocated_count: allocations.length,
        failed_count: errors.length,
        allocations,
        errors
    };
}

/**
 * Bulk allocates an explicit array of { studentId, classId, batchId } mappings.
 */
async function bulkAllocateStudents({ allocations = [], allocatedBy = null }) {
    const results = [];
    const errors = [];

    for (const item of allocations) {
        try {
            const alloc = await manualAllocateStudent({
                studentId: item.studentId || item.student_id,
                classId: item.classId || item.class_id,
                batchId: item.batchId || item.batch_id,
                allocatedBy
            });
            results.push(alloc);
        } catch (err) {
            errors.push({ studentId: item.studentId || item.student_id, error: err.message });
        }
    }

    return {
        status: 'success',
        allocated_count: results.length,
        failed_count: errors.length,
        results,
        errors
    };
}

/**
 * Transfers a student from their current batch to a new target batch within the same or different class,
 * recording an immutable audit trail in batch_transfer_logs.
 */
async function transferStudentBatch({ studentId, targetBatchId, reason = 'Administrative Transfer', performedBy = null }) {
    if (!studentId || !targetBatchId) {
        throw new Error('studentId and targetBatchId are required');
    }

    // 1. Fetch current active allocation
    const { data: activeAlloc, error: allocErr } = await supabase
        .from('student_batch_allocations')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'ACTIVE')
        .single();
    if (allocErr || !activeAlloc) {
        throw new Error('Invalid Transfer: Student does not have an active batch allocation');
    }

    if (activeAlloc.batch_id === targetBatchId) {
        throw new Error('Invalid Transfer: Student is already assigned to this batch');
    }

    // 2. Fetch target batch info
    const { data: targetBatch, error: bErr } = await supabase
        .from('practical_batches')
        .select('id, class_id, capacity, batch_name')
        .eq('id', targetBatchId)
        .single();
    if (bErr || !targetBatch) throw new Error('Target batch not found');

    // 3. Verify target batch capacity
    const { data: enrolled } = await supabase
        .from('student_batch_allocations')
        .select('id')
        .eq('batch_id', targetBatchId)
        .eq('status', 'ACTIVE');
    const count = (enrolled && enrolled.length) ? enrolled.length : 0;
    if (count >= targetBatch.capacity) {
        throw new Error(`Capacity Overflow: Target batch ${targetBatch.batch_name} is at maximum capacity (${targetBatch.capacity})`);
    }

    // 4. Mark old allocation as TRANSFERRED
    await supabase
        .from('student_batch_allocations')
        .update({ status: 'TRANSFERRED', updated_at: new Date().toISOString() })
        .eq('id', activeAlloc.id);

    // 5. Create new active allocation
    const { data: newAlloc, error: insErr } = await supabase
        .from('student_batch_allocations')
        .insert([{
            student_id: studentId,
            class_id: targetBatch.class_id,
            batch_id: targetBatchId,
            allocated_by: performedBy,
            status: 'ACTIVE'
        }])
        .select()
        .single();
    throwIfError({ error: insErr });

    // 6. Record immutable audit log
    await supabase
        .from('batch_transfer_logs')
        .insert([{
            student_id: studentId,
            transfer_type: 'BATCH_TRANSFER',
            from_class_id: activeAlloc.class_id,
            to_class_id: targetBatch.class_id,
            from_batch_id: activeAlloc.batch_id,
            to_batch_id: targetBatchId,
            performed_by: performedBy,
            reason
        }]);

    return {
        status: 'success',
        message: 'Student batch transfer successful',
        old_allocation_id: activeAlloc.id,
        new_allocation: newAlloc
    };
}

/**
 * Transfers a student to a completely new Class and Practical Batch.
 */
async function transferStudentClass({ studentId, targetClassId, targetBatchId, reason = 'Class Promotion / Transfer', performedBy = null }) {
    if (!studentId || !targetClassId || !targetBatchId) {
        throw new Error('studentId, targetClassId, and targetBatchId are required');
    }

    // Verify target batch belongs to target class
    const { data: batch, error: bErr } = await supabase
        .from('practical_batches')
        .select('id, class_id')
        .eq('id', targetBatchId)
        .single();
    if (bErr || !batch || batch.class_id !== targetClassId) {
        throw new Error('Invalid Transfer: Target batch does not belong to target class');
    }

    return transferStudentBatch({
        studentId,
        targetBatchId,
        reason,
        performedBy
    });
}

// ── 5. FACULTY ALLOCATION ENGINE ─────────────────────────────────────────────

/**
 * Assigns a faculty member to:
 * - Entire Class (Theory): batchId is null
 * - Specific Batch (Practical): batchId is required
 */
async function allocateFaculty({ facultyId, classId, batchId = null, subjectId = null, subjectName = 'General Subject', allocationType }) {
    if (!facultyId || !classId || !allocationType) {
        throw new Error('facultyId, classId, and allocationType (THEORY|PRACTICAL) are required');
    }

    if (allocationType === 'PRACTICAL' && !batchId) {
        throw new Error('batchId is required for PRACTICAL lab allocation');
    }

    const { data: alloc, error } = await supabase
        .from('class_faculty_allocations')
        .insert([{
            faculty_id: facultyId,
            class_id: classId,
            batch_id: allocationType === 'THEORY' ? null : batchId,
            subject_id: subjectId,
            subject_name: subjectName,
            allocation_type: allocationType
        }])
        .select()
        .single();

    throwIfError({ error });
    return alloc;
}

async function listFacultyAllocations(filters = {}) {
    let query = supabase.from('v_faculty_allocation_report').select('*');
    if (filters.class_id) query = query.eq('class_id', filters.class_id);
    if (filters.faculty_id) query = query.eq('faculty_id', filters.faculty_id);
    const { data, error } = await query;
    throwIfError({ error });
    return data || [];
}

// ── 6. ATTENDANCE & TIMETABLE INTEGRATION ────────────────────────────────────

/**
 * Returns the exact student roster for attendance recording:
 * - Whole Class for Theory attendance
 * - Selected Batch for Practical lab attendance
 */
async function getAttendanceRoster({ classId, batchId, sessionType = 'THEORY' }) {
    if (!classId) throw new Error('classId is required');

    let query = supabase.from('v_student_allocation_report').select('*').eq('class_id', classId);

    if (sessionType === 'PRACTICAL' && batchId) {
        query = query.eq('batch_id', batchId);
    }

    const { data, error } = await query.order('student_name', { ascending: true });
    throwIfError({ error });
    return {
        class_id: classId,
        batch_id: sessionType === 'PRACTICAL' ? batchId : null,
        session_type: sessionType,
        student_count: data ? data.length : 0,
        roster: data || []
    };
}

async function createTimetableEntry(data) {
    const {
        class_id,
        batch_id = null,
        subject_id = null,
        subject_name,
        faculty_id = null,
        day_of_week,
        start_time,
        end_time,
        room_or_lab = 'Room 101',
        session_type = 'THEORY'
    } = data;

    if (!class_id || !subject_name || !day_of_week || !start_time || !end_time || !session_type) {
        throw new Error('Missing required timetable fields');
    }

    const { data: entry, error } = await supabase
        .from('academic_timetables')
        .insert([{
            class_id,
            batch_id: session_type === 'THEORY' ? null : batch_id,
            subject_id,
            subject_name,
            faculty_id,
            day_of_week,
            start_time,
            end_time,
            room_or_lab,
            session_type,
            is_active: true
        }])
        .select()
        .single();

    throwIfError({ error });
    return entry;
}

/**
 * Returns integrated timetable for a student/faculty:
 * Combines Whole Class Theory lectures + Selected Batch Practical sessions.
 */
async function getTimetable({ classId, batchId = null }) {
    if (!classId) throw new Error('classId is required');

    // Get all class theory entries
    const { data: theoryList, error: tErr } = await supabase
        .from('academic_timetables')
        .select('*')
        .eq('class_id', classId)
        .eq('session_type', 'THEORY')
        .eq('is_active', true);
    throwIfError({ error: tErr });

    let practicalList = [];
    if (batchId) {
        const { data: pList, error: pErr } = await supabase
            .from('academic_timetables')
            .select('*')
            .eq('batch_id', batchId)
            .eq('session_type', 'PRACTICAL')
            .eq('is_active', true);
        throwIfError({ error: pErr });
        practicalList = pList || [];
    }

    const combined = [...(theoryList || []), ...practicalList];
    return combined;
}

// ── 7. ENTERPRISE REPORTING ENGINE ───────────────────────────────────────────

async function generateReport(reportType, filters = {}) {
    switch (reportType) {
        case 'CLASS_REPORT': {
            let query = supabase.from('v_class_strength_summary').select('*');
            if (filters.program_name) query = query.eq('program_name', filters.program_name);
            if (filters.academic_year) query = query.eq('academic_year', filters.academic_year);
            const { data, error } = await query;
            throwIfError({ error });
            return data || [];
        }
        case 'BATCH_REPORT':
        case 'BATCH_CAPACITY_REPORT': {
            let query = supabase.from('v_batch_capacity_report').select('*');
            if (filters.class_id) query = query.eq('class_id', filters.class_id);
            const { data, error } = await query;
            throwIfError({ error });
            return data || [];
        }
        case 'STUDENT_ALLOCATION_REPORT': {
            let query = supabase.from('v_student_allocation_report').select('*');
            if (filters.class_id) query = query.eq('class_id', filters.class_id);
            if (filters.batch_id) query = query.eq('batch_id', filters.batch_id);
            const { data, error } = await query;
            throwIfError({ error });
            return data || [];
        }
        case 'FACULTY_ALLOCATION_REPORT': {
            let query = supabase.from('v_faculty_allocation_report').select('*');
            if (filters.class_id) query = query.eq('class_id', filters.class_id);
            const { data, error } = await query;
            throwIfError({ error });
            return data || [];
        }
        default:
            throw new Error(`Unsupported report type: ${reportType}`);
    }
}

module.exports = {
    createClass,
    listClasses,
    getClassById,
    createBatch,
    listBatches,
    getBatchById,
    autoGenerateBatches,
    manualAllocateStudent,
    autoAllocateStudents,
    bulkAllocateStudents,
    transferStudentBatch,
    transferStudentClass,
    allocateFaculty,
    listFacultyAllocations,
    getAttendanceRoster,
    createTimetableEntry,
    getTimetable,
    generateReport
};
