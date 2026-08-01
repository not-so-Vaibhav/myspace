import { useAuth } from '../../context/AuthContext';
import { useStudentResults, useStudentCurrentSemester, useStudentCGPA } from '../../hooks/useAcademicProgression';
import {
  Award, Printer, ChevronRight, CheckCircle2, AlertTriangle,
  Loader2, RefreshCw, BookOpen, TrendingUp, XCircle
} from 'lucide-react';

// ─── Grade color helper ───────────────────────────────────────────────────────
const gradeColor = (grade) => {
  if (!grade) return 'text-gray-400';
  const g = grade.toUpperCase();
  if (['O', 'A+'].includes(g))     return 'text-emerald-600';
  if (['A', 'B+'].includes(g))     return 'text-blue-600';
  if (['B', 'C+', 'C'].includes(g)) return 'text-amber-600';
  if (g === 'F')                   return 'text-red-500';
  return 'text-gray-600';
};

const passChipStyle = (isPass) => isPass
  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
  : 'bg-red-50 text-red-500 border-red-100';

// ─── Results page ─────────────────────────────────────────────────────────────
const Results = () => {
  const { profile, user } = useAuth();

  const {
    activeSemResults,
    backlogs,
    semesters,
    currentSem,
    setCurrentSem,
    activeSGPA,
    loading: resultsLoading,
    error: resultsError,
    refetch: refetchResults,
  } = useStudentResults(user?.id);

  const { semesterInfo } = useStudentCurrentSemester(user?.id);
  const { cgpaData, loading: cgpaLoading, error: cgpaError } = useStudentCGPA(user?.id);

  const loading = resultsLoading || cgpaLoading;
  const error = resultsError || cgpaError;
  const refetch = () => { refetchResults(); };

  const cgpa = cgpaData?.cgpa || null;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-8 sm:p-12 min-h-screen bg-[#fcfdfe] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-[#1a1b4b] animate-spin" />
      <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">
        Fetching Academic Records…
      </p>
    </div>
  );

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) return (
    <div className="p-8 sm:p-12 min-h-screen bg-[#fcfdfe] flex flex-col items-center justify-center gap-4">
      <XCircle className="w-12 h-12 text-red-400" />
      <p className="text-sm font-bold text-red-500">{error}</p>
      <button
        onClick={refetch}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-[#2d3a8c] transition-all"
      >
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );

  // ── Empty state (no results in DB yet) ────────────────────────────────────
  if (semesters.length === 0) return (
    <div className="p-8 sm:p-12 min-h-screen bg-[#fcfdfe] flex flex-col items-center justify-center gap-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-[#1a1b4b]/5 flex items-center justify-center">
        <BookOpen size={36} className="text-[#1a1b4b]/30" />
      </div>
      <div>
        <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter">No Results Yet</h2>
        <p className="text-sm text-gray-400 font-bold mt-1">
          Exam results will appear here once they are published by your faculty.
        </p>
      </div>
      {semesterInfo && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 text-sm text-[#1a1b4b] font-bold">
          Current Semester: <span className="text-[#ef4444]">{semesterInfo.year_level} – Sem {semesterInfo.semester_term}</span>
          {semesterInfo.batch_name && <> &nbsp;|&nbsp; Batch: <span className="text-[#ef4444]">{semesterInfo.batch_name}</span></>}
        </div>
      )}
    </div>
  );

  // ── Derive current result metadata for the result card header ─────────────
  const activeSemMeta   = semesters.find(s => s.key === currentSem);
  const totalCredits    = activeSemResults
    .filter(r => r.attempt_number === 1)
    .reduce((sum, r) => sum + (parseFloat(r.subject_credits) || 0), 0);
  const passCount       = activeSemResults.filter(r => r.attempt_number === 1 && r.result_status === 'PASS').length;
  const failCount       = activeSemResults.filter(r => r.attempt_number === 1 && r.result_status !== 'PASS' && r.result_status !== null).length;

  const performanceStatus = (() => {
    if (!activeSGPA) return '—';
    const gpa = parseFloat(activeSGPA);
    if (gpa >= 9)    return 'Outstanding';
    if (gpa >= 8)    return 'First Class with Distinction';
    if (gpa >= 6.5)  return 'First Class';
    if (gpa >= 5.5)  return 'Second Class';
    return 'Pass';
  })();

  return (
    <div className="p-8 sm:p-12 space-y-10 bg-[#fcfdfe] min-h-screen">
      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 1.25cm; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-canvas {
            padding: 0 !important; margin: 0 !important;
            max-width: 100% !important; border: 1px solid #f0f0f0 !important;
            box-shadow: none !important; border-radius: 1rem !important;
          }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 no-print">
        <div>
          <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
            <Award className="text-[#ef4444]" /> Academic Results
          </h1>
          <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
            Grade Cards & Performance Tracking
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 text-[#1a1b4b] rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-[#2d3a8c] transition-all shadow-md"
          >
            <Printer size={14} /> Print Result
          </button>
        </div>
      </div>

      {/* ── Current Semester Info Banner ────────────────────────────────────── */}
      {semesterInfo && (
        <div className="no-print bg-gradient-to-r from-[#1a1b4b]/5 to-transparent border border-[#1a1b4b]/10 rounded-2xl px-6 py-4 flex flex-wrap gap-6 text-sm font-bold text-[#1a1b4b]">
          <span>📍 Current: <span className="text-[#ef4444]">{semesterInfo.academic_year_label || semesterInfo.year_level} – Sem {semesterInfo.semester_term}</span></span>
          {semesterInfo.batch_name && (
            <span>🎓 Batch: <span className="text-[#ef4444]">{semesterInfo.batch_name}</span></span>
          )}
          {semesterInfo.department_name && (
            <span>🏛️ Dept: <span className="text-[#ef4444]">{semesterInfo.department_name}</span></span>
          )}
        </div>
      )}

      {/* ── Semester Tab Selector ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 no-print">
        {semesters.map(sem => (
          <button
            key={sem.key}
            onClick={() => setCurrentSem(sem.key)}
            className={`px-6 py-3 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all ${
              currentSem === sem.key
                ? 'bg-[#1a1b4b] text-white shadow-lg shadow-[#1a1b4b]/20 scale-105'
                : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'
            }`}
          >
            {sem.label}
          </button>
        ))}
      </div>

      {/* ── Active Backlog Alert ─────────────────────────────────────────────── */}
      {backlogs.length > 0 && (
        <div className="no-print bg-red-50 border border-red-100 rounded-2xl px-6 py-4 flex items-start gap-4">
          <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={20} />
          <div>
            <p className="text-sm font-black text-red-600 uppercase tracking-tight">
              {backlogs.length} Pending Backlog{backlogs.length > 1 ? 's' : ''}
            </p>
            <ul className="mt-2 space-y-1">
              {backlogs.map(b => (
                <li key={b.backlog_id} className="text-xs font-bold text-red-400">
                  {b.subject_code} — {b.subject_name}
                  <span className="text-red-300 ml-2">
                    ({b.attempts_used}/{b.max_attempts} attempts used · {b.origin_year_level} Sem {b.origin_semester_term})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Grade Card Canvas ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-[#1a1b4b]/5 overflow-hidden lg:max-w-5xl mx-auto print-canvas">

        {/* Certificate Header */}
        <div className="p-10 border-b border-gray-100 text-center space-y-4">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">MIT ADT UNIVERSITY</h2>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#1a1b4b] uppercase">School of Computing</h3>
            <h4 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tight">Grade Card</h4>
            <p className="text-xs font-black text-[#ef4444] uppercase tracking-widest">
              B. Tech. (Computer Science and Engineering)
            </p>
          </div>
          {activeSemMeta && (
            <div className="inline-block px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100 italic text-[12px] font-bold text-gray-500">
              {activeSemMeta.label}
            </div>
          )}
        </div>

        {/* Student Info Grid */}
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 border-b border-gray-100 bg-gray-50/30">
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-gray-200 pb-1">
              <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Student Name</span>
              <span className="text-sm font-black text-[#1a1b4b] uppercase">{profile?.full_name || '—'}</span>
            </div>
            <div className="flex justify-between items-end border-b border-gray-200 pb-1">
              <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Department</span>
              <span className="text-sm font-black text-[#1a1b4b]">{semesterInfo?.department_name || '—'}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-gray-200 pb-1">
              <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Year Level</span>
              <span className="text-sm font-black text-[#1a1b4b] uppercase">{activeSemMeta?.year_level || '—'}</span>
            </div>
            <div className="flex justify-between items-end border-b border-gray-200 pb-1">
              <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Batch</span>
              <span className="text-sm font-black text-[#1a1b4b]">{semesterInfo?.batch_name || '—'}</span>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="p-0 overflow-x-auto">
          {activeSemResults.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <BookOpen size={40} className="mx-auto mb-3" />
              <p className="text-xs font-black uppercase tracking-widest">No results published for this semester yet.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#1a1b4b]/5">
                  <th className="px-6 py-4 text-left text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">Code</th>
                  <th className="px-6 py-4 text-left text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">Subject</th>
                  <th className="px-2 py-4 text-center text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">CR</th>
                  <th className="px-2 py-4 text-center text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">INT</th>
                  <th className="px-2 py-4 text-center text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">EXT</th>
                  <th className="px-2 py-4 text-center text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">Total</th>
                  <th className="px-2 py-4 text-center text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">GR</th>
                  <th className="px-4 py-4 text-center text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">Result</th>
                  <th className="px-3 py-4 text-center text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">Attempt</th>
                </tr>
              </thead>
              <tbody>
                {activeSemResults.map((row) => (
                  <tr
                    key={row.result_id}
                    className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${!row.is_pass && row.is_pass !== null ? 'bg-red-50/30' : ''}`}
                  >
                    <td className="px-6 py-3 text-[13px] font-black text-gray-400 tracking-tight">{row.subject_code}</td>
                    <td className="px-6 py-3 text-[13px] font-bold text-[#1a1b4b] max-w-[220px] truncate sm:max-w-none">
                      {row.subject_name}
                    </td>
                    <td className="px-2 py-3 text-[13px] font-black text-[#1a1b4b] text-center">{row.subject_credits ?? '—'}</td>
                    <td className="px-2 py-3 text-[13px] font-black text-gray-500 text-center">
                      {row.internal_marks != null ? row.internal_marks : '—'}
                    </td>
                    <td className="px-2 py-3 text-[13px] font-black text-gray-500 text-center">
                      {row.external_marks != null ? row.external_marks : '—'}
                    </td>
                    <td className="px-2 py-3 text-[13px] font-black text-[#1a1b4b] text-center">
                      {row.total_marks != null ? row.total_marks : '—'}
                    </td>
                    <td className={`px-2 py-3 text-[13px] font-black text-center ${gradeColor(row.grade)}`}>
                      {row.grade ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.result_status !== null ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-[12px] font-black uppercase tracking-widest border ${row.result_status === 'PASS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                          {row.result_status}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-[12px] font-black">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.attempt_number > 1 ? (
                        <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[11px] font-black uppercase">
                          ATKT #{row.attempt_number - 1}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-[11px] font-black">Regular</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50/80 font-black text-[#1a1b4b] text-xs">
                  <td colSpan={2} className="px-6 py-4 uppercase tracking-widest">Semester Summary</td>
                  <td className="px-2 py-4 text-center font-bold underline">{totalCredits || '—'}</td>
                  <td colSpan={4} className="px-2 py-4 text-right pr-6 text-[#ef4444] uppercase tracking-widest">SGPA:</td>
                  <td colSpan={2} className="px-4 py-4 text-center text-xl text-[#1a1b4b]">
                    {activeSGPA ?? '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Cumulative Record */}
        <div className="p-10 bg-white flex flex-col md:flex-row gap-10">
          <div className="flex-1 space-y-6">
            <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1 h-3 bg-[#ef4444] rounded-full" /> Cumulative Record
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
                <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Subjects</p>
                <p className="text-xl font-black text-[#1a1b4b]">
                  {passCount}<span className="text-gray-300 font-bold text-sm"> / {passCount + failCount}</span>
                </p>
                <p className="text-[10px] text-gray-300 font-bold uppercase">Passed / Appeared</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
                <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Sem Credits</p>
                <p className="text-xl font-black text-[#1a1b4b]">{totalCredits || '—'}</p>
                <p className="text-[10px] text-gray-300 font-bold uppercase">This Semester</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
                <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">CGPA</p>
                <p className="text-xl font-black text-[#ef4444]">{cgpa ?? '—'}</p>
                <p className="text-[10px] text-gray-300 font-bold uppercase">Cumulative</p>
              </div>
            </div>
            <div className={`p-5 rounded-2xl flex items-center justify-between shadow-lg ${failCount > 0 ? 'bg-red-500' : 'bg-[#1a1b4b]'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${failCount > 0 ? 'bg-white/20' : 'bg-emerald-500'}`}>
                  {failCount > 0
                    ? <AlertTriangle className="text-white" size={18} />
                    : <CheckCircle2 className="text-white" size={18} />
                  }
                </div>
                <div>
                  <p className="text-[12px] font-black text-white/50 uppercase tracking-widest leading-none">Status</p>
                  <p className="text-sm font-black text-white mt-1 uppercase tracking-tight">{performanceStatus}</p>
                </div>
              </div>
              <ChevronRight className="text-white/20" />
            </div>
          </div>

          {/* Signature area */}
          <div className="w-full md:w-72 flex flex-col justify-end items-center gap-4 py-4 border-l border-dashed border-gray-100 pl-10 mt-auto">
            <div className="text-center space-y-6 w-full mt-auto">
              <div className="h-20 w-full border-b border-gray-200 italic text-gray-200 flex items-center justify-center text-[12px]">
                Digital Signature Verified
              </div>
              <div>
                <p className="text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest leading-tight">(Controller of Examinations)</p>
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">MIT ADT University</p>
              </div>
            </div>
          </div>
        </div>

        {/* Abbreviations */}
        <div className="px-10 py-8 bg-gray-50/50 flex flex-wrap gap-x-8 gap-y-2 text-[12px] font-black text-gray-400 uppercase tracking-wider">
          {[
            ['INT', 'Internal Marks'],
            ['EXT', 'External Marks'],
            ['CR',  'Credits'],
            ['GR',  'Grade'],
            ['ATKT','Allowed To Keep Terms'],
          ].map(([abbr, full]) => (
            <div key={abbr} className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-gray-300" />
              {abbr}: {full}
            </div>
          ))}
        </div>
      </div>

      {/* ── Performance Insight ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#1a1b4b] to-[#2d3a8c] p-8 rounded-[2rem] text-white flex flex-col md:flex-row items-center gap-8 shadow-xl shadow-[#1a1b4b]/20 no-print">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
          <TrendingUp size={32} className="text-[#ef4444]" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-black uppercase tracking-tight">Performance Summary</h3>
          <p className="text-sm font-bold text-white/60 mt-1">
            {cgpa
              ? `Overall CGPA: ${cgpa} across ${semesters.length} semester${semesters.length !== 1 ? 's' : ''}.`
              : 'Results will appear here once published by your faculty.'}
            {backlogs.length > 0
              ? ` You have ${backlogs.length} active backlog${backlogs.length > 1 ? 's' : ''} to clear.`
              : activeSGPA ? ' Keep up the great performance!' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-black text-white/40 uppercase tracking-widest">CGPA</p>
          <p className="text-4xl font-black text-white">{cgpa ?? '—'}</p>
        </div>
      </div>
    </div>
  );
};

export default Results;
