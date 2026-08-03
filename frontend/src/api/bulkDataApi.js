// ==============================================================================
// PHASE 8: ENTERPRISE BULK DATA MANAGEMENT API CLIENT
// TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Style
// ==============================================================================
// API service client connecting frontend components to /api/bulk-data endpoints.
// ==============================================================================

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'}/bulk-data`;

const getHeaders = (isJson = true) => {
    const headers = {};
    if (isJson) headers['Content-Type'] = 'application/json';
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

// 1. Get Template metadata / rules
export const getTemplate = async (moduleName, entityType, format = 'CSV') => {
    const res = await fetch(`${BASE_URL}/templates/${moduleName}/${entityType}?format=${format}`, {
        headers: getHeaders(true)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch import template');
    }
    return res.json();
};

// 2. Download Template blank / sample file directly
export const downloadTemplateFile = async (moduleName, entityType, format = 'CSV') => {
    const res = await fetch(`${BASE_URL}/templates/${moduleName}/${entityType}?format=${format}&download=true`, {
        headers: getHeaders(false)
    });
    if (!res.ok) throw new Error('Failed to download template file');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${moduleName}_${entityType}_template.${format.toLowerCase()}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
};

// 3. Pre-import Multi-Stage Validation Preview (with File upload)
export const validateImportFile = async (moduleName, entityType, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/validate/${moduleName}/${entityType}`, {
        method: 'POST',
        headers: getHeaders(false),
        body: formData
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Validation failed');
    }
    return res.json();
};

// 4. Pre-import Validation Preview (with parsed row array or string)
export const validateImportRows = async (moduleName, entityType, rows, format = 'CSV') => {
    const res = await fetch(`${BASE_URL}/validate/${moduleName}/${entityType}`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ rows, format })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Validation failed');
    }
    return res.json();
};

// 5. Execute Bulk Import (with File upload)
export const executeImportFile = async (moduleName, entityType, file, options = { partial_success: true }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('partial_success', options.partial_success ? 'true' : 'false');

    const res = await fetch(`${BASE_URL}/import/${moduleName}/${entityType}`, {
        method: 'POST',
        headers: getHeaders(false),
        body: formData
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Bulk import execution failed');
    }
    return res.json();
};

// 6. Execute Bulk Import (with valid row array)
export const executeImportRows = async (moduleName, entityType, rows, options = { partial_success: true }) => {
    const res = await fetch(`${BASE_URL}/import/${moduleName}/${entityType}`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ rows, partial_success: options.partial_success })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Bulk import execution failed');
    }
    return res.json();
};

// 7. Filtered Export data payload
export const exportData = async (moduleName, entityType, filters = {}, exportFormat = 'CSV') => {
    const res = await fetch(`${BASE_URL}/export/${moduleName}/${entityType}`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ filters, export_format: exportFormat })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Export failed');
    }
    return res.json();
};

// 8. Download Export file directly
export const downloadExportFile = async (moduleName, entityType, filters = {}, exportFormat = 'CSV') => {
    const res = await fetch(`${BASE_URL}/export/${moduleName}/${entityType}?download=true`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ filters, export_format: exportFormat })
    });
    if (!res.ok) throw new Error('Failed to download exported file');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const ext = exportFormat.toLowerCase() === 'excel' ? 'xlsx' : exportFormat.toLowerCase();
    link.setAttribute('download', `${moduleName}_${entityType}_export.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
};

// 9. Inspect Bulk Data Operations Audit Logs
export const getAuditLogs = async (filters = {}, pagination = { limit: 50, offset: 0 }) => {
    const params = new URLSearchParams({
        limit: String(pagination.limit || 50),
        offset: String(pagination.offset || 0)
    });
    if (filters.module_name) params.append('module_name', filters.module_name);
    if (filters.operation_type) params.append('operation_type', filters.operation_type);
    if (filters.status) params.append('status', filters.status);

    const res = await fetch(`${BASE_URL}/audit?${params.toString()}`, {
        headers: getHeaders(true)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch audit logs');
    }
    return res.json();
};

// 10. Get Row-level import errors
export const getImportErrors = async (auditId) => {
    const res = await fetch(`${BASE_URL}/errors/${auditId}`, {
        headers: getHeaders(true)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch import errors');
    }
    return res.json();
};

export default {
    getTemplate,
    downloadTemplateFile,
    validateImportFile,
    validateImportRows,
    executeImportFile,
    executeImportRows,
    exportData,
    downloadExportFile,
    getAuditLogs,
    getImportErrors
};
