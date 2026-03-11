import { useAuth } from '../context/AuthContext';
import QuickAccess from '../components/Dashboard/QuickAccess';
import AttendanceChart from '../components/Dashboard/AttendanceChart';
import SocialMedia from '../components/Dashboard/SocialMedia';
import AntiRagging from '../components/Dashboard/AntiRagging';

const StudentDashboard = () => {
  const { profile } = useAuth();

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Dashboard</h1>
      </div>

      <QuickAccess />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <AttendanceChart />
        <div className="flex flex-col gap-8 h-full">
          <SocialMedia />
          <AntiRagging />
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
