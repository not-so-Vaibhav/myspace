/**
 * ============================================================================
 * Enterprise Notification & Announcement Controller (Phase 9)
 * ============================================================================
 * REST HTTP API handlers for Notification Center, Announcements, Reminders,
 * Preferences, and audit operations.
 * ============================================================================
 */

const service = require('../services/notificationService');
const { createAuthenticatedClient } = require('../config/supabaseClient');

// Helper: extract bearer token from request
const extractToken = (req) => {
    const auth = req.headers.authorization || '';
    return auth.startsWith('Bearer ') ? auth.slice(7) : null;
};

/**
 * GET /api/notifications
 * Retrieve combined notifications and announcements for the authenticated user.
 */
async function listNotifications(req, res, next) {
    try {
        const userId = req.user?.id || req.query.userId || 'mock-user-id';
        const role = req.user?.role || req.query.role || 'student';
        const {
            limit = 50,
            offset = 0,
            isRead,
            category,
            priority,
            search,
            isArchived = false
        } = req.query;

        const isReadFilter = typeof isRead === 'string' ? (isRead === 'true') : null;

        const result = await service.getNotifications({
            userId,
            role,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            isRead: isReadFilter,
            category,
            priority,
            search,
            isArchived: isArchived === 'true'
        });

        res.status(200).json({
            status: 'success',
            data: result.notifications,
            announcements: result.announcements,
            meta: {
                total: result.total,
                unreadCount: result.unreadCount,
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10)
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/notifications/unread-count
 * Get unread notification count badge value.
 */
async function getUnreadCount(req, res, next) {
    try {
        const userId = req.user?.id || req.query.userId || 'mock-user-id';
        const result = await service.getNotifications({ userId, role: 'student', limit: 1 });
        res.status(200).json({
            status: 'success',
            data: { unreadCount: result.unreadCount }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/notifications/read/:id
 * Mark a specific notification as read.
 */
async function markRead(req, res, next) {
    try {
        const userId = req.user?.id || req.body.userId || 'mock-user-id';
        const { id } = req.params;
        const updated = await service.markAsRead(id, userId);

        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Notification marked as read'
        });
    } catch (err) {
        if (err.message.includes('not found') || err.message.includes('denied')) {
            return res.status(404).json({ status: 'error', message: err.message });
        }
        next(err);
    }
}

/**
 * POST /api/notifications/read-all
 * Mark all user notifications as read.
 */
async function markAllRead(req, res, next) {
    try {
        const userId = req.user?.id || req.body.userId || 'mock-user-id';
        const updatedList = await service.markAllAsRead(userId);

        res.status(200).json({
            status: 'success',
            data: updatedList,
            message: `Marked ${updatedList.length} notifications as read`
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/notifications/archive/:id
 * Archive a notification.
 */
async function archiveNotification(req, res, next) {
    try {
        const userId = req.user?.id || req.body.userId || 'mock-user-id';
        const { id } = req.params;
        const updated = await service.archiveNotification(id, userId);

        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Notification archived'
        });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/notifications/:id
 * Soft delete a notification.
 */
async function deleteNotification(req, res, next) {
    try {
        const userId = req.user?.id || req.body.userId || 'mock-user-id';
        const { id } = req.params;
        const deleted = await service.deleteNotification(id, userId);

        res.status(200).json({
            status: 'success',
            data: deleted,
            message: 'Notification deleted'
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/notifications/preferences
 * Get user notification preferences.
 */
async function getPreferences(req, res, next) {
    try {
        const userId = req.user?.id || req.query.userId || 'mock-user-id';
        const prefs = await service.getUserPreferences(userId);

        res.status(200).json({
            status: 'success',
            data: prefs
        });
    } catch (err) {
        next(err);
    }
}

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences.
 */
async function updatePreferences(req, res, next) {
    try {
        const userId = req.user?.id || req.body.userId || 'mock-user-id';
        const prefs = await service.updateUserPreferences(userId, req.body);

        res.status(200).json({
            status: 'success',
            data: prefs,
            message: 'Preferences updated successfully'
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/notifications/announcements
 * Create an enterprise announcement. Uses the user's JWT token to satisfy RLS.
 */
async function publishAnnouncement(req, res, next) {
    try {
        const userId = req.user?.id || req.body.createdBy || req.body.created_by;
        const token = extractToken(req);
        const announcement = await service.notifyGroup({
            ...req.body,
            createdBy: userId
        }, token);

        res.status(201).json({
            status: 'success',
            data: announcement,
            message: 'Announcement published successfully'
        });
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /api/notifications/announcements/:id
 * Update an announcement (approve/reject). Uses user JWT to satisfy RLS.
 */
async function updateAnnouncement(req, res, next) {
    try {
        const { id } = req.params;
        const token = extractToken(req);
        const supabaseClient = createAuthenticatedClient(token);
        const { data, error } = await supabaseClient
            .from('announcements')
            .update(req.body)
            .eq('id', id)
            .select()
            .single();

        if (error) return next(error);

        res.status(200).json({
            status: 'success',
            data,
            message: 'Announcement updated successfully'
        });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/notifications/announcements/:id
 * Soft-delete an announcement. Uses user JWT to satisfy RLS.
 */
async function removeAnnouncement(req, res, next) {
    try {
        const { id } = req.params;
        const token = extractToken(req);
        const supabaseClient = createAuthenticatedClient(token);
        const { data, error } = await supabaseClient
            .from('announcements')
            .update({ is_deleted: true })
            .eq('id', id)
            .select()
            .single();

        if (error) return next(error);

        res.status(200).json({
            status: 'success',
            data,
            message: 'Announcement deleted successfully'
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/notifications/reminders/trigger
 * Trigger automated reminder scanning.
 */
async function triggerReminders(req, res, next) {
    try {
        const userId = req.user?.id || req.body.actorId || 'mock-admin-id';
        const result = await service.runAutomatedReminders(userId);

        res.status(200).json({
            status: 'success',
            data: result,
            message: `Automated reminders scan triggered (${result.triggeredCount} reminders sent)`
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    listNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    archiveNotification,
    deleteNotification,
    getPreferences,
    updatePreferences,
    publishAnnouncement,
    updateAnnouncement,
    removeAnnouncement,
    triggerReminders
};
