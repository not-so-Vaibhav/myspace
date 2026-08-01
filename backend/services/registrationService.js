// backend/services/registrationService.js
// Enterprise 10-Point Validation Engine & Course Registration Lifecycle Service
const registrationRepository = require('../repositories/registrationRepository');

/**
 * 10-POINT VALIDATION ENGINE
 * Validates whether a student is allowed to register for an allocation.
 * Returns { valid: boolean, errors: string[], warnings: string[], course, window }
 */
async function validateRegistrationRequest(studentId, allocationId, options = {}) {
    const { isAdminOverride = false } = options;
    const errors = [];
    const warnings = [];

    // 1. Fetch Student Profile
    const student = await registrationRepository.findStudentProfile(studentId);
    if (!student) {
        errors.push(`Student profile not found for ID ${studentId}.`);
        return { valid: false, errors, warnings, student: null, course: null };
    }

    // 2. Check Academic Lifecycle Status / Fee Holds / Attendance Restrictions
    if (['detained', 'suspended', 'withdrawn', 'graduated'].includes((student.lifecycle_status || '').toLowerCase())) {
        errors.push(`Student is not eligible for course registration (Status: ${student.lifecycle_status}).`);
    }

    // 3. Fetch Allocation Details & Seat Utilization
    const allAvailable = await registrationRepository.findAvailableCoursesForStudent({});
    const course = allAvailable.find(c => c.allocation_id === allocationId);
    if (!course) {
        errors.push(`Course allocation (${allocationId}) not found or inactive.`);
        return { valid: false, errors, warnings, student, course: null };
    }

    // 4. Registration Window Validation
    const window = await registrationRepository.getActiveRegistrationWindow(null, course.semester_id);
    const now = new Date();
    if (!isAdminOverride) {
        if (!window) {
            errors.push('No active registration window is defined for this semester. Registration is currently closed.');
        } else if (window.status !== 'OPEN') {
            errors.push(`Registration window status is ${window.status}.`);
        } else {
            const startDate = new Date(window.start_date);
            const endDate = new Date(window.end_date);
            if (now < startDate) {
                errors.push(`Registration window opens on ${startDate.toLocaleDateString()}.`);
            } else if (now > endDate && !window.allow_late_registration) {
                errors.push(`Registration deadline passed on ${endDate.toLocaleDateString()}.`);
            }
        }
    }

    // 5. Duplicate Registration Check
    const existing = await registrationRepository.findExistingRegistration(studentId, allocationId);
    if (existing && ['REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE', 'PENDING_APPROVAL'].includes(existing.status)) {
        errors.push(`Student is already registered for "${course.subject_code} - ${course.subject_name}" (${existing.status}).`);
    }

    // 6. Seat Capacity Check
    if (!isAdminOverride) {
        const currentCount = course.enrolled_count || 0;
        const cap = course.capacity || 60;
        if (currentCount >= cap) {
            errors.push(`Course "${course.subject_code}" is FULL (${currentCount}/${cap} seats occupied).`);
        }
    }

    // 7. Maximum Credit Limit Validation
    const myRegistrations = await registrationRepository.findStudentRegistrations(studentId, course.semester_id);
    const activeRegs = myRegistrations.filter(r => ['REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE'].includes(r.status));
    const currentTotalCredits = activeRegs.reduce((sum, r) => sum + parseFloat(r.credits || 0), 0);
    const newCourseCredits = parseFloat(course.subject_credits || 3.0);
    const maxCredits = window?.max_credits || 26.0;

    if (!isAdminOverride && (currentTotalCredits + newCourseCredits) > maxCredits) {
        errors.push(`Credit limit exceeded: Adding ${newCourseCredits} credits would bring total to ${currentTotalCredits + newCourseCredits} (Max allowed: ${maxCredits}).`);
    }

    // 8. Minimum Credit Alert (Warning)
    const minCredits = window?.min_credits || 12.0;
    if ((currentTotalCredits + newCourseCredits) < minCredits) {
        warnings.push(`Note: Total registered credits (${currentTotalCredits + newCourseCredits}) is below minimum semester requirement (${minCredits}).`);
    }

    // 9. Prerequisite Clearance Check
    const prerequisites = await registrationRepository.findPrerequisitesForSubject(course.subject_id);
    if (prerequisites && prerequisites.length > 0 && !isAdminOverride) {
        const clearedSubjects = await registrationRepository.findClearedSubjectsForStudent(studentId);
        const clearedCodes = new Set(clearedSubjects.filter(s => s.is_cleared).map(s => s.subject_code));

        for (const prereq of prerequisites) {
            if (!clearedCodes.has(prereq.code)) {
                errors.push(`Prerequisite not cleared: You must complete "${prereq.code} - ${prereq.name}" before registering for ${course.subject_code}.`);
            }
        }
    }

    // 10. Backlog Restriction Check
    const backlogs = await registrationRepository.findPendingBacklogsForStudent(studentId);
    if (backlogs && backlogs.length > 0 && !isAdminOverride) {
        if (backlogs.length > 4) {
            errors.push(`Registration hold: You have ${backlogs.length} pending backlogs. Contact Academic Dean for clearance.`);
        } else {
            warnings.push(`You have ${backlogs.length} pending backlog(s).`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        student,
        course,
        window,
        currentTotalCredits,
        newCourseCredits
    };
}

/**
 * Executes Course Registration for a student.
 */
async function registerCourse(studentId, allocationId, performedBy, options = {}) {
    const { isAdminOverride = false, overrideReason = null, ipAddress = '127.0.0.1' } = options;

    const validation = await validateRegistrationRequest(studentId, allocationId, { isAdminOverride });
    if (!validation.valid && !isAdminOverride) {
        const errorMsg = validation.errors.join(' ');
        const err = new Error(errorMsg);
        err.statusCode = 400;
        err.validationErrors = validation.errors;
        throw err;
    }

    const { course } = validation;

    const existing = await registrationRepository.findExistingRegistration(studentId, allocationId);
    let registration;

    const status = isAdminOverride ? 'ADMIN_OVERRIDE' : 'REGISTERED';

    if (existing) {
        registration = await registrationRepository.updateRegistrationStatus(
            existing.id,
            status,
            overrideReason
        );
    } else {
        registration = await registrationRepository.createRegistration({
            student_id: studentId,
            allocation_id: allocationId,
            subject_id: course.subject_id,
            semester_id: course.semester_id,
            category: course.subject_category || 'Core',
            credits: course.subject_credits || 3.0,
            status,
            override_reason: overrideReason
        });
    }

    // Immutable Audit Log
    await registrationRepository.insertAuditLog({
        action: isAdminOverride ? 'ADMIN_OVERRIDE_REGISTER' : 'REGISTERED',
        student_id: studentId,
        allocation_id: allocationId,
        performed_by: performedBy || studentId,
        reason: overrideReason || 'Student self-registration',
        ip_address: ipAddress,
        details: {
            subject_code: course.subject_code,
            subject_name: course.subject_name,
            credits: course.subject_credits,
            category: course.subject_category,
            isAdminOverride
        }
    });

    return {
        registration,
        isAdminOverride: !!options.isAdminOverride,
        message: `Successfully registered for ${course.subject_code} - ${course.subject_name}`,
        warnings: validation.warnings
    };
}

/**
 * Drops a registered course (before deadline or via Admin override).
 */
async function dropCourse(studentId, allocationId, performedBy, options = {}) {
    const { isAdminOverride = false, reason = null, ipAddress = '127.0.0.1' } = options;

    const existing = await registrationRepository.findExistingRegistration(studentId, allocationId);
    if (!existing || !['REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE', 'PENDING_APPROVAL'].includes(existing.status)) {
        const err = new Error('Course registration not found or already dropped.');
        err.statusCode = 404;
        throw err;
    }

    // Check window deadline if not admin override
    if (!isAdminOverride) {
        const window = await registrationRepository.getActiveRegistrationWindow(null, existing.semester_id);
        const now = new Date();
        if (window && window.end_date && now > new Date(window.end_date)) {
            const err = new Error(`Drop deadline passed on ${new Date(window.end_date).toLocaleDateString()}. Admin override required.`);
            err.statusCode = 400;
            throw err;
        }
    }

    const dropped = await registrationRepository.updateRegistrationStatus(
        existing.id,
        'DROPPED',
        reason
    );

    // Audit log
    await registrationRepository.insertAuditLog({
        action: isAdminOverride ? 'ADMIN_OVERRIDE_DROP' : 'DROPPED',
        student_id: studentId,
        allocation_id: allocationId,
        performed_by: performedBy || studentId,
        reason: reason || 'Student self-drop',
        ip_address: ipAddress,
        details: {
            registration_id: existing.id,
            isAdminOverride
        }
    });

    return {
        registration: dropped,
        message: 'Course registration successfully dropped.'
    };
}

/**
 * Course Discovery for Student
 */
async function getStudentCourseDiscovery(studentId, filters = {}) {
    const student = await registrationRepository.findStudentProfile(studentId);
    if (!student) {
        throw new Error(`Student profile not found for ID ${studentId}`);
    }

    const availableCourses = await registrationRepository.findAvailableCoursesForStudent({
        departmentId: student.department,
        semesterId: filters.semesterId || null,
        search: filters.search,
        category: filters.category,
        credits: filters.credits
    });

    const myRegistrations = await registrationRepository.findStudentRegistrations(studentId, filters.semesterId || null);
    const myRegMap = new Map();
    myRegistrations.forEach(r => {
        myRegMap.set(r.allocation_id, r.status);
    });

    const enriched = await Promise.all(
        availableCourses.map(async (c) => {
            const prerequisites = await registrationRepository.findPrerequisitesForSubject(c.subject_id);
            const myStatus = myRegMap.get(c.allocation_id) || 'UNREGISTERED';
            const isFull = (c.enrolled_count || 0) >= (c.capacity || 60);

            return {
                ...c,
                my_registration_status: myStatus,
                is_full: isFull,
                prerequisites
            };
        })
    );

    return {
        student: {
            id: student.id,
            full_name: student.full_name,
            program: student.program || 'B.Tech',
            department: student.department || 'Computer Science',
            semester: student.semester || 1,
            batch: student.batch || 'B1'
        },
        courses: enriched
    };
}

/**
 * Student Registration Dashboard & Summary
 */
async function getStudentDashboardData(studentId) {
    const student = await registrationRepository.findStudentProfile(studentId);
    if (!student) {
        throw new Error(`Student profile not found: ${studentId}`);
    }

    const myRegistrations = await registrationRepository.findStudentRegistrations(studentId, null);
    const activeRegs = myRegistrations.filter(r => ['REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE'].includes(r.status));

    const totalCreditsRegistered = activeRegs.reduce((sum, r) => sum + parseFloat(r.credits || 0), 0);
    const coreCredits = activeRegs.filter(r => r.category === 'Core').reduce((sum, r) => sum + parseFloat(r.credits || 0), 0);
    const electiveCredits = activeRegs.filter(r => r.category !== 'Core').reduce((sum, r) => sum + parseFloat(r.credits || 0), 0);

    const window = await registrationRepository.getActiveRegistrationWindow(null, null);

    return {
        student: {
            id: student.id,
            full_name: student.full_name,
            email: student.email,
            department: student.department,
            semester: student.semester
        },
        window: window || { status: 'OPEN', min_credits: 12.0, max_credits: 26.0 },
        credits: {
            totalRegistered: totalCreditsRegistered,
            coreRegistered: coreCredits,
            electiveRegistered: electiveCredits,
            minimumRequired: window?.min_credits || 12.0,
            maximumAllowed: window?.max_credits || 26.0,
            remainingElectiveCredits: Math.max(0, (window?.max_credits || 26.0) - totalCreditsRegistered)
        },
        registrations: myRegistrations
    };
}

/**
 * Faculty Registration Management
 */
async function getFacultyRegistrationSummary(facultyId) {
    const courses = await registrationRepository.findFacultyAllocatedCourses(facultyId);
    return {
        facultyId,
        coursesCount: courses.length,
        totalEnrolledStudents: courses.reduce((sum, c) => sum + (c.enrolled_count || 0), 0),
        courses
    };
}

async function getFacultyCourseStudents(allocationId) {
    const students = await registrationRepository.findStudentsInCourse(allocationId);
    return {
        allocationId,
        totalStudents: students.length,
        students
    };
}

/**
 * Admin Bulk Actions
 */
async function adminBulkRegister(registrations, performedBy, ipAddress = '127.0.0.1') {
    const results = [];
    for (const reg of registrations) {
        try {
            const res = await registerCourse(
                reg.studentId,
                reg.allocationId,
                performedBy,
                { isAdminOverride: true, overrideReason: reg.reason || 'Bulk admin import', ipAddress }
            );
            results.push({ studentId: reg.studentId, allocationId: reg.allocationId, status: 'SUCCESS', res });
        } catch (err) {
            results.push({ studentId: reg.studentId, allocationId: reg.allocationId, status: 'FAILED', error: err.message });
        }
    }
    return {
        total: registrations.length,
        successful: results.filter(r => r.status === 'SUCCESS').length,
        failed: results.filter(r => r.status === 'FAILED').length,
        results
    };
}

async function getAdminAnalytics() {
    return await registrationRepository.getAnalyticsSummary();
}

module.exports = {
    validateRegistrationRequest,
    registerCourse,
    dropCourse,
    getStudentCourseDiscovery,
    getStudentDashboardData,
    getFacultyRegistrationSummary,
    getFacultyCourseStudents,
    adminBulkRegister,
    getAdminAnalytics
};
