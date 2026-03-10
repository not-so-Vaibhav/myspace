import { BookOpen, Clock, Award, FileText, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import WelcomeBanner from '../components/Dashboard/WelcomeBanner';
import StatsCards from '../components/Dashboard/StatsCards';
import ActivityGraph from '../components/Dashboard/ActivityGraph';
import CourseCard from '../components/Dashboard/CourseCard';
import { useAuth } from '../context/AuthContext';
import { useEnrolledCourses, useProgressData, usePopularCourses } from '../hooks/useDashboardData';

const colorKeys = ['yellow', 'pink', 'green', 'blue'];

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const { courses: enrolledCourses, loading: enrolledLoading } = useEnrolledCourses(user?.id);
  const { data: progressData, loading: progressLoading } = useProgressData(user?.id);
  const { courses: popularCourses, loading: popularLoading } = usePopularCourses(4);

  const statsItems = [
    { label: 'Enrolled Courses', value: enrolledLoading ? '—' : enrolledCourses.length, icon: BookOpen, iconBg: 'bg-blue-100 text-blue-600' },
    { label: 'Hours Learned', value: '12.5', icon: Clock, iconBg: 'bg-purple-100 text-purple-600' },
    { label: 'Certificates', value: '1', icon: Award, iconBg: 'bg-amber-100 text-amber-600' },
  ];

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <WelcomeBanner role="Student" userName={profile?.full_name} />

      <section>
        <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCards items={statsItems} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[var(--color-text)]">Popular Courses</h2>
              <Link to="/courses" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                See All Courses
              </Link>
            </div>
            {popularLoading ? (
              <div className="text-sm text-[var(--color-text-muted)] py-6">Loading courses...</div>
            ) : popularCourses.length === 0 ? (
              <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border-light)] p-8 text-center text-[var(--color-text-muted)]">
                No courses yet. Browse courses to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {popularCourses.map((course, i) => (
                  <CourseCard
                    key={course.id}
                    id={course.id}
                    title={course.title}
                    coursesCount="30+ Courses"
                    colorKey={colorKeys[i % colorKeys.length]}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">Notes & Resources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to="/notes"
                className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] card-hover flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-text)]">My Notes</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">Create and manage your notes</p>
                </div>
              </Link>
              <Link
                to="/resources"
                className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] card-hover flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                  <FolderOpen size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-text)]">Resources</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">Course materials and PDFs</p>
                </div>
              </Link>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">Current Activity</h2>
            <ActivityGraph data={progressData.length ? progressData : undefined} />
          </section>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
