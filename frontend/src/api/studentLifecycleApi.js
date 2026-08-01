// frontend/src/api/studentLifecycleApi.js
// Axios wrapper for the Student Lifecycle Engine backend endpoints.
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
const API_BASE = `${BASE_URL}/api/student-lifecycle`;

const client = axios.create({ baseURL: API_BASE, timeout: 10000 });

/** List all students with optional filters */
export const listStudents = (params = {}) =>
    client.get('/students', { params }).then(r => r.data);

/** Get state machine definition & allowed transitions matrix */
export const getStatesMatrix = () =>
    client.get('/states').then(r => r.data);

/** Get student lifecycle status & allowed next states */
export const getStudentLifecycle = (studentId) =>
    client.get(`/${studentId}`).then(r => r.data);

/** Get audit history timeline for a student */
export const getStudentHistory = (studentId) =>
    client.get(`/${studentId}/history`).then(r => r.data);

/** Perform standard state transition */
export const transitionStudentState = (studentId, payload) =>
    client.post(`/${studentId}/transition`, payload).then(r => r.data);

/** Perform admin override transition (mandatory reason) */
export const adminOverrideState = (studentId, payload) =>
    client.post(`/${studentId}/override`, payload).then(r => r.data);
