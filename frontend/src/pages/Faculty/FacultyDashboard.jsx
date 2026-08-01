import InstructorQuickAccess from '../../components/Dashboard/InstructorQuickAccess';
import MeetingSection from '../../components/Dashboard/MeetingSection';
import FacultyTimetable from '../../components/Dashboard/FacultyTimetable';
import { useAuth } from '../../context/AuthContext';

const FacultyDashboard = () => {
  const { profile } = useAuth();

  return (
    <div className="p-8 sm:p-12 space-y-10">
      {/* Page Title */}
      <div className="mb-4">
        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
          Instructor Dashboard
        </h1>
        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
          Welcome back, {profile?.full_name || 'Professor'}
        </p>
      </div>

      {/* 6-Card Quick Access Grid */}
      <InstructorQuickAccess />

      {/* Upcoming Meetings */}
      <MeetingSection />

      {/* Faculty Timetable */}
      <FacultyTimetable />
    </div>
  );
};

export default FacultyDashboard;
