// frontend/src/api/notificationApi.js
// Phase 9: Enterprise Notification & Announcement Integration API Client
// Passes the Supabase auth token so backend can satisfy RLS policies

import axios from 'axios';
import { supabase } from '../lib/supabase';

const BASE_URL = 'http://localhost:5001/api/notifications';

// Helper: get current Supabase auth token
const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
};

const notificationApi = {
    // 1. List notifications & announcements with search and filters
    getNotifications: async (params = {}) => {
        const headers = await getAuthHeaders();
        const res = await axios.get(BASE_URL, { params, headers });
        return res.data;
    },

    // 2. Get unread count badge
    getUnreadCount: async (params = {}) => {
        const headers = await getAuthHeaders();
        const res = await axios.get(`${BASE_URL}/unread-count`, { params, headers });
        return res.data;
    },

    // 3. Mark single notification read
    markRead: async (id, userId = '') => {
        const res = await axios.post(`${BASE_URL}/read/${id}`, { userId });
        return res.data;
    },

    // 4. Mark all notifications read
    markAllRead: async (userId = '') => {
        const res = await axios.post(`${BASE_URL}/read-all`, { userId });
        return res.data;
    },

    // 5. Archive notification
    archiveNotification: async (id, userId = '') => {
        const res = await axios.post(`${BASE_URL}/archive/${id}`, { userId });
        return res.data;
    },

    // 6. Soft delete notification
    deleteNotification: async (id, userId = '') => {
        const res = await axios.delete(`${BASE_URL}/${id}`, { data: { userId } });
        return res.data;
    },

    // 7. Get notification preferences
    getPreferences: async (userId = '') => {
        const res = await axios.get(`${BASE_URL}/preferences`, { params: { userId } });
        return res.data;
    },

    // 8. Update notification preferences
    updatePreferences: async (userId, preferences) => {
        const res = await axios.put(`${BASE_URL}/preferences`, { userId, ...preferences });
        return res.data;
    },

    // 9. Publish announcement — sends auth token so backend satisfies RLS
    publishAnnouncement: async (payload) => {
        const headers = await getAuthHeaders();
        const res = await axios.post(`${BASE_URL}/announcements`, payload, { headers });
        return res.data;
    },

    // 10. Trigger automated reminder scan
    triggerReminders: async (payload = {}) => {
        const headers = await getAuthHeaders();
        const res = await axios.post(`${BASE_URL}/reminders/trigger`, payload, { headers });
        return res.data;
    },

    // 11. Update announcement (approve/reject) - sends auth token so backend satisfies RLS
    updateAnnouncement: async (id, payload) => {
        const headers = await getAuthHeaders();
        const res = await axios.patch(`${BASE_URL}/announcements/${id}`, payload, { headers });
        return res.data;
    },

    // 12. Delete announcement
    deleteAnnouncement: async (id) => {
        const headers = await getAuthHeaders();
        const res = await axios.delete(`${BASE_URL}/announcements/${id}`, { headers });
        return res.data;
    }
};

export default notificationApi;
