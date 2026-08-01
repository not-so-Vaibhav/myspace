// frontend/src/api/academicRulesApi.js
// Axios wrapper for the Academic Rules Engine backend API.
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
const API_BASE = `${BASE_URL}/api/academic-rules`;

const client = axios.create({ baseURL: API_BASE, timeout: 10000 });

// ── Rules ─────────────────────────────────────────────────────

/** List all rules (optionally filtered) */
export const listRules = (params = {}) =>
    client.get('/', { params }).then(r => r.data);

/** Get effective rule for a scope */
export const getEffectiveRule = (params) =>
    client.get('/effective', { params }).then(r => r.data);

/** Get reference data for dropdowns */
export const getReferenceData = () =>
    client.get('/reference').then(r => r.data);

/** Get a single rule */
export const getRule = (id) =>
    client.get(`/${id}`).then(r => r.data);

/** Get audit history for a rule */
export const getRuleHistory = (id) =>
    client.get(`/${id}/history`).then(r => r.data);

/** Create a new rule */
export const createRule = (payload) =>
    client.post('/', payload).then(r => r.data);

/** Update a rule */
export const updateRule = (id, payload) =>
    client.put(`/${id}`, payload).then(r => r.data);

/** Activate a rule */
export const activateRule = (id) =>
    client.patch(`/${id}/activate`).then(r => r.data);

/** Deactivate a rule */
export const deactivateRule = (id) =>
    client.patch(`/${id}/deactivate`).then(r => r.data);

/** Delete a rule permanently */
export const deleteRule = (id) =>
    client.delete(`/${id}`).then(r => r.data);
