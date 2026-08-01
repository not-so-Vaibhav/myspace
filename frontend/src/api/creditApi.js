// frontend/src/api/creditApi.js
// API Client wrapper for Phase 5: Enterprise Academic Credit System

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const creditApi = {
    getStudentSummary: async (studentId, semesterId = null) => {
        const params = semesterId ? { semesterId } : {};
        const response = await axios.get(`${API_BASE_URL}/credits/student/${studentId}/summary`, { params });
        return response.data;
    },

    validateRegistration: async ({ studentId, semesterId, proposedCourses }) => {
        const response = await axios.post(`${API_BASE_URL}/credits/validate-registration`, {
            studentId,
            semesterId,
            proposedCourses
        });
        return response.data;
    },

    getRules: async () => {
        const response = await axios.get(`${API_BASE_URL}/credits/rules`);
        return response.data;
    },

    upsertRule: async (ruleData) => {
        const response = await axios.post(`${API_BASE_URL}/credits/rules`, ruleData);
        return response.data;
    },

    getReports: async (type, filters = {}) => {
        const response = await axios.get(`${API_BASE_URL}/credits/reports/${type}`, { params: filters });
        return response.data;
    },

    bulkRecalculate: async (studentIds) => {
        const response = await axios.post(`${API_BASE_URL}/credits/admin/bulk-recalculate`, { studentIds });
        return response.data;
    },

    getTranscript: async (studentId) => {
        const response = await axios.get(`${API_BASE_URL}/credits/transcript/${studentId}`);
        return response.data;
    }
};

export { creditApi };
export default creditApi;
