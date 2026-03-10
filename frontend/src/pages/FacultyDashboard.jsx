import { Users, BookOpen, BarChart3, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import WelcomeBanner from '../components/Dashboard/WelcomeBanner';
import StatsCards from '../components/Dashboard/StatsCards';
import ActivityGraph from '../components/Dashboard/ActivityGraph';
import InstructorCard from '../components/Dashboard/InstructorCard';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { usePopularCourses, useInstructors } from '../hooks/useDashboardData';
import { useState, useEffect } from 'react';

const FacultyDashboard = () => {
  const { profile } = useAuth();
  const [myCoursesCount, setMyCoursesCount] = useState(0);
  const { courses: popularCourses, loading: coursesLoading } = usePopularCourses(4);
  const { instructors, loading: instructorsLoading } = useInstructors(4);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { count, error } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('instructor_id', profile.id);
      if (!error) setMyCoursesCount(count ?? 0);
    })();
  }, [profile?.id]);

  const statsItems = [
    { label: 'Total Students', value: '128', icon: Users, iconBg: 'bg-indigo-100 text-indigo-600' },
    { label: 'Active Courses', value: String(myCoursesCount), icon: BookOpen, iconBg: 'bg-emerald-100 text-emerald-600' },
    { label: 'Avg. Engagement', value: '85%', icon: BarChart3, iconBg: 'bg-rose-100 text-rose-600' },
  ];

  const handleCreateCourse = async () => {
    const title = window.prompt('Enter course title:');
    if (!title) return;
    try {
      const { error } = await supabase.from('courses').insert({
        title,
        description: 'New course created from dashboard',
        instructor_id: profile?.id,
        thumbnail_url: null,
      });
      if (error) throw error;
      setMyCoursesCount((c) => c + 1);
      window.location.reload();
    } catch (e) {
      alert('Error creating course: ' + (e.message || e));
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <WelcomeBanner role="Faculty" userName={profile?.full_name} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">Have More knowledge to share?</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">Create and publish new courses for students.</p>
            <button
              type="button"
              onClick={handleCreateCourse}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-button)] bg-[var(--color-accent-blue)] text-white font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={18} /> Create New Course
            </button>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">Overview</h2>
            <StatsCards items={statsItems} />
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[var(--color-text)]">Popular Courses</h2>
              <Link to="/courses" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                See All Courses
              </Link>
            </div>
            {coursesLoading ? (
              <div className="text-sm text-[var(--color-text-muted)] py-6">Loading...</div>
            ) : popularCourses.length === 0 ? (
              <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border-light)] p-8 text-center text-[var(--color-text-muted)]">
                No courses yet. Create your first course above.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {popularCourses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] card-hover"
                  >
                    <h4 className="font-bold text-[var(--color-text)] truncate">{course.title}</h4>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">{course.description || 'No description'}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">Current Activity</h2>
            <ActivityGraph />
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[var(--color-text)]">Best Instructors</h2>
              <Link to="/instructors" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                See All
              </Link>
            </div>
            {instructorsLoading ? (
              <div className="text-sm text-[var(--color-text-muted)] py-6">Loading...</div>
            ) : instructors.length === 0 ? (
              <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border-light)] p-6 text-center text-[var(--color-text-muted)] text-sm">
                No instructors found.
              </div>
            ) : (
              <div className="space-y-4">
                {instructors.map((inst) => (
                  <InstructorCard
                    key={inst.id}
                    id={inst.id}
                    name={inst.full_name || 'Instructor'}
                    description="5 Design Course."
                    avatarUrl={inst.avatar_url}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
