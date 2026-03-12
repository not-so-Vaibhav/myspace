import { useAuth } from '../context/AuthContext';
import QuickAccess from '../components/Dashboard/QuickAccess';
import AttendanceChart from '../components/Dashboard/AttendanceChart';
import AntiRagging from '../components/Dashboard/AntiRagging';

const StudentDashboard = () => {
  const { profile } = useAuth();

  return (
    <div className="p-8 sm:p-12 space-y-10">
      <div className="mb-4">
        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">Dashboard</h1>
        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">Overview & Statistics</p>
      </div>

      <QuickAccess />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <AttendanceChart />
        <div className="flex flex-col gap-8 h-full">
          <div className="flex-1"></div> {/* Empty space */}
          <AntiRagging />
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
