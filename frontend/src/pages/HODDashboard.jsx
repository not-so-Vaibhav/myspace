import { useAuth } from '../context/AuthContext';
import { Users, FileUser, CheckCircle, Clock } from 'lucide-react';

const HODDashboard = () => {
    const { profile } = useAuth();

    return (
        <div className="p-8 sm:p-12 space-y-10">
            <div className="mb-4">
                <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
                    HOD Dashboard
                </h1>
                <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
                    Department Operations
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Active Faculty', value: '42', icon: FileUser, color: 'text-indigo-500' },
                    { label: 'Enrolled Students', value: '1,200', icon: Users, color: 'text-blue-500' },
                    { label: 'Pending Approvals', value: '8', icon: Clock, color: 'text-amber-500' },
                    { label: 'Avg Attendance', value: '92%', icon: CheckCircle, color: 'text-green-500' },
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl p-8 border border-[var(--color-border-light)] shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight">Leave Approvals</h2>
                        <button className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                        {[
                            { name: 'Dr. Jane Smith', type: 'Sick Leave', duration: '2 Days' },
                            { name: 'Prof. Mark Lee', type: 'Conference', duration: '1 Week' },
                        ].map((req, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div>
                                    <p className="font-bold text-[#1a1b4b]">{req.name}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">{req.type} • {req.duration}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-4 py-2 bg-[#ef4444] text-white text-xs font-bold rounded-lg uppercase tracking-wider hover:bg-red-600 transition-colors">Reject</button>
                                    <button className="px-4 py-2 bg-green-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider hover:bg-green-600 transition-colors">Approve</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-[var(--color-border-light)] shadow-sm">
                    <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight mb-6">Faculty Roster</h2>
                    <div className="space-y-3">
                        {['Dr. Alan Turing', 'Dr. Grace Hopper', 'Dr. Ada Lovelace'].map((name, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                    {name.charAt(4)}
                                </div>
                                <div>
                                    <p className="font-bold text-[#1a1b4b]">{name}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest">Professor</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HODDashboard;
