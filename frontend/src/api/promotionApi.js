// frontend/src/api/promotionApi.js
// Axios wrapper for the Academic Promotion Engine backend endpoints.
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
const API_BASE = `${BASE_URL}/api/academic-promotion`;

const client = axios.create({ baseURL: API_BASE, timeout: 10000 });

/** Evaluate a student against active academic rules */
export const evaluateStudentPromotion = (payload) =>
    client.post('/evaluate', payload).then(r => r.data);

/** Manually approve a pending promotion decision */
export const approvePromotionDecision = (promotionId, payload = {}) =>
    client.post(`/${promotionId}/approve`, payload).then(r => r.data);

/** Fetch promotion decision history */
export const getPromotionHistory = (params = {}) =>
    client.get('/history', { params }).then(r => r.data);
