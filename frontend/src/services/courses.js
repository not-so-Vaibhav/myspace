import { supabase } from '../lib/supabase';

/**
 * Fetch courses with optional filters
 * @param {Object} opts - Options object
 * @param {string} opts.instructorId - Filter by instructor ID (for teachers viewing their own courses)
 * @param {boolean} opts.publishedOnly - Filter to only published courses (for students)
 * @param {number} opts.limit - Maximum number of courses to fetch
 * @returns {Promise<Array>} Array of course objects
 */
export async function fetchCourses(opts = {}) {
  try {
    const { instructorId, publishedOnly, limit = 100 } = opts;
    let q = supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (instructorId) {
      q = q.eq('instructor_id', instructorId);
    }

    if (publishedOnly) {
      q = q.eq('is_published', true);
    }

    if (limit) {
      q = q.limit(limit);
    }

    const { data, error } = await q;

    if (error) {
      console.error('Error fetching courses:', error);
      throw new Error('Failed to load courses. Please try again.');
    }

    return data || [];
  } catch (error) {
    console.error('fetchCourses error:', error);
    throw error;
  }
}

export async function fetchCourseById(id) {
  const { data, error } = await supabase.from('courses').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function fetchModulesByCourseId(courseId) {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchLessonsByModuleId(moduleId) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('module_id', moduleId)
    .order('order', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Enroll a student in a course
 * @param {string} userId - User ID
 * @param {number} courseId - Course ID
 * @param {string} paymentStatus - Payment status: 'free', 'pending', 'completed', etc.
 * @returns {Promise<void>}
 */
export async function enrollStudent(userId, courseId, paymentStatus = 'free') {
  try {
    const { error } = await supabase
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        payment_status: paymentStatus
      });

    if (error) {
      console.error('Error enrolling student:', error);

      // Handle specific error cases
      if (error.code === '23505') {
        throw new Error('You are already enrolled in this course.');
      }

      throw new Error('Failed to enroll. Please try again.');
    }
  } catch (error) {
    console.error('enrollStudent error:', error);
    throw error;
  }
}

/**
 * Unenroll a student from a course
 * @param {string} userId - User ID
 * @param {number} courseId - Course ID
 * @returns {Promise<void>}
 */
export async function unenrollStudent(userId, courseId) {
  try {
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error unenrolling student:', error);
      throw new Error('Failed to unenroll. Please try again.');
    }
  } catch (error) {
    console.error('unenrollStudent error:', error);
    throw error;
  }
}

export async function checkEnrolled(userId, courseId) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function fetchCompletedLessonIds(userId, courseId) {
  const modules = await fetchModulesByCourseId(courseId);
  const moduleIds = modules.map((m) => m.id);
  if (moduleIds.length === 0) return new Set();
  const { data: lessons } = await supabase.from('lessons').select('id').in('module_id', moduleIds);
  const lessonIds = (lessons || []).map((l) => l.id);
  if (lessonIds.length === 0) return new Set();
  const { data: progress } = await supabase.from('lesson_progress').select('lesson_id').eq('user_id', userId).in('lesson_id', lessonIds);
  return new Set((progress || []).map((p) => p.lesson_id));
}

export async function markLessonComplete(userId, lessonId) {
  const { error } = await supabase.from('lesson_progress').upsert(
    { user_id: userId, lesson_id: lessonId },
    { onConflict: 'user_id,lesson_id' }
  );
  if (error) throw error;
}

export async function getCourseProgress(userId, courseId) {
  const modules = await fetchModulesByCourseId(courseId);
  const moduleIds = modules.map((m) => m.id);
  if (moduleIds.length === 0) return { percent: 0, completed: 0, total: 0, lastActivity: null };
  const { data: lessons } = await supabase.from('lessons').select('id').in('module_id', moduleIds);
  const lessonIds = (lessons || []).map((l) => l.id);
  const totalLessons = lessonIds.length;
  if (totalLessons === 0) return { percent: 0, completed: 0, total: 0, lastActivity: null };
  const { data: progress } = await supabase.from('lesson_progress').select('lesson_id, completed_at').eq('user_id', userId).in('lesson_id', lessonIds).order('completed_at', { ascending: false });
  const completed = (progress || []).length;
  const lastActivity = progress?.[0]?.completed_at || null;
  return { percent: Math.round((completed / totalLessons) * 100), completed, total: totalLessons, lastActivity };
}

