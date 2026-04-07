import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useStudentAttendance = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjectData, setSubjectData] = useState([]);

  useEffect(() => {
    if (!profile?.id) return;
    
    fetchAttendanceInfo();

    const channel = supabase.channel('student_attendance_realtime')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'attendance_records', filter: `student_id=eq.${profile.id}` }, 
        () => fetchAttendanceInfo()
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'attendance_sessions' }, 
        () => fetchAttendanceInfo()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const fetchAttendanceInfo = async () => {
    try {
      const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select('allocation_id, subject_allocations(subject:subjects(name, code))')
        .eq('student_id', profile.id);

      if (enrollError) throw enrollError;

      if (!enrollments || enrollments.length === 0) {
        setSubjectData([]);
        setLoading(false);
        return;
      }

      const allocIds = enrollments.map(e => e.allocation_id);

      const { data: sessions, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('id, allocation_id')
        .in('allocation_id', allocIds);
        
      if (sessionError) throw sessionError;

      const { data: records, error: recordError } = await supabase
        .from('attendance_records')
        .select('session_id, status')
        .eq('student_id', profile.id);

      if (recordError) throw recordError;

      const recordMap = {};
      records.forEach(r => {
        recordMap[r.session_id] = r.status;
      });

      const aggregatedData = enrollments.map(enroll => {
        const allocId = enroll.allocation_id;
        const subject = enroll.subject_allocations?.subject;
        const allocSessions = sessions.filter(s => s.allocation_id === allocId);
        const total = allocSessions.length;
        
        let presentCount = 0;
        allocSessions.forEach(session => {
           if (recordMap[session.id] === 'present') {
              presentCount++;
           }
        });

        return {
           subject: subject?.code || 'Unknown',
           full: subject?.name || 'Unknown Course',
           present: presentCount,
           total: total
        };
      });

      setSubjectData(aggregatedData);
    } catch (err) {
      console.error("Error fetching realtime attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  const overallPresent = subjectData.reduce((a, s) => a + s.present, 0);
  const overallTotal = subjectData.reduce((a, s) => a + s.total, 0);
  const overallPct = overallTotal === 0 ? 100 : Math.round((overallPresent / overallTotal) * 100);

  return { loading, subjectData, overallPct, overallPresent, overallTotal };
};
