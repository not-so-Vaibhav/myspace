// ─────────────────────────────────────────────────────────────────────────────
// useAcademicProgression.js
// Reusable hooks for querying the academic-progression tables and
// optimized reporting views (v_student_transcript, v_student_cgpa, etc.)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ── 1. Student: fetch full transcript + pending backlogs ─────────────────────
export function useStudentResults(studentId) {
  const [results, setResults]     = useState([]);   // array of semesters, each with subjects[]
  const [backlogs, setBacklogs]   = useState([]);   // pending backlog rows
  const [semesters, setSemesters] = useState([]);   // distinct semester terms for the tab bar
  const [currentSem, setCurrentSem] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetch = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch full transcript from the new optimized view
      const { data: rawResults, error: rErr } = await supabase
        .from('v_student_transcript')
        .select('*')
        .eq('student_id', studentId)
        .order('semester', { ascending: true })
        .order('subject_code',  { ascending: true });

      if (rErr) throw rErr;

      // v_pending_backlogs filtered to this student
      const { data: rawBacklogs, error: bErr } = await supabase
        .from('v_pending_backlogs')
        .select('*')
        .eq('student_id', studentId)
        .order('origin_semester_term', { ascending: true });

      if (bErr) throw bErr;

      // Build distinct semester list for the tab bar
      const semMap = {};
      (rawResults || []).forEach(r => {
        // v_student_transcript doesn't have academic_year_id, it has academic_year label and semester
        const key = `${r.academic_year}-${r.semester}`;
        if (!semMap[key]) {
          semMap[key] = {
            key,
            academic_year: r.academic_year,
            semester_term: r.semester,
            label: `${r.academic_year} – Sem ${r.semester}`
          };
        }
      });
      const semList = Object.values(semMap);
      setSemesters(semList);

      // Default to the last (most recent) semester
      if (semList.length > 0 && !currentSem) {
        setCurrentSem(semList[semList.length - 1].key);
      }

      setResults(rawResults || []);
      setBacklogs(rawBacklogs || []);
    } catch (err) {
      console.error('[useStudentResults]', err);
      setError(err.message || 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);

  // Filter results to the currently active semester tab
  const activeSemResults = results.filter(r => {
    if (!currentSem) return false;
    const key = `${r.academic_year}-${r.semester}`;
    return key === currentSem;
  });

  // Aggregate SGPA for the active semester (average of grade_points × credits)
  // Only considers subjects where result is published and points exist
  const activeSGPA = (() => {
    const rows = activeSemResults.filter(r => r.is_published && r.grade_points != null && r.subject_credits != null);
    if (rows.length === 0) return null;
    const totalPoints  = rows.reduce((s, r) => s + parseFloat(r.grade_points) * parseFloat(r.subject_credits), 0);
    const totalCredits = rows.reduce((s, r) => s + parseFloat(r.subject_credits), 0);
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : null;
  })();

  return {
    results,           // all raw result rows
    activeSemResults,  // rows for the selected tab
    backlogs,          // pending backlogs
    semesters,         // [{key, label, academic_year, semester_term}]
    currentSem,
    setCurrentSem,
    activeSGPA,
    loading,
    error,
    refetch: fetch,
  };
}

// ── 2. Student: fetch CGPA from optimized view ────────────────────────────────
export function useStudentCGPA(studentId) {
  const [cgpaData, setCgpaData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const fetch = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('v_student_cgpa')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      if (err) throw err;
      setCgpaData(data);
    } catch (err) {
      console.error('[useStudentCGPA]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { cgpaData, loading, error, refetch: fetch };
}

// ── 3. Dean/Admin: Department Statistics ──────────────────────────────────────
export function useDepartmentStatistics() {
  const [deptStats, setDeptStats] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('v_department_statistics')
        .select('*')
        .order('department_name');

      if (err) throw err;
      setDeptStats(data || []);
    } catch (err) {
      console.error('[useDepartmentStatistics]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { deptStats, loading, error, refetch: fetch };
}

// ── 4. HOD: Semester/Batch Statistics ─────────────────────────────────────────
export function useSemesterStatistics() {
  const [semesterStats, setSemesterStats] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('v_semester_statistics')
        .select('*')
        .order('academic_year', { ascending: false })
        .order('semester_term', { ascending: false });

      if (err) throw err;
      setSemesterStats(data || []);
    } catch (err) {
      console.error('[useSemesterStatistics]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { semesterStats, loading, error, refetch: fetch };
}

// ── 5. All Users: Academic Calendar ───────────────────────────────────────────
export function useAcademicCalendar() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('academic_calendar')
        .select('*')
        .order('start_date', { ascending: true });

      if (err) throw err;
      setEvents(data || []);
    } catch (err) {
      console.error('[useAcademicCalendar]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { events, loading, error, refetch: fetch };
}


// ── 6. Admin / HOD: institution-wide backlog summary (Legacy) ─────────────────
export function useBacklogSummary() {
  const [backlogs, setBacklogs]   = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err, count } = await supabase
        .from('v_pending_backlogs')
        .select('*', { count: 'exact' })
        .order('backlog_created_at', { ascending: false })
        .limit(20);

      if (err) throw err;
      setBacklogs(data || []);
      setTotalPending(count || 0);
    } catch (err) {
      console.error('[useBacklogSummary]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { backlogs, totalPending, loading, error, refetch: fetch };
}

// ── 7. Dean: promotion summary (Legacy) ───────────────────────────────────────
export function usePromotionSummary() {
  const [promotions, setPromotions] = useState([]);
  const [counts, setCounts]         = useState({ promoted: 0, held_back: 0, detained: 0, graduated: 0 });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('v_promotion_summary')
        .select('*')
        .order('decided_at', { ascending: false })
        .limit(50);

      if (err) throw err;

      const rows = data || [];
      setPromotions(rows);

      const c = { promoted: 0, held_back: 0, detained: 0, graduated: 0, withdrawn: 0 };
      rows.forEach(r => { if (c[r.decision] !== undefined) c[r.decision]++; });
      setCounts(c);
    } catch (err) {
      console.error('[usePromotionSummary]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { promotions, counts, loading, error, refetch: fetch };
}

// ── 8. Student: fetch current semester/batch ─────────────────────────────────
export function useStudentCurrentSemester(studentId) {
  const [semesterInfo, setSemesterInfo] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const fetch = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('v_student_current_semester')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      if (err) throw err;
      setSemesterInfo(data || null);
    } catch (err) {
      console.error('[useStudentCurrentSemester]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { semesterInfo, loading, error, refetch: fetch };
}
