// frontend/src/api/batchApi.js
// API Client wrapper for Phase 6: Enterprise Class & Practical Batch Management System

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const batchApi = {
    // ── 1. ACADEMIC CLASSES ──────────────────────────────────────────────────
    createClass: async (data) => {
        const res = await axios.post(`${API_BASE_URL}/academic-batches/classes`, data);
        return res.data;
    },
    listClasses: async (filters = {}) => {
        const res = await axios.get(`${API_BASE_URL}/academic-batches/classes`, { params: filters });
        return res.data;
    },
    getClassById: async (id) => {
        const res = await axios.get(`${API_BASE_URL}/academic-batches/classes/${id}`);
        return res.data;
    },

    // ── 2. PRACTICAL BATCHES ─────────────────────────────────────────────────
    createBatch: async (data) => {
        const res = await axios.post(`${API_BASE_URL}/academic-batches/batches`, data);
        return res.data;
    },
    listBatches: async (filters = {}) => {
        const res = await axios.get(`${API_BASE_URL}/academic-batches/batches`, { params: filters });
        return res.data;
    },
    getBatchById: async (id) => {
        const res = await axios.get(`${API_BASE_URL}/academic-batches/batches/${id}`);
        return res.data;
    },

    // ── 3. AUTOMATIC BATCH GENERATION ────────────────────────────────────────
    autoGenerateBatches: async (data) => {
        const res = await axios.post(`${API_BASE_URL}/academic-batches/batches/auto-generate`, data);
        return res.data;
    },

    // ── 4. STUDENT ALLOCATION & TRANSFERS ────────────────────────────────────
    manualAllocateStudent: async (data) => {
        const res = await axios.post(`${API_BASE_URL}/academic-batches/allocations/manual`, data);
        return res.data;
    },
    autoAllocateStudents: async (data) => {
        const res = await axios.post(`${API_BASE_URL}/academic-batches/allocations/auto`, data);
        return res.data;
    },
    bulkAllocateStudents: async (data) => {
        const res = await axios.post(`${API_BASE_URL}/academic-batches/allocations/bulk`, data);
        return res.data;
    },
    transferStudentBatch: async (data) => {
        const res = await axios.post(`${API_BASE_URL}/academic-batches/transfers/batch`, data);
        return res.data;
    },
    transferStudentClass: async (data) => {
        const res = await axios.post(`${API_BASE_URL}/academic-batches/transfers/class`, data);
        return res.data;
    },

    // ── 5. FACULTY ALLOCATION ────────────────────────────────────────────────
    allocateFaculty: async (data) => {
        const res = await axios.post(`${API_BASE_URL}/academic-batches/faculty-allocations`, data);
        return res.data;
    },
    listFacultyAllocations: async (filters = {}) => {
        const res = await axios.get(`${API_BASE_URL}/academic-batches/faculty-allocations`, { params: filters });
        return res.data;
    },

    // ── 6. ATTENDANCE & TIMETABLE INTEGRATION ────────────────────────────────
    getAttendanceRoster: async (filters = {}) => {
        const res = await axios.get(`${API_BASE_URL}/academic-batches/attendance-roster`, { params: filters });
        return res.data;
    },
    createTimetableEntry: async (data) => {
        const res = await axios.post(`${API_BASE_URL}/academic-batches/timetables`, data);
        return res.data;
    },
    getTimetable: async (filters = {}) => {
        const res = await axios.get(`${API_BASE_URL}/academic-batches/timetables`, { params: filters });
        return res.data;
    },

    // ── 7. ENTERPRISE REPORTS ────────────────────────────────────────────────
    generateReport: async (type, filters = {}) => {
        const res = await axios.get(`${API_BASE_URL}/academic-batches/reports/${type}`, { params: filters });
        return res.data;
    }
};

export { batchApi };
export default batchApi;
