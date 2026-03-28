import { useAuth } from '../context/AuthContext';
import { Users, AlertTriangle, Shield, Activity } from 'lucide-react';

const AdminDashboard = () => {
    const { profile } = useAuth();

    return (
        <div className="p-8 sm:p-12 space-y-10">
            {/* Page Title */}
            <div className="mb-4">
                <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
                    Admin Dashboard
                </h1>
                <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
                    System Overview & Management
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Users', value: '14,250', icon: Users, color: 'text-blue-500' },
                    { label: 'Active Roles', value: '6', icon: Shield, color: 'text-indigo-500' },
                    { label: 'System Alerts', value: '3', icon: AlertTriangle, color: 'text-amber-500' },
                    { label: 'System Health', value: '98%', icon: Activity, color: 'text-green-500' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-[var(--color-border-light)] hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">{stat.label}</span>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <div className="text-3xl font-black text-[#1a1b4b]">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* System Activity & Logs */}
            <div className="bg-white rounded-3xl p-8 border border-[var(--color-border-light)] shadow-sm">
                <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight mb-6">System Logs</h2>
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl border-l-4 border-amber-500 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-700">High memory usage detected</p>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">10 minutes ago</p>
                        </div>
                        <span className="text-xs font-bold text-amber-600 bg-amber-100 px-3 py-1 rounded-full uppercase">Warning</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border-l-4 border-blue-500 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-700">User role updated: John Doe -&gt; HOD</p>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">2 hours ago</p>
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full uppercase">Info</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
