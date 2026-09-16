// backend/controllers/evaluationController.js
// REST Controller for Phase 10: Subject Evaluation & Continuous Assessment System

const evaluationService = require('../services/evaluationService');
const { createAuthenticatedClient } = require('../config/supabaseClient');

function getDbClient(req) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    return token ? createAuthenticatedClient(token) : null;
}

exports.getFacultyAllocations = async (req, res) => {
    try {
        const facultyId = req.query.facultyId || req.user?.id;
        if (!facultyId) {
            return res.status(400).json({ status: 'error', message: 'facultyId is required' });
        }
        const dbClient = getDbClient(req);
        const data = await evaluationService.getFacultyAllocations(facultyId, dbClient);
        return res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error('getFacultyAllocations error:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getEvaluationSheet = async (req, res) => {
    try {
        const { allocationId } = req.params;
        const facultyId = req.user?.id;
        const dbClient = getDbClient(req);
        const data = await evaluationService.getEvaluationSheet(allocationId, facultyId, dbClient);
        return res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error('getEvaluationSheet error:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.saveBatchEvaluations = async (req, res) => {
    try {
        const { allocation_id, records, faculty_id, max_marks_config } = req.body;
        const effectiveFacultyId = faculty_id || req.user?.id;
        const dbClient = getDbClient(req);
        const result = await evaluationService.saveBatchEvaluations(
            allocation_id,
            records,
            effectiveFacultyId,
            max_marks_config,
            dbClient
        );
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        console.error('saveBatchEvaluations error:', error);
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

exports.lockEvaluationSheet = async (req, res) => {
    try {
        const { allocationId } = req.params;
        const { is_locked, faculty_id } = req.body;
        const effectiveFacultyId = faculty_id || req.user?.id;
        const dbClient = getDbClient(req);
        const result = await evaluationService.lockEvaluationSheet(
            allocationId,
            effectiveFacultyId,
            is_locked !== undefined ? is_locked : true,
            dbClient
        );
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        console.error('lockEvaluationSheet error:', error);
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

exports.getStudentEvaluations = async (req, res) => {
    try {
        const studentId = req.query.studentId || req.user?.id;
        if (!studentId) {
            return res.status(400).json({ status: 'error', message: 'studentId is required' });
        }
        const dbClient = getDbClient(req);
        const data = await evaluationService.getStudentEvaluations(studentId, dbClient);
        return res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error('getStudentEvaluations error:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getAllEvaluationsAdmin = async (req, res) => {
    try {
        const dbClient = getDbClient(req);
        const data = await evaluationService.getAllEvaluationsAdmin(req.query, dbClient);
        return res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error('getAllEvaluationsAdmin error:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
