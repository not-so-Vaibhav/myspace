// backend/controllers/reportingController.js
// Phase 7: Enterprise Reporting & Analytics Controller

const reportingService = require('../services/enterpriseReportingService');

// 1. Load Report Catalog
const getCatalog = async (req, res) => {
    try {
        const { category } = req.query;
        const catalog = await reportingService.getReportCatalog(category, req.user);
        res.status(200).json({ success: true, count: catalog.length, data: catalog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Generate Enterprise Report
const generateReport = async (req, res) => {
    try {
        const { report_code, filters = {}, pagination = {}, date_preset = null } = req.body;
        if (!report_code) {
            return res.status(400).json({ success: false, message: 'report_code is required.' });
        }

        // Apply date preset if provided
        const mergedFilters = { ...filters };
        if (date_preset) {
            const dateRange = reportingService.resolveDateFilter(date_preset, filters.start_date, filters.end_date);
            if (dateRange.start) mergedFilters.date_from = dateRange.start;
            if (dateRange.end) mergedFilters.date_to = dateRange.end;
        }

        const result = await reportingService.generateReport(report_code, mergedFilters, pagination, req.user || {});
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 3. Analytics Dashboard
const getAnalyticsDashboard = async (req, res) => {
    try {
        const filters = req.query || {};
        const data = await reportingService.getAnalyticsDashboard(filters);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Student Academic Timeline
const getStudentTimeline = async (req, res) => {
    try {
        const { studentId } = req.params;
        const filters = req.query || {};
        const timeline = await reportingService.getStudentTimeline(studentId, filters, req.user);
        res.status(200).json({ success: true, count: timeline ? timeline.length : 0, data: timeline || [] });
    } catch (error) {
        console.error('getStudentTimeline controller warning:', error.message);
        res.status(200).json({ success: true, count: 0, data: [] });
    }
};

// 5. Add Timeline Event
const addTimelineEvent = async (req, res) => {
    try {
        const { student_id, event_type, title, description, module_name, metadata, event_date } = req.body;
        const event = await reportingService.addTimelineEvent({
            studentId: student_id,
            eventType: event_type,
            title,
            description,
            moduleName: module_name,
            performedBy: req.user?.id || null,
            performedByName: req.user?.full_name || req.user?.email || 'Admin / Faculty',
            metadata,
            eventDate: event_date
        });
        res.status(201).json({ success: true, data: event });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 6. Manage Saved & Favorite Reports
const manageSavedReports = async (req, res) => {
    try {
        const { action = 'LIST', ...reportData } = req.body;
        const userId = req.user?.id || req.body.user_id;
        const result = await reportingService.manageSavedReports(userId, action, reportData);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 7. Manage Scheduled Reports
const manageScheduledReports = async (req, res) => {
    try {
        const { action = 'LIST', ...scheduleData } = req.body;
        if (req.user?.id) scheduleData.created_by = req.user.id;
        const result = await reportingService.manageScheduledReports(action, scheduleData);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 8. Download / Export Report
const exportReport = async (req, res) => {
    try {
        const { report_code, filters = {}, format = 'CSV' } = req.body;
        const result = await reportingService.generateReport(report_code, filters, { page: 1, limit: 1000 }, req.user || {});
        const rows = result.rows || [];

        if (rows.length === 0) {
            return res.status(200).send('No records found for the selected filters.');
        }

        const headers = Object.keys(rows[0]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => headers.map(h => {
                const val = row[h];
                if (val === null || val === undefined) return '';
                if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(','))
        ].join('\n');

        if (format.toUpperCase() === 'EXCEL' || format.toUpperCase() === 'CSV') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${result.report_code}_export_${Date.now()}.csv`);
            return res.status(200).send(csvContent);
        }

        res.status(200).json({ success: true, export_format: format, row_count: rows.length, data: rows });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    getCatalog,
    generateReport,
    getAnalyticsDashboard,
    getStudentTimeline,
    addTimelineEvent,
    manageSavedReports,
    manageScheduledReports,
    exportReport
};
