// frontend/src/api/registrationApi.js
// Enterprise Course Registration Client API
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
const API_URL = `${BASE_URL}/api/registration`;

export const registrationApi = {
    // ── WINDOWS ──────────────────────────────────────────────────────────────
    getWindow: async (params = {}) => {
        const response = await axios.get(`${API_URL}/window`, { params });
        return response.data;
    },
    upsertWindow: async (windowData) => {
        const response = await axios.post(`${API_URL}/window`, windowData);
        return response.data;
    },

    // ── STUDENT COURSE DISCOVERY & REGISTRATION ──────────────────────────────
    getAvailableCourses: async (studentId, filters = {}) => {
        const response = await axios.get(`${API_URL}/available-courses`, {
            params: { studentId, ...filters }
        });
        return response.data;
    },
    registerCourse: async (studentId, allocationId) => {
        const response = await axios.post(`${API_URL}/register`, {
            studentId,
            allocationId
        });
        return response.data;
    },
    dropCourse: async (studentId, allocationId, reason = '') => {
        const response = await axios.post(`${API_URL}/drop`, {
            studentId,
            allocationId,
            reason
        });
        return response.data;
    },
    getStudentDashboard: async (studentId) => {
        const response = await axios.get(`${API_URL}/my-dashboard`, {
            params: { studentId }
        });
        return response.data;
    },
    getHistory: async (studentId, semesterId = null) => {
        const response = await axios.get(`${API_URL}/history`, {
            params: { studentId, ...(semesterId ? { semesterId } : {}) }
        });
        return response.data;
    },

    // ── FACULTY DASHBOARD ────────────────────────────────────────────────────
    getFacultyCourses: async (facultyId) => {
        const response = await axios.get(`${API_URL}/faculty/courses`, {
            params: { facultyId }
        });
        return response.data;
    },
    getFacultyCourseStudents: async (allocationId) => {
        const response = await axios.get(`${API_URL}/faculty/students/${allocationId}`);
        return response.data;
    },

    // ── ADMIN CONTROLS ───────────────────────────────────────────────────────
    adminForceRegister: async (studentId, allocationId, reason = 'Admin override') => {
        const response = await axios.post(`${API_URL}/admin/force-register`, {
            studentId,
            allocationId,
            reason
        });
        return response.data;
    },
    adminForceDrop: async (studentId, allocationId, reason = 'Admin force drop') => {
        const response = await axios.post(`${API_URL}/admin/force-drop`, {
            studentId,
            allocationId,
            reason
        });
        return response.data;
    },
    adminBulkRegister: async (registrations) => {
        const response = await axios.post(`${API_URL}/admin/bulk-register`, {
            registrations
        });
        return response.data;
    },
    getAdminAnalytics: async () => {
        const response = await axios.get(`${API_URL}/admin/analytics`);
        return response.data;
    },
    getAuditLogs: async (filters = {}) => {
        const response = await axios.get(`${API_URL}/admin/audit-logs`, { params: filters });
        return response.data;
    }
};

export default registrationApi;
