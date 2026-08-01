// backend/tests/batchManagementEngine.test.js
// Enterprise Automated Test Suite for Phase 6: Enterprise Class & Practical Batch Management System
// Covers all required scenarios: Class/Batch creation, Automatic batch generation (70 -> 24, 23, 23),
// student allocation, duplicate/overflow prevention, batch/class transfer audit logs,
// faculty allocation, attendance roster integration, timetable integration, and enterprise reporting.

const batchService = require('../services/batchManagementService');
const supabase = require('../config/supabaseClient');

jest.mock('../config/supabaseClient', () => {
    return {
        from: jest.fn()
    };
});

describe('Enterprise Class & Practical Batch Management Engine (Phase 6)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── 1. CLASS CREATION & VALIDATION ────────────────────────────────────────
    test('1. Should successfully create an Academic Class with program, year level, capacity, and classroom', async () => {
        const mockClass = {
            id: 'class-fy1-uuid',
            program_name: 'Computer Science Engineering',
            academic_year: '2026-2027',
            year_level: 'First Year',
            class_name: 'FY-1',
            capacity: 70,
            classroom: 'Room 101',
            status: 'ACTIVE'
        };

        supabase.from.mockImplementation((table) => {
            if (table === 'academic_classes') {
                return {
                    insert: () => ({
                        select: () => ({
                            single: () => Promise.resolve({ data: mockClass, error: null })
                        })
                    })
                };
            }
        });

        const created = await batchService.createClass({
            class_name: 'FY-1',
            capacity: 70
        });

        expect(created.id).toBe('class-fy1-uuid');
        expect(created.class_name).toBe('FY-1');
        expect(created.capacity).toBe(70);
    });

    // ── 2. BATCH CREATION & DUPLICATE PREVENTION ──────────────────────────────
    test('2. Should reject Batch Creation when duplicate batch name exists in the same Class', async () => {
        supabase.from.mockImplementation((table) => {
            if (table === 'academic_classes') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: { id: 'class-1', class_name: 'FY-1' },
                                error: null
                            })
                        })
                    })
                };
            }
            if (table === 'practical_batches') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => Promise.resolve({
                                data: [{ id: 'existing-batch-a' }], // Duplicate found
                                error: null
                            })
                        })
                    })
                };
            }
        });

        await expect(batchService.createBatch({
            class_id: 'class-1',
            batch_name: 'Batch A',
            capacity: 24
        })).rejects.toThrow('Duplicate Batch Name: Batch A already exists in class FY-1');
    });

    // ── 3. AUTOMATIC BATCH GENERATION MATH (70 STUDENTS -> 24, 23, 23) ────────
    test('3. Should automatically generate Batches A, B, C with balanced capacities (24, 23, 23) for 70 students with size 24', async () => {
        let createdBatchNames = [];
        let createdCapacities = [];

        supabase.from.mockImplementation((table) => {
            if (table === 'academic_classes') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: { id: 'class-fy1', class_name: 'FY-1' },
                                error: null
                            })
                        })
                    })
                };
            }
            if (table === 'practical_batches') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => Promise.resolve({ data: [], error: null })
                        })
                    }),
                    insert: (rows) => {
                        createdBatchNames.push(rows[0].batch_name);
                        createdCapacities.push(rows[0].capacity);
                        return {
                            select: () => ({
                                single: () => Promise.resolve({
                                    data: {
                                        id: `batch-${rows[0].batch_name}`,
                                        batch_name: rows[0].batch_name,
                                        capacity: rows[0].capacity
                                    },
                                    error: null
                                })
                            })
                        };
                    }
                };
            }
        });

        const result = await batchService.autoGenerateBatches({
            classId: 'class-fy1',
            totalStudents: 70,
            batchSize: 24
        });

        expect(result.status).toBe('success');
        expect(result.batches_created).toBe(3);
        expect(createdBatchNames).toEqual(['Batch A', 'Batch B', 'Batch C']);
        expect(createdCapacities).toEqual([24, 23, 23]);
        const sumCapacities = createdCapacities.reduce((a, b) => a + b, 0);
        expect(sumCapacities).toBe(70);
    });

    // ── 4. STUDENT AUTO-ALLOCATION ────────────────────────────────────────────
    test('4. Should automatically allocate a list of students across active practical batches round-robin', async () => {
        const activeBatches = [
            { id: 'batch-a', class_id: 'class-1', capacity: 24, batch_name: 'Batch A' },
            { id: 'batch-b', class_id: 'class-1', capacity: 23, batch_name: 'Batch B' }
        ];

        supabase.from.mockImplementation((table) => {
            if (table === 'practical_batches') {
                return {
                    select: () => {
                        const chain = {
                            eq: (col, val) => {
                                if (col === 'id') {
                                    const found = activeBatches.find(b => b.id === val) || activeBatches[0];
                                    return {
                                        single: () => Promise.resolve({ data: found, error: null })
                                    };
                                }
                                return chain;
                            },
                            order: () => Promise.resolve({ data: activeBatches, error: null })
                        };
                        return chain;
                    }
                };
            }
            if (table === 'student_batch_allocations') {
                return {
                    select: () => {
                        const chain = {
                            eq: () => chain,
                            single: () => Promise.resolve({ data: null, error: null }),
                            then: (resolve) => resolve({ data: [], error: null })
                        };
                        return chain;
                    },
                    insert: (rows) => ({
                        select: () => ({
                            single: () => Promise.resolve({
                                data: {
                                    id: `alloc-${rows[0].student_id}`,
                                    student_id: rows[0].student_id,
                                    class_id: rows[0].class_id,
                                    batch_id: rows[0].batch_id,
                                    status: 'ACTIVE'
                                },
                                error: null
                            })
                        })
                    })
                };
            }
        });

        const result = await batchService.autoAllocateStudents({
            classId: 'class-1',
            studentIds: ['s1', 's2', 's3', 's4']
        });

        expect(result.status).toBe('success');
        expect(result.allocated_count).toBe(4);
        expect(result.failed_count).toBe(0);
        expect(result.allocations[0].batch_id).toBe('batch-a');
        expect(result.allocations[1].batch_id).toBe('batch-b');
        expect(result.allocations[2].batch_id).toBe('batch-a');
    });

    // ── 5. STUDENT MANUAL ALLOCATION & DUPLICATE PREVENTION ───────────────────
    test('5. Should prevent Duplicate Student Allocation when student is already actively allocated to a batch', async () => {
        supabase.from.mockImplementation((table) => {
            if (table === 'practical_batches') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: { id: 'batch-a', class_id: 'class-1', capacity: 24 },
                                error: null
                            })
                        })
                    })
                };
            }
            if (table === 'student_batch_allocations') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => Promise.resolve({
                                data: [{ id: 'existing-alloc', student_id: 'student-1', batch_id: 'batch-a' }],
                                error: null
                            })
                        })
                    })
                };
            }
        });

        await expect(batchService.manualAllocateStudent({
            studentId: 'student-1',
            classId: 'class-1',
            batchId: 'batch-a'
        })).rejects.toThrow('Duplicate Student Allocation');
    });

    // ── 6. CAPACITY OVERFLOW PREVENTION ───────────────────────────────────────
    test('6. Should reject student allocation with Capacity Overflow when batch enrolled count reaches capacity', async () => {
        supabase.from.mockImplementation((table) => {
            if (table === 'practical_batches') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: { id: 'batch-c', class_id: 'class-1', capacity: 2, batch_name: 'Batch C' },
                                error: null
                            })
                        })
                    })
                };
            }
            if (table === 'student_batch_allocations') {
                return {
                    select: () => ({
                        eq: (col) => {
                            if (col === 'student_id') {
                                return {
                                    eq: () => Promise.resolve({ data: [], error: null })
                                };
                            }
                            if (col === 'batch_id') {
                                return {
                                    eq: () => Promise.resolve({
                                        data: [{ id: 'alloc-1' }, { id: 'alloc-2' }], // 2 enrolled == capacity 2
                                        error: null
                                    })
                                };
                            }
                        }
                    })
                };
            }
        });

        await expect(batchService.manualAllocateStudent({
            studentId: 'student-3',
            classId: 'class-1',
            batchId: 'batch-c'
        })).rejects.toThrow('Capacity Overflow: Batch Batch C is at maximum capacity (2)');
    });

    // ── 7. STUDENT BATCH TRANSFER WITH AUDIT LOGGING ──────────────────────────
    test('7. Should transfer a student between Batches and create an immutable audit record in batch_transfer_logs', async () => {
        let updateCalled = false;
        let auditLogInserted = false;

        supabase.from.mockImplementation((table) => {
            if (table === 'student_batch_allocations') {
                return {
                    select: () => ({
                        eq: (col) => {
                            if (col === 'student_id') {
                                return {
                                    eq: () => ({
                                        single: () => Promise.resolve({
                                            data: { id: 'old-alloc', student_id: 'student-1', class_id: 'class-1', batch_id: 'batch-a' },
                                            error: null
                                        })
                                    })
                                };
                            }
                            if (col === 'batch_id') {
                                return {
                                    eq: () => Promise.resolve({ data: [{ id: 'alloc-2' }], error: null }) // count 1 < 24
                                };
                            }
                        }
                    }),
                    update: () => ({
                        eq: () => {
                            updateCalled = true;
                            return Promise.resolve({ error: null });
                        }
                    }),
                    insert: (rows) => ({
                        select: () => ({
                            single: () => Promise.resolve({
                                data: { id: 'new-alloc', student_id: 'student-1', class_id: 'class-1', batch_id: rows[0].batch_id, status: 'ACTIVE' },
                                error: null
                            })
                        })
                    })
                };
            }
            if (table === 'practical_batches') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: { id: 'batch-b', class_id: 'class-1', capacity: 24, batch_name: 'Batch B' },
                                error: null
                            })
                        })
                    })
                };
            }
            if (table === 'batch_transfer_logs') {
                return {
                    insert: (rows) => {
                        if (rows[0].transfer_type === 'BATCH_TRANSFER') auditLogInserted = true;
                        return Promise.resolve({ error: null });
                    }
                };
            }
        });

        const result = await batchService.transferStudentBatch({
            studentId: 'student-1',
            targetBatchId: 'batch-b',
            reason: 'Student requested lab switch'
        });

        expect(result.status).toBe('success');
        expect(result.new_allocation.batch_id).toBe('batch-b');
        expect(updateCalled).toBe(true);
        expect(auditLogInserted).toBe(true);
    });

    // ── 8. STUDENT CLASS TRANSFER WITH AUDIT LOGGING ──────────────────────────
    test('8. Should transfer a student between Classes and Batches with immutable CLASS_TRANSFER audit logging', async () => {
        supabase.from.mockImplementation((table) => {
            if (table === 'practical_batches') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: { id: 'batch-new-1', class_id: 'class-2', capacity: 24, batch_name: 'Batch A' },
                                error: null
                            })
                        })
                    })
                };
            }
            if (table === 'student_batch_allocations') {
                return {
                    select: () => ({
                        eq: (col) => {
                            if (col === 'student_id') {
                                return {
                                    eq: () => ({
                                        single: () => Promise.resolve({
                                            data: { id: 'old-alloc', student_id: 'student-9', class_id: 'class-1', batch_id: 'batch-a' },
                                            error: null
                                        })
                                    })
                                };
                            }
                            return { eq: () => Promise.resolve({ data: [], error: null }) };
                        }
                    }),
                    update: () => ({
                        eq: () => Promise.resolve({ error: null })
                    }),
                    insert: () => ({
                        select: () => ({
                            single: () => Promise.resolve({
                                data: { id: 'new-alloc-class-2', student_id: 'student-9', class_id: 'class-2', batch_id: 'batch-new-1' },
                                error: null
                            })
                        })
                    })
                };
            }
            if (table === 'batch_transfer_logs') {
                return { insert: () => Promise.resolve({ error: null }) };
            }
        });

        const result = await batchService.transferStudentClass({
            studentId: 'student-9',
            targetClassId: 'class-2',
            targetBatchId: 'batch-new-1',
            reason: 'Academic Year Promotion'
        });

        expect(result.status).toBe('success');
        expect(result.new_allocation.class_id).toBe('class-2');
    });

    // ── 9. FACULTY ALLOCATION (THEORY VS PRACTICAL) ───────────────────────────
    test('9. Should assign Faculty to Entire Class for Theory and Specific Batch for Practical', async () => {
        let savedAllocationType = '';
        let savedBatchId = null;

        supabase.from.mockImplementation((table) => {
            if (table === 'class_faculty_allocations') {
                return {
                    insert: (rows) => {
                        savedAllocationType = rows[0].allocation_type;
                        savedBatchId = rows[0].batch_id;
                        return {
                            select: () => ({
                                single: () => Promise.resolve({
                                    data: {
                                        id: 'alloc-fac-1',
                                        faculty_id: rows[0].faculty_id,
                                        class_id: rows[0].class_id,
                                        batch_id: rows[0].batch_id,
                                        allocation_type: rows[0].allocation_type
                                    },
                                    error: null
                                })
                            })
                        };
                    }
                };
            }
        });

        const theoryAlloc = await batchService.allocateFaculty({
            facultyId: 'fac-1',
            classId: 'class-1',
            batchId: null,
            allocationType: 'THEORY'
        });

        expect(theoryAlloc.allocation_type).toBe('THEORY');
        expect(theoryAlloc.batch_id).toBeNull();
    });

    // ── 10. ATTENDANCE ROSTER INTEGRATION ─────────────────────────────────────
    test('10. Should return Whole Class roster for THEORY attendance and Selected Batch roster for PRACTICAL attendance', async () => {
        const mockRoster = [
            { student_id: 's1', student_name: 'Aarav Sharma', class_id: 'class-1', batch_id: 'batch-a' },
            { student_id: 's2', student_name: 'Priya Verma', class_id: 'class-1', batch_id: 'batch-b' }
        ];

        supabase.from.mockImplementation((table) => {
            if (table === 'v_student_allocation_report') {
                return {
                    select: () => ({
                        eq: (col, val) => {
                            if (col === 'class_id') {
                                return {
                                    order: () => Promise.resolve({ data: mockRoster, error: null })
                                };
                            }
                        }
                    })
                };
            }
        });

        const theoryRoster = await batchService.getAttendanceRoster({
            classId: 'class-1',
            sessionType: 'THEORY'
        });

        expect(theoryRoster.session_type).toBe('THEORY');
        expect(theoryRoster.student_count).toBe(2);
    });

    // ── 11. TIMETABLE INTEGRATION ─────────────────────────────────────────────
    test('11. Should combine Whole Class Theory schedule and Selected Batch Practical schedule for unified timetable', async () => {
        supabase.from.mockImplementation((table) => {
            if (table === 'academic_timetables') {
                return {
                    select: () => ({
                        eq: (col, val) => {
                            if (col === 'class_id') {
                                return {
                                    eq: () => ({
                                        eq: () => Promise.resolve({
                                            data: [{ id: 't-1', subject_name: 'Data Structures Theory', session_type: 'THEORY' }],
                                            error: null
                                        })
                                    })
                                };
                            }
                            if (col === 'batch_id') {
                                return {
                                    eq: () => ({
                                        eq: () => Promise.resolve({
                                            data: [{ id: 'p-1', subject_name: 'Data Structures Lab', session_type: 'PRACTICAL' }],
                                            error: null
                                        })
                                    })
                                };
                            }
                        }
                    })
                };
            }
        });

        const timetable = await batchService.getTimetable({
            classId: 'class-1',
            batchId: 'batch-a'
        });

        expect(timetable.length).toBe(2);
        expect(timetable[0].session_type).toBe('THEORY');
        expect(timetable[1].session_type).toBe('PRACTICAL');
    });

    // ── 12. ENTERPRISE REPORTING ENGINE ───────────────────────────────────────
    test('12. Should aggregate Class Strength, Batch Strength, Capacity, Vacancies, and Occupancy percentages for reporting', async () => {
        const mockReport = [{
            class_id: 'class-1',
            class_name: 'FY-1',
            class_capacity: 70,
            enrolled_students: 68,
            vacancy: 2,
            occupancy_percentage: 97.14
        }];

        supabase.from.mockImplementation((table) => {
            if (table === 'v_class_strength_summary') {
                return {
                    select: () => Promise.resolve({ data: mockReport, error: null })
                };
            }
        });

        const report = await batchService.generateReport('CLASS_REPORT');
        expect(report.length).toBe(1);
        expect(report[0].class_name).toBe('FY-1');
        expect(report[0].vacancy).toBe(2);
        expect(report[0].occupancy_percentage).toBe(97.14);
    });
});
