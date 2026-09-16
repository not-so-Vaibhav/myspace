import { supabase } from '../lib/supabase';
import notificationApi from '../api/notificationApi';

/**
 * Service for Managing Admin Teaching Preference Calls and Faculty Subject Submissions
 */

const PREF_STORAGE_KEY = 'mit_learn_subject_preferences';

const getFallbackPreferences = (announcementId) => {
    try {
        const stored = localStorage.getItem(PREF_STORAGE_KEY);
        if (!stored) return {};
        const parsed = JSON.parse(stored);
        return announcementId ? (parsed[announcementId] || {}) : parsed;
    } catch {
        return {};
    }
};

const saveFallbackPreferences = (announcementId, facultyId, preferences) => {
    try {
        const stored = localStorage.getItem(PREF_STORAGE_KEY);
        const all = stored ? JSON.parse(stored) : {};
        if (!all[announcementId]) all[announcementId] = {};
        all[announcementId][facultyId] = preferences;
        localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
        console.error('Local fallback preference storage error:', e);
    }
};

/**
 * Fetch all available subjects in the university
 */
export const fetchAvailableSubjects = async () => {
    try {
        const { data, error } = await supabase
            .from('subjects')
            .select('id, code, name, credits, type')
            .order('code', { ascending: true });

        if (error) {
            console.warn('Error fetching subjects from database:', error.message);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('Error in fetchAvailableSubjects:', err);
        return [];
    }
};

/**
 * Fetch a faculty member's submitted preferences for an announcement
 */
export const fetchFacultyPreferences = async (announcementId, facultyId) => {
    if (!announcementId || !facultyId) return [];

    try {
        const { data, error } = await supabase
            .from('faculty_subject_preferences')
            .select(`
                id,
                announcement_id,
                faculty_id,
                subject_id,
                preference_rank,
                preferred_type,
                preferred_hours_per_week,
                preferred_day_slots,
                remarks,
                created_at,
                subject:subjects(id, code, name, credits, type)
            `)
            .eq('announcement_id', announcementId)
            .eq('faculty_id', facultyId)
            .order('preference_rank', { ascending: true });

        if (error) {
            console.warn('fetchFacultyPreferences fallback:', error.message);
            const fallback = getFallbackPreferences(announcementId);
            return fallback[facultyId] || [];
        }

        if (data && data.length > 0) {
            saveFallbackPreferences(announcementId, facultyId, data);
        }
        return data || [];
    } catch (err) {
        console.error('Error fetching faculty preferences:', err);
        const fallback = getFallbackPreferences(announcementId);
        return fallback[facultyId] || [];
    }
};

/**
 * Fetch all faculty submissions for an announcement (Admin view for Schedule Allocation)
 */
export const fetchAllResponsesForAnnouncement = async (announcementId) => {
    if (!announcementId) return [];

    try {
        const { data, error } = await supabase
            .from('faculty_subject_preferences')
            .select(`
                id,
                announcement_id,
                faculty_id,
                subject_id,
                preference_rank,
                preferred_type,
                preferred_hours_per_week,
                preferred_day_slots,
                remarks,
                created_at,
                faculty:profiles(id, full_name, email, role, department),
                subject:subjects(id, code, name, credits, type)
            `)
            .eq('announcement_id', announcementId)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('fetchAllResponsesForAnnouncement fallback:', error.message);
            const fallback = getFallbackPreferences(announcementId);
            // Convert fallback object to list
            const list = [];
            Object.keys(fallback).forEach(fId => {
                const prefs = fallback[fId] || [];
                prefs.forEach(p => list.push(p));
            });
            return list;
        }

        return data || [];
    } catch (err) {
        console.error('Error fetching all responses for announcement:', err);
        const fallback = getFallbackPreferences(announcementId);
        const list = [];
        Object.keys(fallback).forEach(fId => {
            const prefs = fallback[fId] || [];
            prefs.forEach(p => list.push(p));
        });
        return list;
    }
};

/**
 * Save / Update faculty subject preferences for an announcement
 * @param {string} announcementId
 * @param {string} facultyId
 * @param {Array} preferencesList - array of { subject_id, preference_rank, preferred_type, remarks, subject }
 */
