// backend/controllers/batchManagementController.js
// REST Controller for Phase 6: Enterprise Class & Practical Batch Management System

const batchService = require('../services/batchManagementService');

// ── 1. ACADEMIC CLASSES ──────────────────────────────────────────────────────
exports.createClass = async (req, res) => {
    try {
        const result = await batchService.createClass(req.body);
        return res.status(201).json({ status: 'success', data: result });
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

exports.listClasses = async (req, res) => {
    try {
        const result = await batchService.listClasses(req.query);
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getClassById = async (req, res) => {
    try {
        const result = await batchService.getClassById(req.params.id);
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        return res.status(404).json({ status: 'error', message: error.message });
    }
};

// ── 2. PRACTICAL BATCHES ─────────────────────────────────────────────────────
exports.createBatch = async (req, res) => {
    try {
        const result = await batchService.createBatch(req.body);
        return res.status(201).json({ status: 'success', data: result });
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

exports.listBatches = async (req, res) => {
    try {
        const result = await batchService.listBatches(req.query);
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getBatchById = async (req, res) => {
    try {
        const result = await batchService.getBatchById(req.params.id);
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        return res.status(404).json({ status: 'error', message: error.message });
    }
};

// ── 3. AUTOMATIC BATCH GENERATION ────────────────────────────────────────────
exports.autoGenerateBatches = async (req, res) => {
    try {
        const result = await batchService.autoGenerateBatches(req.body);
        return res.status(201).json(result);
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

// ── 4. STUDENT ALLOCATION & TRANSFERS ────────────────────────────────────────
exports.manualAllocateStudent = async (req, res) => {
    try {
        const result = await batchService.manualAllocateStudent({
            ...req.body,
            allocatedBy: req.user ? req.user.id : null
        });
        return res.status(201).json({ status: 'success', data: result });
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

exports.autoAllocateStudents = async (req, res) => {
    try {
        const result = await batchService.autoAllocateStudents({
            ...req.body,
            allocatedBy: req.user ? req.user.id : null
        });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

exports.bulkAllocateStudents = async (req, res) => {
    try {
        const result = await batchService.bulkAllocateStudents({
            ...req.body,
            allocatedBy: req.user ? req.user.id : null
        });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

exports.transferStudentBatch = async (req, res) => {
    try {
        const result = await batchService.transferStudentBatch({
            ...req.body,
            performedBy: req.user ? req.user.id : null
        });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

exports.transferStudentClass = async (req, res) => {
    try {
        const result = await batchService.transferStudentClass({
            ...req.body,
            performedBy: req.user ? req.user.id : null
        });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

// ── 5. FACULTY ALLOCATION ────────────────────────────────────────────────────
exports.allocateFaculty = async (req, res) => {
    try {
        const result = await batchService.allocateFaculty(req.body);
        return res.status(201).json({ status: 'success', data: result });
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

exports.listFacultyAllocations = async (req, res) => {
    try {
        const result = await batchService.listFacultyAllocations(req.query);
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

// ── 6. ATTENDANCE & TIMETABLE INTEGRATION ────────────────────────────────────
exports.getAttendanceRoster = async (req, res) => {
    try {
        const { classId, batchId, sessionType } = req.query;
        const result = await batchService.getAttendanceRoster({ classId, batchId, sessionType });
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

exports.createTimetableEntry = async (req, res) => {
    try {
        const result = await batchService.createTimetableEntry(req.body);
        return res.status(201).json({ status: 'success', data: result });
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

exports.getTimetable = async (req, res) => {
    try {
        const { classId, batchId } = req.query;
        const result = await batchService.getTimetable({ classId, batchId });
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

// ── 7. ENTERPRISE REPORTS ────────────────────────────────────────────────────
exports.generateReport = async (req, res) => {
    try {
        const { type } = req.params;
        const result = await batchService.generateReport(type, req.query);
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};
