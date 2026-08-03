// ==============================================================================
// PHASE 10: ENTERPRISE AUDIT TRAIL API CLIENT
// TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Style
// ==============================================================================

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'}/audit-trail`;

const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

export const recordAuditLog = async (payload) => {
    const res = await fetch(`${BASE_URL}/log`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to record audit log');
    return res.json();
};

export const searchAuditLogs = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.module && filters.module !== 'ALL') params.append('module', filters.module);
    if (filters.action && filters.action !== 'ALL') params.append('action', filters.action);
    if (filters.role && filters.role !== 'ALL') params.append('role', filters.role);
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const res = await fetch(`${BASE_URL}/logs?${params.toString()}`, {
        headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
};

export const getAdminDashboardStats = async () => {
    const res = await fetch(`${BASE_URL}/admin-dashboard-stats`, {
        headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch admin statistics');
    return res.json();
};

export const exportAuditLogs = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.module && filters.module !== 'ALL') params.append('module', filters.module);
    if (filters.action && filters.action !== 'ALL') params.append('action', filters.action);
    if (filters.role && filters.role !== 'ALL') params.append('role', filters.role);
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const res = await fetch(`${BASE_URL}/export?${params.toString()}`, {
        headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to export audit logs');
    return res.json();
};