/**
 * Create a new course
 * @param {string} instructorId - Instructor's user ID
 * @param {Object} courseData - Course details
 * @param {string} courseData.title - Course title
 * @param {string} courseData.description - Course description
 * @param {number} courseData.price - Course price (default: 0 for free)
 * @param {boolean} courseData.is_published - Whether course is published (default: false)
 * @returns {Promise<number>} Created course ID
 */
export async function createCourse(instructorId, courseData) {
  try {
    const { title, description = '', price = 0, is_published = false } = courseData;

    if (!title || !title.trim()) {
      throw new Error('Course title is required.');
    }

    if (price < 0) {
      throw new Error('Course price cannot be negative.');
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: title.trim(),
        description: description.trim(),
        instructor_id: instructorId,
        price,
        is_published
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating course:', error);
      throw new Error('Failed to create course. Please try again.');
    }

    return data.id;
  } catch (error) {
    console.error('createCourse error:', error);
    throw error;
  }
}

/**
 * Update a course
 * @param {number} courseId - Course ID
 * @param {string} instructorId - Instructor's user ID (for authorization)
 * @param {Object} payload - Fields to update
 * @returns {Promise<void>}
 */
export async function updateCourse(courseId, instructorId, payload) {
  try {
    if (payload.price !== undefined && payload.price < 0) {
      throw new Error('Course price cannot be negative.');
    }

    const { error } = await supabase
      .from('courses')
      .update(payload)
      .eq('id', courseId)
      .eq('instructor_id', instructorId);

    if (error) {
      console.error('Error updating course:', error);
      throw new Error('Failed to update course. Please try again.');
    }
  } catch (error) {
    console.error('updateCourse error:', error);
    throw error;
  }
}

/**
 * Delete a course
 * @param {number} courseId - Course ID
 * @param {string} instructorId - Instructor's user ID (for authorization)
 * @returns {Promise<void>}
 */
export async function deleteCourse(courseId, instructorId) {
  try {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('instructor_id', instructorId);

    if (error) {
      console.error('Error deleting course:', error);
      throw new Error('Failed to delete course. Please try again.');
    }
  } catch (error) {
    console.error('deleteCourse error:', error);
    throw error;
  }
}

/**
 * Publish or unpublish a course
 * @param {number} courseId - Course ID
 * @param {string} instructorId - Instructor's user ID (for authorization)
 * @param {boolean} isPublished - Whether to publish (true) or unpublish (false)
 * @returns {Promise<void>}
 */
export async function publishCourse(courseId, instructorId, isPublished) {
  try {
    const { error } = await supabase
      .from('courses')
      .update({ is_published: isPublished })
      .eq('id', courseId)
      .eq('instructor_id', instructorId);

    if (error) {
      console.error('Error publishing/unpublishing course:', error);
      throw new Error(`Failed to ${isPublished ? 'publish' : 'unpublish'} course. Please try again.`);
    }
  } catch (error) {
    console.error('publishCourse error:', error);
    throw error;
  }
}

/**
 * Fetch all courses a user is enrolled in
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of courses with enrollment data
 */
export async function fetchEnrolledCourses(userId) {
  try {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        payment_status,
        course_id,
        courses (
          id,
          title,
          description,
          price,
          instructor_id,
          thumbnail_url,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('Error fetching enrolled courses:', error);
      throw new Error('Failed to load enrolled courses. Please try again.');
    }

    // Flatten the structure to return courses with enrollment info
    return (data || []).map(enrollment => ({
      ...enrollment.courses,
      enrollment_id: enrollment.id,
      enrolled_at: enrollment.enrolled_at,
      payment_status: enrollment.payment_status
    }));
  } catch (error) {
    console.error('fetchEnrolledCourses error:', error);
    throw error;
  }
}

export async function createModule(courseId, title, order = 0) {
  const { data, error } = await supabase.from('modules').insert({ course_id: courseId, title, order }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function createLesson(moduleId, title, contentUrl = null, durationMinutes = null, order = 0) {
  const { data, error } = await supabase.from('lessons').insert({ module_id: moduleId, title, content_url: contentUrl, duration_minutes: durationMinutes, order }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function fetchCourseResources(courseId) {
  const { data, error } = await supabase.from('course_resources').select('*').eq('course_id', courseId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getEnrolledCount(courseId) {
  const { count, error } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('course_id', courseId);
  if (error) throw error;
  return count ?? 0;
}
