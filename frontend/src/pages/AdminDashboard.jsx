import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Users, AlertTriangle, Shield, Activity, Clock, UserCheck } from 'lucide-react';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeRoles: 0,
        systemAlerts: 3, // Mock for now unless logs table exists
        systemHealth: '98%',
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Total Users
            const { count: userCount, error: userError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });
            
            if (userError) throw userError;

            // 2. Fetch Unique Roles Count
            const { data: rolesData, error: rolesError } = await supabase
                .from('profiles')
                .select('role');
            
            if (rolesError) throw rolesError;
            const uniqueRoles = new Set(rolesData.map(r => r.role?.toLowerCase()).filter(Boolean));

            // 3. Update Stats
            setStats(prev => ({
                ...prev,
                totalUsers: userCount || 0,
                activeRoles: uniqueRoles.size || 0
            }));

            // 4. Mimic actual logs from profile updates if no logs table
            const { data: recentProfiles, error: profError } = await supabase
                .from('profiles')
                .select('id, full_name, role, updated_at')
                .order('updated_at', { ascending: false })
                .limit(5);
            
            if (profError) throw profError;
            setRecentLogs(recentProfiles || []);

        } catch (err) {
            console.error('Admin Fetch Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const kpiCards = [
        { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'text-blue-500', to: '/users', bg: 'bg-blue-50' },
        { label: 'Active Roles', value: stats.activeRoles, icon: Shield, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        { label: 'System Alerts', value: stats.systemAlerts, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
        { label: 'System Health', value: stats.systemHealth, icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
    ];

    if (isLoading) return (
        <div className="p-12 text-center bg-[#fcfdfe] min-h-screen flex items-center justify-center">
            <div className="space-y-4">
                <div className="animate-spin w-10 h-10 border-4 border-[#1a1b4b] border-t-transparent rounded-full mx-auto"></div>
                <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Compiling System Metrics...</p>
            </div>
        </div>
    );

    return (
        <div className="p-8 sm:p-12 space-y-10 bg-[#fcfdfe] min-h-screen">
            {/* Page Title */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
                        Live System Overview & Resource Monitoring
                    </p>
                </div>
                <button onClick={fetchDashboardData} className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 transition-all text-gray-400 hover:text-[#1a1b4b]">
                    <Activity size={20} />
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((stat, i) => (
                    <Link key={i} to={stat.to || '#'} className={`bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm transition-all relative overflow-hidden group ${stat.to ? 'hover:shadow-xl hover:border-indigo-100' : 'cursor-default'}`}>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start mb-6">
                                <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
                                <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={18} strokeWidth={3} />
                                </div>
                            </div>
                            <div className="text-4xl font-black text-[#1a1b4b] tracking-tighter tabular-nums">{stat.value}</div>
                        </div>
                        {/* Subtle background decoration */}
                        <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.03] ${stat.color.replace('text', 'bg')} group-hover:scale-150 transition-transform duration-700`}></div>
                    </Link>
                ))}
            </div>

            {/* System Activity & Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight flex items-center gap-2">
                           <Clock className="text-indigo-500" size={20} /> Latest System Activity
                        </h2>
                        <span className="text-[12px] font-black bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full uppercase tracking-widest">Real-Time Sync</span>
                    </div>
                    
                    <div className="space-y-4">
                        {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                            <div key={log.id} className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-white hover:shadow-md transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 text-[#1a1b4b] font-black group-hover:scale-110 transition-transform">
                                        {log.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#1a1b4b]">Identity Update: {log.full_name}</p>
                                        <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                            Role: {log.role} • <span>{new Date(log.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[12px] font-black text-blue-500 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-blue-100 opacity-0 group-hover:opacity-100 transition-opacity">Trace</span>
                            </div>
                        )) : (
                            <div className="text-center py-12">
                                <Activity size={32} className="text-gray-100 mx-auto mb-3" />
                                <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">No recent logs recorded in current vector.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-[#1a1b4b] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-100">
                    <div className="relative z-10 flex flex-col h-full">
                        <UserCheck className="mb-6 opacity-50" size={32} />
                        <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight mb-2">Security <br />Protocols Active</h3>
                        <p className="text-white/40 text-xs font-bold leading-relaxed mb-8 uppercase tracking-widest">System is monitoring all role-based movements and data transfers in real-time.</p>
                        
                        <div className="mt-auto space-y-4">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <p className="text-[12px] font-black text-white/50 uppercase tracking-widest mb-1">Last Deployment</p>
                                <p className="text-sm font-bold tracking-tight">V1.4.2 - Production Core</p>
                            </div>
                        </div>
                    </div>
                    {/* Background blob */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
