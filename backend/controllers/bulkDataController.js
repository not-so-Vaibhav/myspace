// ==============================================================================
// PHASE 8: ENTERPRISE BULK DATA MANAGEMENT CONTROLLER
// TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Style
// ==============================================================================
// Controllers for template download, multi-stage validation preview, bulk import
// execution, filtered export, and audit trail inspection.
// ==============================================================================

const bulkDataService = require('../services/enterpriseBulkDataService');

const extractToken = (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return req.headers.authorization.split(' ')[1];
    }
    return req.headers['x-access-token'] || req.headers['x-supabase-auth'] || null;
};


// 1. Get / Download Import Template & Sample Data
const getTemplate = async (req, res) => {
    try {
        const { module, entity } = req.params;
        const format = req.query.format || 'CSV';
        const template = await bulkDataService.getTemplate(module, entity, format);

        if (req.query.download === 'true') {
            const ext = format.toLowerCase() === 'csv' ? 'csv' : 'json';
            res.setHeader('Content-Type', format.toLowerCase() === 'csv' ? 'text/csv' : 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=${module}_${entity}_template.${ext}`);
            return res.status(200).send(template.content);
        }

        res.status(200).json({ success: true, data: template });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 2. Validate Import File / Payload (Preview Screen)
const validateImport = async (req, res) => {
    try {
        const { module, entity } = req.params;
        let rows = [];

        if (req.file && req.file.buffer) {
            const format = req.file.originalname.endsWith('.json') ? 'JSON' : 'CSV';
            rows = bulkDataService.parseFileBuffer(req.file.buffer, format);
        } else if (req.body && Array.isArray(req.body.rows)) {
            rows = req.body.rows;
        } else if (req.body && req.body.content) {
            rows = bulkDataService.parseFileBuffer(Buffer.from(req.body.content, 'utf8'), req.body.format || 'CSV');
        } else {
            return res.status(400).json({ success: false, message: 'No file or row data provided for validation.' });
        }

        const preview = await bulkDataService.validateImport(module, entity, rows);
        res.status(200).json({ success: true, data: preview });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 3. Execute Bulk Import with Row-Level Error Logging
const executeImport = async (req, res) => {
    try {
        const { module, entity } = req.params;
        let rows = [];

        if (req.file && req.file.buffer) {
            const format = req.file.originalname.endsWith('.json') ? 'JSON' : 'CSV';
            rows = bulkDataService.parseFileBuffer(req.file.buffer, format);
        } else if (req.body && Array.isArray(req.body.rows)) {
            rows = req.body.rows;
        } else if (req.body && req.body.content) {
            rows = bulkDataService.parseFileBuffer(Buffer.from(req.body.content, 'utf8'), req.body.format || 'CSV');
        } else {
            return res.status(400).json({ success: false, message: 'No rows or file provided for bulk import.' });
        }

        const userContext = {
            id: req.user?.id || req.body.user_id || '00000000-0000-0000-0000-000000000000',
            email: req.user?.email || req.body.user_email || 'admin@mit-learn.edu',
            role: req.user?.role || req.body.user_role || 'admin',
            ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
            token: extractToken(req)
        };

        const options = {
            partial_success: req.body.partial_success !== undefined ? Boolean(req.body.partial_success) : true
        };

        const result = await bulkDataService.executeImport(module, entity, rows, userContext, options);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 4. Export Filtered Data with Role-Based Security Control
const exportData = async (req, res) => {
    try {
        const { module, entity } = req.params;
        const filters = req.body.filters || {};
        const exportFormat = req.body.export_format || req.query.export_format || 'CSV';

        const userContext = {
            id: req.user?.id || req.body.user_id || null,
            email: req.user?.email || req.body.user_email || null,
            role: req.user?.role || req.body.user_role || 'admin',
            ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
            token: extractToken(req)
        };

        const result = await bulkDataService.exportData(module, entity, filters, exportFormat, userContext);

        if (req.query.download === 'true') {
            res.setHeader('Content-Type', result.mime_type);
            res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
            return res.status(200).send(result.content);
        }

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 5. Inspect Bulk Data Operations Audit Logs
const getAuditLogs = async (req, res) => {
    try {
        const filters = {
            module_name: req.query.module_name,
            operation_type: req.query.operation_type,
            status: req.query.status
        };
        const pagination = {
            limit: Number(req.query.limit) || 50,
            offset: Number(req.query.offset) || 0
        };
        const logs = await bulkDataService.getAuditLogs(filters, pagination);
        res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 6. Get Row-Level Import Errors for a Specific Audit ID
const getImportErrors = async (req, res) => {
    try {
        const { auditId } = req.params;
        const errors = await bulkDataService.getImportErrors(auditId);
        res.status(200).json({ success: true, count: errors.length, data: errors });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    getTemplate,
    validateImport,
    executeImport,
    exportData,
    getAuditLogs,
    getImportErrors
};
