// ==============================================================================
// PHASE 10: STUDENT 360° PROFILE & ACADEMIC TIMELINE API CLIENT
// TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Style
// ==============================================================================

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'}/student-360`;

const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

export const searchStudents = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.query || filters.search) params.append('query', filters.query || filters.search);
    if (filters.department && filters.department !== 'ALL') params.append('department', filters.department);
    if (filters.program && filters.program !== 'ALL') params.append('program', filters.program);
    if (filters.semester && filters.semester !== 'ALL') params.append('semester', filters.semester);
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.classId && filters.classId !== 'ALL') params.append('classId', filters.classId);
    if (filters.batchId && filters.batchId !== 'ALL') params.append('batchId', filters.batchId);
    if (filters.year && filters.year !== 'ALL') params.append('year', filters.year);
    if (filters.minAttendance) params.append('minAttendance', filters.minAttendance);
    if (filters.minSgpa) params.append('minSgpa', filters.minSgpa);
    if (filters.minCgpa) params.append('minCgpa', filters.minCgpa);
    if (filters.minCredits) params.append('minCredits', filters.minCredits);
    if (filters.promotionStatus && filters.promotionStatus !== 'ALL') params.append('promotionStatus', filters.promotionStatus);
    if (filters.graduationStatus && filters.graduationStatus !== 'ALL') params.append('graduationStatus', filters.graduationStatus);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const res = await fetch(`${BASE_URL}/search?${params.toString()}`, {
        headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to search students');
    return res.json();
};

export const getStudent360Profile = async (studentId) => {
    const res = await fetch(`${BASE_URL}/profile/${encodeURIComponent(studentId)}`, {
        headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch Student 360 profile');
    return res.json();
};

export const getStudentTimeline = async (studentId) => {
    const res = await fetch(`${BASE_URL}/timeline/${encodeURIComponent(studentId)}`, {
        headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch student timeline');
    return res.json();
};

export const getStudentAcademicRecord = async (studentId) => {
    const res = await fetch(`${BASE_URL}/academic-record/${encodeURIComponent(studentId)}`, {
        headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch student academic record');
    return res.json();
};

export const getStudentActivityHistory = async (studentId) => {
    const res = await fetch(`${BASE_URL}/activity-history/${encodeURIComponent(studentId)}`, {
        headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch student activity history');
    return res.json();
};

export const exportStudent360Report = async (studentId, format = 'csv') => {
    const res = await fetch(`${BASE_URL}/export/${encodeURIComponent(studentId)}?format=${format}`, {
        headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to export student report');
    return res.json();
};
