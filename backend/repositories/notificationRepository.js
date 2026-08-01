/**
 * ============================================================================
 * Enterprise Notification & Announcement Repository
 * ============================================================================
 * Data Access Layer for:
 *   - public.notifications (user/role specific alerts)
 *   - announcements (institutional announcements & broadcasts)
 *   - public.notification_preferences (user channel & category toggles)
 *   - public.notification_audit_logs (immutable enterprise audit trail)
 * ============================================================================
 */

const supabase = require('../config/supabaseClient');
const { createAuthenticatedClient } = require('../config/supabaseClient');

// ── AUDIT LOGGING ─────────────────────────────────────────────────────────────

async function insertAuditLog({ eventType, actorId = null, targetUserId = null, notificationId = null, announcementId = null, details = {} }) {
    const { error } = await supabase
        .from('notification_audit_logs')
        .insert([{
            event_type: eventType,
            actor_id: actorId,
            target_user_id: targetUserId,
            notification_id: notificationId,
            announcement_id: announcementId,
            details
        }]);
    if (error) {
        console.warn('[NotificationAudit] Failed to record audit log:', error.message);
    }
}

// ── NOTIFICATIONS CRUD ────────────────────────────────────────────────────────

async function insertNotification(payload) {
    const { data, error } = await supabase
        .from('notifications')
        .insert([payload])
        .select()
        .single();

    if (error) throw error;

    await insertAuditLog({
        eventType: 'NOTIFICATION_DELIVERED',
        targetUserId: payload.user_id,
        notificationId: data.id,
        details: { title: payload.title, priority: payload.priority, category: payload.category }
    });

    return data;
}

async function insertBulkNotifications(payloads) {
    if (!payloads || payloads.length === 0) return [];
    const { data, error } = await supabase
        .from('notifications')
        .insert(payloads)
        .select();

    if (error) throw error;

    // Log delivery for batch
    await insertAuditLog({
        eventType: 'NOTIFICATION_DELIVERED',
        details: { count: payloads.length, sampleTitle: payloads[0]?.title }
    });

    return data || [];
}

async function findNotificationsByUser({
    userId,
    limit = 50,
    offset = 0,
    isRead = null,
    category = null,
    priority = null,
    search = null,
    isArchived = false
}) {
    let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .eq('is_archived', Boolean(isArchived));

    if (typeof isRead === 'boolean') {
        query = query.eq('is_read', isRead);
    }
    if (category && category !== 'ALL') {
        query = query.eq('category', category);
    }
    if (priority && priority !== 'ALL') {
        query = query.eq('priority', priority);
    }
    if (search && search.trim()) {
        query = query.or(`title.ilike.%${search.trim()}%,message.ilike.%${search.trim()}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0 };
}

async function countUnreadByUser(userId) {
    const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('is_deleted', false)
        .eq('is_archived', false);

    if (error) {
        console.warn('[NotificationRepository] Error counting unread:', error.message);
        return 0;
    }
    return count || 0;
}

async function getNotificationById(id) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();
    if (error) return null;
    return data;
}

async function updateNotification(id, payload) {
    const { data, error } = await supabase
        .from('notifications')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function markAllAsRead(userId) {
    const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('is_deleted', false)
        .select();

    if (error) throw error;
    return data || [];
}

async function deleteNotification(id) {
    const { data, error } = await supabase
        .from('notifications')
        .update({ is_deleted: true })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ── ANNOUNCEMENTS CRUD ────────────────────────────────────────────────────────

async function findAnnouncements({
    targetAudience = null,
    targetScope = null,
    departmentId = null,
    programId = null,
    academicYearId = null,
    classId = null,
    batchId = null,
    search = null,
    category = null,
    priority = null,
    limit = 50
} = {}) {
    let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_deleted', false);

    if (targetAudience && targetAudience !== 'all') {
        query = query.in('target_audience', [targetAudience, 'both']);
    }
    if (targetScope && targetScope !== 'ALL') {
        query = query.eq('target_scope', targetScope);
    }
    if (category && category !== 'ALL') {
        query = query.eq('category', category);
    }
    if (priority && priority !== 'ALL') {
        query = query.eq('priority', priority);
    }
    if (search && search.trim()) {
        query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
    }

    query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function insertAnnouncement(payload, fallbackPayload = null, userToken = null) {
    // Use authenticated client if token provided (satisfies 'TO authenticated' RLS)
    const client = userToken ? createAuthenticatedClient(userToken) : supabase;

    // Try with full payload first (works after SQL migration)
    const { data, error } = await client
        .from('announcements')
        .insert([payload])
        .select()
        .single();

    if (error) {
        // If column doesn't exist (code 42703) or unknown column — fall back to base columns only
        const isColumnError = error.code === '42703' 
            || (error.message && (error.message.includes('column') || error.message.includes('does not exist')));
        
        if (isColumnError && fallbackPayload) {
            console.warn('[NotificationRepository] Extended columns not found, falling back to base columns:', error.message);
            const { data: baseData, error: baseError } = await client
                .from('announcements')
                .insert([fallbackPayload])
                .select()
                .single();
            if (baseError) throw baseError;

            await insertAuditLog({
                eventType: 'ANNOUNCEMENT_PUBLISHED',
                actorId: fallbackPayload.created_by,
                announcementId: baseData.id,
                details: { title: fallbackPayload.title, audience: fallbackPayload.target_audience, note: 'base_columns_only' }
            });
            return baseData;
        }
        throw error;
    }

    await insertAuditLog({
        eventType: 'ANNOUNCEMENT_PUBLISHED',
        actorId: payload.created_by,
        announcementId: data.id,
        details: { title: payload.title, scope: payload.target_scope, audience: payload.target_audience }
    });

    return data;
}

async function updateAnnouncement(id, payload) {
    const { data, error } = await supabase
        .from('announcements')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function deleteAnnouncement(id) {
    const { data, error } = await supabase
        .from('announcements')
        .update({ is_deleted: true })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ── USER PREFERENCES CRUD ─────────────────────────────────────────────────────

async function findUserPreferences(userId) {
    const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        // Return default preferences object if none set
        return {
            user_id: userId,
            in_app_enabled: true,
            email_enabled: true,
            category_preferences: {
                COURSE_REGISTRATION: true,
                ACADEMIC: true,
                ATTENDANCE: true,
                EXAM: true,
                ASSIGNMENT: true,
                FACULTY: true,
                ADMIN: true,
                ANNOUNCEMENT: true,
                REMINDER: true
            }
        };
    }
    return data;
}

async function upsertUserPreferences(userId, payload) {
    const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
            user_id: userId,
            ...payload,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select()
        .single();

    if (error) throw error;
    return data;
}

module.exports = {
    insertAuditLog,
    insertNotification,
    insertBulkNotifications,
    findNotificationsByUser,
    countUnreadByUser,
    getNotificationById,
    updateNotification,
    markAllAsRead,
    deleteNotification,
    findAnnouncements,
    insertAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    findUserPreferences,
    upsertUserPreferences
};
