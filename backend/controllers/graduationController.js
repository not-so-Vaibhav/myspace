// backend/controllers/graduationController.js

const graduationService = require('../services/graduationService');

exports.checkEligibility = async (req, res, next) => {
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
        
        const eligibility = await graduationService.checkEligibility(studentId);
        
        res.status(200).json({
            status: 'success',
            data: eligibility
        });
    } catch (error) {
        error.status = 500;
        next(error);
    }
};

exports.processGraduation = async (req, res, next) => {
    try {
        let { studentId } = req.params;
        const { force, remarks } = req.body;
        const processedBy = req.user?.id; // Assuming auth middleware attaches user
        
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
        
        const result = await graduationService.processGraduation(studentId, processedBy, force, remarks);
        
        res.status(200).json(result);
    } catch (error) {
        error.status = 400; // Client error if not eligible
        next(error);
    }
};