export const saveFacultyPreferences = async (announcementId, facultyId, preferencesList) => {
    if (!announcementId || !facultyId) {
        throw new Error('Announcement ID and Faculty ID are required.');
    }
    if (!preferencesList || preferencesList.length === 0) {
        throw new Error('Please select at least one subject preference.');
    }

    try {
        // 1. Delete previous preferences for this faculty on this announcement
        const { error: delError } = await supabase
            .from('faculty_subject_preferences')
            .delete()
            .eq('announcement_id', announcementId)
            .eq('faculty_id', facultyId);

        if (delError) {
            console.warn('Delete previous preferences notice:', delError.message);
        }

        // 2. Prepare rows for insertion
        const rows = preferencesList.map((item, index) => ({
            announcement_id: announcementId,
            faculty_id: facultyId,
            subject_id: item.subject_id,
            preference_rank: item.preference_rank || (index + 1),
            preferred_type: item.preferred_type || 'Theory',
            preferred_hours_per_week: item.preferred_hours_per_week || 4,
            preferred_day_slots: item.preferred_day_slots || 'Flexible',
            remarks: item.remarks || ''
        }));

        const { data, error: insertError } = await supabase
            .from('faculty_subject_preferences')
            .insert(rows)
            .select(`
                id,
                announcement_id,
                faculty_id,
                subject_id,
                preference_rank,
                preferred_type,
                preferred_hours_per_week,
                preferred_day_slots,
                remarks,
                created_at,
                subject:subjects(id, code, name, credits, type)
            `);

        if (insertError) {
            console.warn('Database insert failed, using fallback storage:', insertError.message);
            // Save to fallback storage
            const localList = preferencesList.map((item, index) => ({
                id: 'local_pref_' + Date.now() + '_' + index,
                announcement_id: announcementId,
                faculty_id: facultyId,
                subject_id: item.subject_id,
                preference_rank: item.preference_rank || (index + 1),
                preferred_type: item.preferred_type || 'Theory',
                preferred_hours_per_week: item.preferred_hours_per_week || 4,
                preferred_day_slots: item.preferred_day_slots || 'Flexible',
                remarks: item.remarks || '',
                created_at: new Date().toISOString(),
                subject: item.subject
            }));
            saveFallbackPreferences(announcementId, facultyId, localList);
            return localList;
        }

        // Also update local fallback cache
        saveFallbackPreferences(announcementId, facultyId, data || []);
        return data || [];
    } catch (err) {
        console.error('Error saving faculty preferences:', err);
        throw err;
    }
};

/**
 * Admin: Broadcast a Subject Preference Announcement to all Faculty & HOD
 */
export const createSubjectPreferenceAnnouncement = async (formData, adminProfile) => {
    try {
        const payload = {
            title: formData.title || `Faculty Subject Preferences: Semester ${formData.semester || 1}`,
            description: formData.description || `Please submit your preferred teaching subjects for the upcoming semester. Submissions will close on ${formData.deadline}.`,
            start_date: new Date().toISOString().split('T')[0],
            end_date: formData.deadlineDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            targetAudience: 'faculty', // targeted exclusively to faculty and hod
            priority: formData.priority || 'HIGH',
            category: 'ACADEMIC',
            targetScope: 'FACULTY_ONLY',
            isPinned: true,
            createdBy: adminProfile?.id,
            status: 'approved',
            submittedByName: adminProfile?.full_name || 'Academic Administrator',
            // Subject preference metadata
            is_preference_call: true,
            preference_deadline: formData.deadline,
            target_semester: parseInt(formData.semester, 10) || 1,
            target_academic_year: formData.academicYear || '2026-2027',
            max_preferences: parseInt(formData.maxPreferences, 10) || 3,
            allowed_subject_ids: formData.allowedSubjectIds || []
        };

        // Try using backend notification API
        let createdAnnouncement = null;
        try {
            const res = await notificationApi.publishAnnouncement(payload);
            createdAnnouncement = res?.data;
        } catch (apiErr) {
            console.warn('Backend API announcement publish fallback:', apiErr.message);
        }

        // Direct Supabase insert if backend API failed or returned null
        if (!createdAnnouncement) {
            const { data, error } = await supabase
                .from('announcements')
                .insert([{
                    title: payload.title,
                    description: payload.description,
                    start_date: payload.start_date,
                    end_date: payload.end_date,
                    target_audience: 'faculty',
                    priority: payload.priority,
                    category: 'ACADEMIC',
                    target_scope: 'FACULTY_ONLY',
                    is_pinned: true,
                    created_by: adminProfile?.id,
                    status: 'approved',
                    submitted_by_name: payload.submittedByName,
                    is_preference_call: true,
                    preference_deadline: formData.deadline,
                    target_semester: parseInt(formData.semester, 10) || 1,
                    target_academic_year: formData.academicYear || '2026-2027',
                    max_preferences: parseInt(formData.maxPreferences, 10) || 3
                }])
                .select()
                .single();

            if (error) {
                // If custom column failed due to unrun migration, retry with standard columns
                console.warn('Retrying with base columns:', error.message);
                const { data: baseData, error: baseErr } = await supabase
                    .from('announcements')
                    .insert([{
                        title: payload.title,
                        description: payload.description + `\n\n[DEADLINE: ${formData.deadline}] [SEMESTER: ${formData.semester}] [PREFERENCE_CALL: true]`,
                        start_date: payload.start_date,
                        end_date: payload.end_date,
                        target_audience: 'faculty',
                        priority: 'HIGH',
                        category: 'ACADEMIC',
                        target_scope: 'FACULTY_ONLY',
                        is_pinned: true,
                        created_by: adminProfile?.id,
                        status: 'approved',
                        submitted_by_name: payload.submittedByName
                    }])
                    .select()
                    .single();

                if (baseErr) throw baseErr;
                createdAnnouncement = { ...baseData, is_preference_call: true, preference_deadline: formData.deadline, target_semester: formData.semester };
            } else {
                createdAnnouncement = data;
            }
        }

        return createdAnnouncement;
    } catch (err) {
        console.error('Error creating subject preference announcement:', err);
        throw err;
    }
};
