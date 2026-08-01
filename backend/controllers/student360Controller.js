// backend/controllers/student360Controller.js
// Student 360° Profile Controller — HTTP handlers for 360 profile,
// search engine, advanced filters, timeline, academic records, activity history, and export.

const service = require('../services/student360Service');

async function search(req, res, next) {
    try {
        const result = await service.searchStudents({
            query: req.query.query || req.query.search,
            department: req.query.department,
            program: req.query.program,
            semester: req.query.semester,
            status: req.query.status,
            classId: req.query.classId || req.query.class_id,
            batchId: req.query.batchId || req.query.batch_id,
            year: req.query.year || req.query.academic_year,
            minAttendance: req.query.minAttendance,
            minSgpa: req.query.minSgpa,
            minCgpa: req.query.minCgpa,
            minCredits: req.query.minCredits,
            promotionStatus: req.query.promotionStatus,
            graduationStatus: req.query.graduationStatus,
            page: req.query.page || 1,
            limit: req.query.limit || 25
        });
        res.json({ status: 'ok', ...result });
    } catch (err) {
        next(err);
    }
}

async function getProfile(req, res, next) {
    try {
        const profile = await service.getStudent360Profile(req.params.studentId);
        res.json({ status: 'ok', data: profile });
    } catch (err) {
        next(err);
    }
}

async function getTimeline(req, res, next) {
    try {
        const timeline = await service.getStudentTimeline(req.params.studentId);
        res.json({ status: 'ok', data: timeline });
    } catch (err) {
        next(err);
    }
}

async function getAcademicRecord(req, res, next) {
    try {
        const record = await service.getStudentAcademicRecord(req.params.studentId);
        res.json({ status: 'ok', data: record });
    } catch (err) {
        next(err);
    }
}

async function getActivityHistory(req, res, next) {
    try {
        const history = await service.getStudentActivityHistory(req.params.studentId);
        res.json({ status: 'ok', data: history });
    } catch (err) {
        next(err);
    }
}

async function exportProfile(req, res, next) {
    try {
        const exported = await service.exportStudent360Report(
            req.params.studentId,
            req.query.format || 'csv'
        );
        res.json({ status: 'ok', data: exported });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    search,
    getProfile,
    getTimeline,
    getAcademicRecord,
    getActivityHistory,
    exportProfile
};
