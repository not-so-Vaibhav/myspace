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

const updateFallbackPreferenceAllocation = (preferenceId, isAllocated, announcementId, facultyId) => {
    try {
        const stored = localStorage.getItem(PREF_STORAGE_KEY);
        if (!stored) return;
        const all = JSON.parse(stored);
        
        // Traverse all announcements and faculty entries
        let found = false;
        Object.keys(all).forEach(annId => {
            if (announcementId && annId !== announcementId) return;
            const facMap = all[annId] || {};
            Object.keys(facMap).forEach(fId => {
                if (facultyId && fId !== facultyId) return;
                const prefs = facMap[fId] || [];
                prefs.forEach(p => {
                    if (p.id === preferenceId || (p.subject_id && preferenceId && p.subject_id === preferenceId)) {
                        p.is_allocated = Boolean(isAllocated);
                        p.allocated_at = isAllocated ? new Date().toISOString() : null;
                        found = true;
                    }
                });
            });
        });

        if (found) {
            localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(all));
        }
    } catch (e) {
        console.error('Error updating fallback allocation:', e);
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
                is_allocated,
                allocated_at,
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
            return data;
        }

        // If Supabase returned 0 rows, check if localStorage has preferences that need auto-syncing to Supabase
        const fallback = getFallbackPreferences(announcementId);
        const localList = fallback[facultyId] || [];
        if (localList.length > 0) {
            // Push to Supabase in the background
            saveFacultyPreferences(announcementId, facultyId, localList).catch(e => console.warn('Sync notice:', e));
            return localList;
        }

        return [];
    } catch (err) {
        console.error('Error fetching faculty preferences:', err);
        const fallback = getFallbackPreferences(announcementId);
        return fallback[facultyId] || [];
    }
};

/**
 * Fetch all faculty submissions for an announcement (Admin view for Schedule Allocation)
 */
/**
 * Fetch all faculty submissions for an announcement (Admin view for Schedule Allocation)
 */
