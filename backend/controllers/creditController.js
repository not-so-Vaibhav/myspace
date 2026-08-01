// backend/controllers/creditController.js

const creditEngineService = require('../services/creditEngineService');
const enterpriseCreditService = require('../services/enterpriseCreditService');

// ── EXISTING METHODS (ZERO REGRESSION) ────────────────────────────────────────

exports.getStudentMetrics = async (req, res, next) => {
    try {
        const { studentId } = req.params;
        const { semesterId } = req.query;
        
        const metrics = await creditEngineService.calculateStudentMetrics(studentId, semesterId);
        
        res.status(200).json({
            status: 'success',
            data: metrics
        });
    } catch (error) {
        error.status = 500;
        next(error);
    }
};

exports.recalculateMetrics = async (req, res, next) => {
    try {
        const { studentId } = req.params;
        const { semesterId } = req.body;
        
        if (!semesterId) {
            return res.status(400).json({ status: 'error', message: 'semesterId is required' });
        }
        
        const metrics = await creditEngineService.triggerRecalculation(studentId, semesterId);
        await enterpriseCreditService.triggerCreditSynchronization(studentId, 'MANUAL_RECALC');
        
        res.status(200).json({
            status: 'success',
            message: 'Metrics recalculated successfully',
            data: metrics
        });
    } catch (error) {
        error.status = 500;
        next(error);
    }
};

exports.getTranscript = async (req, res, next) => {
    try {
        let { studentId } = req.params;
        
        // If not a UUID, assume it is an enrollment_no and look up the student ID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(studentId)) {
            const supabase = require('../config/supabaseClient');
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('enrollment_no', studentId)
                .single();
            
            if (profileError || !profile) {
                return res.status(404).json({
                    status: 'fail',
                    message: `Student with enrollment number "${studentId}" not found`
                });
            }
            studentId = profile.id;
        }
        
        const transcript = await creditEngineService.generateTranscript(studentId);
        
        res.status(200).json({
            status: 'success',
            data: transcript
        });
    } catch (error) {
        error.status = 500;
        next(error);
    }
};

// ── PHASE 5 ENTERPRISE ACADEMIC CREDIT SYSTEM METHODS ─────────────────────────

exports.getStudentCreditSummary = async (req, res, next) => {
    try {
        const { studentId } = req.params;
        const { semesterId } = req.query;
        const summary = await enterpriseCreditService.getStudentCreditSummary(studentId, semesterId);
        res.status(200).json({
            status: 'success',
            data: summary
        });
    } catch (error) {
        error.status = 500;
        next(error);
    }
};

exports.validateRegistrationCredits = async (req, res, next) => {
    try {
        const { studentId, semesterId, proposedCourses } = req.body;
        const validation = await enterpriseCreditService.validateRegistrationCredits({
            studentId,
            semesterId,
            proposedCourses: proposedCourses || []
        });
        res.status(200).json({
            status: 'success',
            data: validation
        });
    } catch (error) {
        if (error.code === 'ERROR_CREDIT_OVERFLOW' || error.code === 'ERROR_ELECTIVE_OVERFLOW' || error.code === 'ERROR_OPEN_ELECTIVE_OVERFLOW') {
            return res.status(400).json({
                status: 'error',
                code: error.code,
                message: error.message
            });
        }
        error.status = 500;
        next(error);
    }
};

exports.getCreditRules = async (req, res, next) => {
    try {
        const rules = await enterpriseCreditService.listCreditRules();
        res.status(200).json({
            status: 'success',
            data: rules
        });
    } catch (error) {
        error.status = 500;
        next(error);
    }
};

exports.upsertCreditRule = async (req, res, next) => {
    try {
        const rule = await enterpriseCreditService.upsertCreditRule(req.body);
        res.status(200).json({
            status: 'success',
            data: rule
        });
    } catch (error) {
        error.status = 500;
        next(error);
    }
};

exports.getCreditReports = async (req, res, next) => {
    try {
        const { type } = req.params;
        const reports = await enterpriseCreditService.generateCreditReport(type, req.query);
        res.status(200).json({
            status: 'success',
            data: reports
        });
    } catch (error) {
        error.status = 500;
        next(error);
    }
};

exports.bulkRecalculateCredits = async (req, res, next) => {
    try {
        const { studentIds } = req.body;
        const results = [];
        if (Array.isArray(studentIds) && studentIds.length > 0) {
            for (const sId of studentIds) {
                const resItem = await enterpriseCreditService.triggerCreditSynchronization(sId, 'BULK_ADMIN_SYNC');
                results.push(resItem);
            }
        }
        res.status(200).json({
            status: 'success',
            message: `Synchronized ${results.length} students`,
            data: results
        });
    } catch (error) {
        error.status = 500;
        next(error);
    }
};
