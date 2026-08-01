// frontend/src/api/reportApi.js
// Phase 7: Enterprise Reporting & Analytics API Client
// Uses the same no-auth axios pattern as batchApi.js, creditApi.js, etc.

import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api/reports';

const reportApi = {
    // 1. Load report catalog
    getCatalog: async (category = '') => {
        const url = category ? `${BASE_URL}/catalog?category=${encodeURIComponent(category)}` : `${BASE_URL}/catalog`;
        const res = await axios.get(url);
        return res.data;
    },

    // 2. Generate report
    generateReport: async (payload) => {
        const res = await axios.post(`${BASE_URL}/generate`, payload);
        return res.data;
    },

    // 3. Analytics dashboard
    getAnalyticsDashboard: async (params = {}) => {
        const res = await axios.get(`${BASE_URL}/analytics`, { params });
        return res.data;
    },

    // 4. Student academic timeline
    getStudentTimeline: async (studentId, params = {}) => {
        const res = await axios.get(`${BASE_URL}/timeline/${studentId}`, { params });
        return res.data;
    },

    // 5. Add timeline event
    addTimelineEvent: async (eventData) => {
        const res = await axios.post(`${BASE_URL}/timeline`, eventData);
        return res.data;
    },

    // 6. Saved & favorite reports
    manageSavedReports: async (payload) => {
        const res = await axios.post(`${BASE_URL}/saved`, payload);
        return res.data;
    },

    // 7. Scheduled automatic reports
    manageScheduledReports: async (payload) => {
        const res = await axios.post(`${BASE_URL}/scheduled`, payload);
        return res.data;
    },

    // 8. Download / export report
    exportReport: async (payload) => {
        const isFileExport = ['EXCEL', 'CSV'].includes((payload.format || '').toUpperCase());
        const res = await axios.post(`${BASE_URL}/export`, payload, {
            responseType: isFileExport ? 'blob' : 'json'
        });
        return res;
    }
};

export default reportApi;