export const fetchAllResponsesForAnnouncement = async (announcementId) => {
    if (!announcementId) return [];

    try {
        // 1. Fetch raw preferences from database
        let { data, error } = await supabase
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
                is_allocated,
                allocated_at,
                created_at,
                faculty:profiles(id, full_name, email, role, department),
                subject:subjects(id, code, name, credits, type)
            `)
            .eq('announcement_id', announcementId)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Retrying fetchAllResponses without join syntax:', error.message);
            // Fallback to plain select without nested joins in case foreign key alias isn't named faculty/subject
            const { data: plainData, error: plainErr } = await supabase
                .from('faculty_subject_preferences')
                .select('*')
                .eq('announcement_id', announcementId)
                .order('created_at', { ascending: false });

            if (!plainErr && plainData) {
                data = plainData;
            }
        }

        // If no records found for this specific announcementId, also check if any exist in the table generally
        if (!data || data.length === 0) {
            const { data: allTableData } = await supabase
                .from('faculty_subject_preferences')
                .select('*')
                .order('created_at', { ascending: false });

            if (allTableData && allTableData.length > 0) {
                // Filter or use all if this is the only active call
                data = allTableData;
            }
        }

        let results = data || [];

        // 2. Fetch profiles and subjects to hydrate any missing relations
        const missingFacultyIds = results.filter(r => !r.faculty || !r.faculty.full_name).map(r => r.faculty_id);
        const missingSubjectIds = results.filter(r => !r.subject || !r.subject.name).map(r => r.subject_id);

        let profilesMap = {};
        if (missingFacultyIds.length > 0) {
            const { data: profs } = await supabase
                .from('profiles')
                .select('id, full_name, email, role, department')
                .in('id', [...new Set(missingFacultyIds)]);
            (profs || []).forEach(p => { profilesMap[p.id] = p; });
        }

        let subjectsMap = {};
        if (missingSubjectIds.length > 0) {
            const { data: subs } = await supabase
                .from('subjects')
                .select('id, code, name, credits, type')
                .in('id', [...new Set(missingSubjectIds)]);
            (subs || []).forEach(s => { subjectsMap[s.id] = s; });
        }

        // Hydrate
        results = results.map(row => ({
            ...row,
            faculty: row.faculty || profilesMap[row.faculty_id] || { id: row.faculty_id, full_name: 'Faculty Member', department: 'Academic' },
            subject: row.subject || subjectsMap[row.subject_id] || { id: row.subject_id, code: 'SUB', name: 'Subject' },
            is_allocated: Boolean(row.is_allocated)
        }));

        // 3. Merge with localStorage fallback (so offline/local submissions are never lost)
        const fallback = getFallbackPreferences();
        const allLocalEntries = [];
        Object.keys(fallback).forEach(annId => {
            const facMap = fallback[annId] || {};
            Object.keys(facMap).forEach(fId => {
                const prefs = facMap[fId] || [];
                prefs.forEach(p => {
                    // Check if already in results
                    const exists = results.some(r => 
                        (r.id && r.id === p.id) || 
                        (r.faculty_id === fId && r.subject_id === p.subject_id)
                    );
                    if (!exists) {
                        allLocalEntries.push({
                            ...p,
                            announcement_id: p.announcement_id || announcementId,
                            faculty_id: p.faculty_id || fId,
                            faculty: p.faculty || { id: fId, full_name: 'Faculty Member', department: 'Academic' },
                            is_allocated: Boolean(p.is_allocated)
                        });
                    }
                });
            });
        });

        return [...results, ...allLocalEntries];
    } catch (err) {
        console.error('Error in fetchAllResponsesForAnnouncement:', err);
        const fallback = getFallbackPreferences();
        const list = [];
        Object.keys(fallback).forEach(annId => {
            const facMap = fallback[annId] || {};
            Object.keys(facMap).forEach(fId => {
                const prefs = facMap[fId] || [];
                prefs.forEach(p => list.push({
                    ...p,
                    faculty: p.faculty || { id: fId, full_name: 'Faculty Member', department: 'Academic' }
                }));
            });
        });
        return list;
    }
};

/**
 * Admin: Toggle allocation status (Approved / Pending) for a faculty subject preference
 * @param {string} preferenceId
 * @param {boolean} isAllocated
 * @param {object} meta - { announcementId, facultyId, subjectId, adminId }
 */
export const togglePreferenceAllocation = async (preferenceId, isAllocated, meta = {}) => {
    const newStatus = Boolean(isAllocated);
    const allocatedAt = newStatus ? new Date().toISOString() : null;

    // 1. Update local storage fallback immediately
    updateFallbackPreferenceAllocation(preferenceId, newStatus, meta.announcementId, meta.facultyId);

    // 2. Persist to Supabase
    try {
        if (preferenceId && !preferenceId.toString().startsWith('local_')) {
            const { data, error } = await supabase
                .from('faculty_subject_preferences')
                .update({
                    is_allocated: newStatus,
                    allocated_at: allocatedAt,
                    updated_at: new Date().toISOString()
                })
                .eq('id', preferenceId)
                .select();

            if (error) {
                console.warn('Supabase toggle allocation error (using local storage fallback):', error.message);
            } else if (data && data[0]) {
                return { success: true, preference: data[0] };
            }
        }
        return { success: true, is_allocated: newStatus, allocated_at: allocatedAt };
    } catch (err) {
        console.error('Error toggling preference allocation:', err);
        return { success: true, is_allocated: newStatus, allocated_at: allocatedAt };
    }
};

/**
 * Admin: Batch allocate or de-allocate multiple subject preferences
 * @param {string} announcementId
 * @param {Array<string>} preferenceIds
 * @param {boolean} isAllocated
 */
export const batchAllocatePreferences = async (announcementId, preferenceIds, isAllocated) => {
    const newStatus = Boolean(isAllocated);
    const allocatedAt = newStatus ? new Date().toISOString() : null;

    if (!preferenceIds || preferenceIds.length === 0) return { success: true, count: 0 };

    // Update fallback storage for all
    preferenceIds.forEach(pId => {
        updateFallbackPreferenceAllocation(pId, newStatus, announcementId);
    });

    try {
        const validDbIds = preferenceIds.filter(id => !id.toString().startsWith('local_'));
        if (validDbIds.length > 0) {
            await supabase
                .from('faculty_subject_preferences')
                .update({
                    is_allocated: newStatus,
                    allocated_at: allocatedAt,
                    updated_at: new Date().toISOString()
                })
                .in('id', validDbIds);
        }
        return { success: true, count: preferenceIds.length };
    } catch (err) {
        console.error('Error in batchAllocatePreferences:', err);
        return { success: true, count: preferenceIds.length };
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
            .select();

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
                is_allocated: item.is_allocated || false,
                created_at: new Date().toISOString(),
                subject: item.subject
            }));
            saveFallbackPreferences(announcementId, facultyId, localList);
            return localList;
        }

        // Attach subject object to saved data
        const enrichedData = (data || []).map((row, idx) => ({
            ...row,
            subject: preferencesList[idx]?.subject || row.subject
        }));

        // Also update local fallback cache
        saveFallbackPreferences(announcementId, facultyId, enrichedData);
        return enrichedData;
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
