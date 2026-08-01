/**
 * ============================================================================
 * Enterprise Notification & Announcement Routes (Phase 9)
 * ============================================================================
 * Mounted at /api/notifications
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');

// Notifications feed & unread count
router.get('/', controller.listNotifications);
router.get('/unread-count', controller.getUnreadCount);

// Read / Archive / Delete actions
router.post('/read-all', controller.markAllRead);
router.post('/read/:id', controller.markRead);
router.post('/archive/:id', controller.archiveNotification);
router.delete('/:id', controller.deleteNotification);

// Preferences
router.get('/preferences', controller.getPreferences);
router.put('/preferences', controller.updatePreferences);

// Announcements & Reminders
router.post('/announcements', controller.publishAnnouncement);
router.patch('/announcements/:id', controller.updateAnnouncement);
router.delete('/announcements/:id', controller.removeAnnouncement);
router.post('/reminders/trigger', controller.triggerReminders);

module.exports = router;
