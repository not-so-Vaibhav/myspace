
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import WelcomeBanner from '../../components/Dashboard/WelcomeBanner';
import ActivityGraph from '../../components/Dashboard/ActivityGraph';
import CourseCard from '../../components/Dashboard/CourseCard';
import { BookOpen, Code, Palette, Calculator, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
    const { profile } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .limit(4);

            if (error) throw error;
            setCourses(data);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async () => {
        // Simple dummy creation for demo purposes, normally would be a modal/page
        const title = prompt("Enter Path Name:");
        if (!title) return;

        try {
            const { error } = await supabase.from('courses').insert([
                {
                    title,
                    description: 'New course created from dashboard',
                    instructor_id: profile.id, // Ensure RLS policy allows this
                    thumbnail_url: 'https://source.unsplash.com/random/800x600/?coding'
                }
            ]);
            if (error) throw error;
            fetchCourses();
        } catch (error) {
            alert('Error creating course: ' + error.message);
        }
    };

    return (
        <div className="p-8 pb-32">
            <WelcomeBanner />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Popular Paths</h2>
                            <div className="flex gap-2">
                                {profile?.role === 'instructor' && (
                                    <button
                                        onClick={handleCreateCourse}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
                                    >
                                        <Plus size={16} /> Create Path
                                    </button>
                                )}
                                <button className="text-gray-400 hover:text-gray-600 text-sm font-medium">All Paths</button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-gray-400 text-center py-8">Loading popular paths...</div>
                        ) : courses.length === 0 ? (
                            <div className="text-gray-400 text-center py-8 bg-white rounded-3xl border border-dashed border-gray-200">
                                No paths found. {profile?.role === 'instructor' ? 'Create one!' : ''}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {courses.map((course, index) => (
                                    <CourseCard
                                        key={course.id}
                                        title={course.title}
                                        coursesCount="12+ Modules"
                                        icon={<BookOpen size={24} />}
                                        color={index % 2 === 0 ? "bg-blue-400" : "bg-purple-400"}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 mb-6">Top 5 School Performance</h2>
                        <div className="bg-white rounded-3xl p-6 h-48 flex items-center justify-center border border-gray-100 text-gray-400">
                            Performance Table Placeholder
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <section>
                        <ActivityGraph />
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
