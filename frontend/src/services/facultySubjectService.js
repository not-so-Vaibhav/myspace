import { supabase } from '../lib/supabase';

/**
 * Service to manage Subject Tags for Teaching Personnel (Faculty & HOD)
 */

// Local fallback key in case Supabase table migration is pending execution
const FALLBACK_STORAGE_KEY = 'mit_learn_faculty_subject_tags';

const getFallbackTags = (facultyId) => {
    try {
        const stored = localStorage.getItem(FALLBACK_STORAGE_KEY);
        if (!stored) return [];
        const all = JSON.parse(stored);
        return facultyId ? (all[facultyId] || []) : all;
    } catch {
        return [];
    }
};

const saveFallbackTags = (facultyId, tags) => {
    try {
        const stored = localStorage.getItem(FALLBACK_STORAGE_KEY);
        const all = stored ? JSON.parse(stored) : {};
        all[facultyId] = tags;
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
        console.error('Local fallback storage error:', e);
    }
};

/**
 * Fetch all available subjects from the institution's subject registry
 */
export const fetchAvailableSubjects = async () => {
    try {
        const { data, error } = await supabase
            .from('subjects')
            .select('id, code, name, credits, type')
            .order('code', { ascending: true });

        if (error) {
            console.warn('Could not fetch subjects from database:', error.message);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('Error fetching subjects:', err);
        return [];
    }
};

/**
 * Fetch subject tags for a specific faculty member
 * @param {string} facultyId - UUID of the faculty profile
 */
export const fetchFacultySubjectTags = async (facultyId) => {
    if (!facultyId) return [];

    try {
        const { data, error } = await supabase
            .from('faculty_subject_tags')
            .select(`
                id,
                faculty_id,
                subject_id,
                created_at,
                subject:subjects(id, code, name, credits, type)
            `)
            .eq('faculty_id', facultyId);

        if (error) {
            // Check if error is due to missing table (PGRST205 or similar)
            console.warn('faculty_subject_tags query fallback:', error.message);
            const fallback = getFallbackTags(facultyId);
            return fallback;
        }

        // Cache into local fallback
        if (data && data.length > 0) {
            saveFallbackTags(facultyId, data);
        }
        return data || [];
    } catch (err) {
        console.error('Error in fetchFacultySubjectTags:', err);
        return getFallbackTags(facultyId);
    }
};

/**
 * Fetch all faculty subject tags grouped by faculty_id for Admin search/listing
 */
export const fetchAllFacultySubjectTags = async () => {
    try {
        const { data, error } = await supabase
            .from('faculty_subject_tags')
            .select(`
                id,
                faculty_id,
                subject_id,
                created_at,
                subject:subjects(id, code, name, credits, type)
            `);

        if (error) {
            console.warn('fetchAllFacultySubjectTags fallback:', error.message);
            return getFallbackTags();
        }

        // Group by faculty_id
        const grouped = {};
        (data || []).forEach(item => {
            if (!grouped[item.faculty_id]) grouped[item.faculty_id] = [];
            grouped[item.faculty_id].push(item);
        });

        return grouped;
    } catch (err) {
        console.error('Error in fetchAllFacultySubjectTags:', err);
        return getFallbackTags();
    }
};

/**
 * Add a subject tag for a faculty member
 * @param {string} facultyId - Profile ID of the faculty
 * @param {object} subject - Complete subject object { id, code, name, credits, type }
 */
export const addFacultySubjectTag = async (facultyId, subject) => {
    if (!facultyId || !subject?.id) {
        throw new Error('Faculty ID and Subject ID are required.');
    }

    try {
        // Try inserting into Supabase faculty_subject_tags table
        const { data, error } = await supabase
            .from('faculty_subject_tags')
            .insert([{
                faculty_id: facultyId,
                subject_id: subject.id
            }])
            .select(`
                id,
                faculty_id,
                subject_id,
                created_at,
                subject:subjects(id, code, name, credits, type)
            `)
            .single();

        if (error) {
            // Handle unique constraint error
            if (error.code === '23505') {
                throw new Error(`Subject [${subject.code}] is already tagged to your profile.`);
            }

            console.warn('Supabase insert failed, saving to local fallback:', error.message);
            // Save to fallback storage
            const currentTags = getFallbackTags(facultyId);
            const exists = currentTags.some(t => t.subject_id === subject.id || t.subject?.id === subject.id);
            if (exists) {
                throw new Error(`Subject [${subject.code}] is already tagged to your profile.`);
            }

            const newTag = {
                id: 'local_' + Date.now(),
                faculty_id: facultyId,
                subject_id: subject.id,
                created_at: new Date().toISOString(),
                subject: subject
            };
            const updated = [...currentTags, newTag];
            saveFallbackTags(facultyId, updated);
            return newTag;
        }

        // Also update local fallback cache
        const currentTags = getFallbackTags(facultyId);
        saveFallbackTags(facultyId, [...currentTags.filter(t => t.subject_id !== subject.id), data]);

        return data;
    } catch (err) {
        throw err;
    }
};

/**
 * Remove a subject tag from a faculty profile
 * @param {string} tagId - Tag record ID
 * @param {string} facultyId - Faculty profile ID
 * @param {string} subjectId - Subject ID
 */
export const removeFacultySubjectTag = async (tagId, facultyId, subjectId) => {
    if (!facultyId) throw new Error('Faculty ID is required.');

    try {
        let error = null;

        if (tagId && !tagId.startsWith('local_')) {
            const res = await supabase
                .from('faculty_subject_tags')
                .delete()
                .eq('id', tagId);
            error = res.error;
        } else if (subjectId) {
            const res = await supabase
                .from('faculty_subject_tags')
                .delete()
                .eq('faculty_id', facultyId)
                .eq('subject_id', subjectId);
            error = res.error;
        }

        if (error) {
            console.warn('Supabase tag delete fallback:', error.message);
        }

        // Clean local fallback
        const currentTags = getFallbackTags(facultyId);
        const updated = currentTags.filter(t => 
            t.id !== tagId && 
            t.subject_id !== subjectId && 
            t.subject?.id !== subjectId
        );
        saveFallbackTags(facultyId, updated);

        return true;
    } catch (err) {
        console.error('Error removing subject tag:', err);
        throw err;
    }
};
