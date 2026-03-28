import { useAuth } from '../context/AuthContext';
import { TrendingUp, Users, DollarSign, BookOpen } from 'lucide-react';

const DeanDashboard = () => {
    const { profile } = useAuth();

    return (
        <div className="p-8 sm:p-12 space-y-10">
            <div className="mb-4">
                <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
                    Dean Dashboard
                </h1>
                <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
                    University Overview
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Students', value: '15,420', icon: Users, color: 'text-indigo-500' },
                    { label: 'Total Faculty', value: '840', icon: BookOpen, color: 'text-blue-500' },
                    { label: 'YTD Revenue', value: '$2.4M', icon: DollarSign, color: 'text-green-500' },
                    { label: 'Overall Growth', value: '+12%', icon: TrendingUp, color: 'text-emerald-500' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-[var(--color-border-light)] hover:shadow-lg transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest group-hover:text-[#1a1b4b] transition-colors">{stat.label}</span>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <div className="text-3xl font-black text-[#1a1b4b]">{stat.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl p-8 border border-[var(--color-border-light)] shadow-sm">
                    <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight mb-6">Enrollment Trends</h2>
                    <div className="h-48 flex items-end justify-between gap-2 border-b border-gray-100 pb-4">
                        {[40, 60, 45, 80, 55, 90].map((h, i) => (
                            <div key={i} className="w-12 bg-[#ef4444]/20 rounded-t-lg relative group">
                                <div className="absolute bottom-0 w-full bg-[#ef4444] rounded-t-lg transition-all duration-500" style={{ height: `${h}%` }}></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-[var(--color-border-light)] shadow-sm">
                    <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight mb-6">Department Performance</h2>
                    <div className="space-y-4">
                        {['Computer Science', 'Mechanical Eng', 'Business Admin'].map((dept, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                                <span className="font-bold text-[#1a1b4b]">{dept}</span>
                                <span className="text-sm font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full uppercase">Excellent</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeanDashboard;
