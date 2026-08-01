// backend/jobs/cronJobs.js

const cron = require('node-cron');
const workflowService = require('../services/workflowAutomationService');

function initCronJobs() {
    console.log('[Cron] Initializing background jobs...');

    // Daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
        console.log(`[Cron] Executing nightly workflow checks: ${new Date().toISOString()}`);
        try {
            await workflowService.autoProcessCompletedSemesters();
        } catch (error) {
            console.error(`[Cron] Nightly workflow failed:`, error);
        }
    });

    console.log('[Cron] Background jobs scheduled.');
}

module.exports = {
    initCronJobs
};
