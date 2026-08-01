// ==============================================================================
// PHASE 8: ENTERPRISE BULK DATA MANAGEMENT ROUTES
// TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Style
// ==============================================================================
// Express routes mounted at /api/bulk-data supporting file uploads via multer,
// template download, validation preview, bulk import, filtered export, and audit.
// ==============================================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const bulkDataController = require('../controllers/bulkDataController');

// Configure multer memory storage for lightweight file parsing
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// 1. Template & Sample Data Download
router.get('/templates/:module/:entity', bulkDataController.getTemplate);

// 2. Pre-import Multi-Stage Validation Preview
router.post('/validate/:module/:entity', upload.single('file'), bulkDataController.validateImport);

// 3. Bulk Import Execution with Error Logging
router.post('/import/:module/:entity', upload.single('file'), bulkDataController.executeImport);

// 4. Filtered Data Export with RBAC
router.post('/export/:module/:entity', bulkDataController.exportData);

// 5. Audit Trail & Error Logs
router.get('/audit', bulkDataController.getAuditLogs);
router.get('/errors/:auditId', bulkDataController.getImportErrors);

module.exports = router;
