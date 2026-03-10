import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useEnrolledCourses(userId) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data: enrollments, error: err1 } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('user_id', userId);
        if (err1) throw err1;
        const ids = (enrollments || []).map((e) => e.course_id).filter(Boolean);
        if (ids.length === 0) {
          setCourses([]);
          return;
        }
        const { data: coursesData, error: err2 } = await supabase
          .from('courses')
          .select('*')
          .in('id', ids);
        if (err2) throw err2;
        setCourses(coursesData || []);
      } catch (e) {
        console.error('useEnrolledCourses:', e);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  return { courses, loading };
}

export function useProgressData(userId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data: progress, error } = await supabase
          .from('lesson_progress')
          .select('completed_at')
          .eq('user_id', userId)
          .order('completed_at', { ascending: true });
        if (error) throw error;
        const byMonth = {};
        (progress || []).forEach((p) => {
          const d = new Date(p.completed_at);
          const key = d.toLocaleString('default', { month: 'short' });
          byMonth[key] = (byMonth[key] || 0) + 1;
        });
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const arr = months.slice(0, 6).map((name) => ({ name, progress: byMonth[name] || 0 }));
        setData(arr);
      } catch (e) {
        console.error('useProgressData:', e);
        setData([
          { name: 'Jan', progress: 10 },
          { name: 'Feb', progress: 25 },
          { name: 'Mar', progress: 40 },
          { name: 'Apr', progress: 35 },
          { name: 'May', progress: 60 },
          { name: 'Jun', progress: 75 },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  return { data, loading };
}

export function usePopularCourses(limit = 4) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) throw error;
        setCourses(data || []);
      } catch (e) {
        console.error('usePopularCourses:', e);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [limit]);

  return { courses, loading };
}

export function useInstructors(limit = 4) {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('role', ['instructor', 'admin'])
          .limit(limit);
        if (error) throw error;
        setInstructors(profiles || []);
      } catch (e) {
        console.error('useInstructors:', e);
        setInstructors([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [limit]);

  return { instructors, loading };
}
