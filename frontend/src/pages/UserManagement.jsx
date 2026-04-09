import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, UserCheck, Shield, Users, Mail, Phone, MoreVertical, Filter, ChevronDown, Trash2, Edit2, Plus, X, AlertCircle } from 'lucide-react';

const roleConfig = {
    'student': { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-400', label: 'Student' },
    'faculty': { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-400', label: 'Faculty' },
    'hod': { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400', label: 'HOD' },
    'dean': { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-400', label: 'Dean' },
    'admin': { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400', label: 'Admin' },
};

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'student', 'faculty', 'admins'
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Edit Modal State
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ full_name: '', role: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true });

            if (fetchError) throw fetchError;
            setUsers(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId, fullName) => {
        if (!window.confirm(`Are you sure you want to permanently delete user "${fullName}"? This action cannot be undone.`)) return;

        try {
            // 1. Delete from profiles table
            const { error: delError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (delError) throw delError;

            // 2. Update local state
            setUsers(prev => prev.filter(u => u.id !== userId));
            setSuccess('User record purged successfully.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to delete user: ' + err.message);
            setTimeout(() => setError(''), 5000);
        }
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setEditForm({ full_name: user.full_name, role: user.role });
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        if (!editingUser) return;
        
        setIsSubmitting(true);
        try {
            const { error: updateErr } = await supabase
                .from('profiles')
                .update({
                    full_name: editForm.full_name,
                    role: editForm.role
                })
                .eq('id', editingUser.id);

            if (updateErr) throw updateErr;

            // Update local state
            setUsers(prev => prev.map(u => 
                u.id === editingUser.id ? { ...u, full_name: editForm.full_name, role: editForm.role } : u
            ));
            
            setSuccess('User profile synced successfully.');
            setEditingUser(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to update: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.full_name?.toLowerCase().includes(search.toLowerCase()) || 
                             user.email?.toLowerCase().includes(search.toLowerCase());
        
        if (activeTab === 'all') return matchesSearch;
        if (activeTab === 'student') return matchesSearch && user.role === 'student';
        if (activeTab === 'faculty') return matchesSearch && (user.role === 'faculty' || user.role === 'hod');
        if (activeTab === 'admins') return matchesSearch && (user.role === 'admin' || user.role === 'dean');
        return matchesSearch;
    });

    const stats = {
        total: users.length,
        students: users.filter(u => u.role === 'student').length,
        faculty: users.filter(u => u.role === 'faculty' || u.role === 'hod').length,
        others: users.filter(u => !['student', 'faculty', 'hod'].includes(u.role)).length
    };

    if (loading) return (
        <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#1a1b4b] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Syncing Identity Records...</p>
        </div>
    );

    return (
        <div className="p-8 sm:p-12 space-y-8 max-w-[1400px] mx-auto">
            {/* Success/Error Alerts */}
            {success && (
                <div className="fixed top-24 right-8 z-[60] bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl shadow-xl animate-in slide-in-from-right duration-300">
                    <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">{success}</p>
                </div>
            )}
            {error && (
                <div className="fixed top-24 right-8 z-[60] bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-xl animate-in slide-in-from-right duration-300">
                    <p className="text-xs font-black text-red-700 uppercase tracking-widest">{error}</p>
                </div>
            )}

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                   <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl border border-gray-100 animate-in zoom-in-95">
                      <div className="flex items-center justify-between mb-8">
                         <h2 className="text-2xl font-black text-[#1a1b4b] uppercase tracking-tighter">Edit Identity</h2>
                         <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"><X size={24} /></button>
                      </div>

                      <form onSubmit={handleUpdateUser} className="space-y-6">
                         <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Display Name</label>
                            <input 
                              type="text" 
                              value={editForm.full_name}
                              onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                              className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100"
                              required
                            />
                         </div>
                         <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">System Role</label>
                            <select 
                              value={editForm.role}
                              onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                              className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100"
                              required
                            >
                               <option value="student">Student</option>
                               <option value="faculty">Faculty</option>
                               <option value="hod">HOD</option>
                               <option value="dean">Dean</option>
                               <option value="admin">Administrator</option>
                            </select>
                         </div>
                         <div className="pt-4 flex gap-4">
                            <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-4 bg-gray-100 rounded-2xl text-[10px] font-black uppercase text-gray-500 tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-[#1a1b4b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">Save Changes</button>
                         </div>
                      </form>
                   </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">User Management</h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
                        System Identity Oversight & Role Control
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white px-4 py-2 border border-gray-100 rounded-2xl shadow-sm min-w-[140px]">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {activeTab === 'all' ? 'Total Population' : 
                             activeTab === 'student' ? 'Student Count' :
                             activeTab === 'faculty' ? 'Staff Reach' : 'Admins'}
                        </p>
                        <p className="text-xl font-black text-[#1a1b4b]">{filteredUsers.length}</p>
                    </div>
                </div>
            </div>

            {/* Controls & Tabs */}
            <div className="bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center gap-4">
                <div className="flex p-1 bg-gray-50 rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar">
                    {[
                        { id: 'all', label: 'All Identities', icon: Users },
                        { id: 'student', label: 'Students', icon: GraduationCap },
                        { id: 'faculty', label: 'Faculty & HOD', icon: Shield },
                        { id: 'admins', label: 'System Admin', icon: UserCheck },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-white text-[#1a1b4b] shadow-md' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <tab.icon size={16} strokeWidth={activeTab === tab.id ? 3 : 2} />
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 w-full lg:pl-4">
                    <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                        type="text"
                        placeholder="Search by name, email or roll number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-[#1a1b4b] focus:ring-2 focus:ring-indigo-100 outline-none placeholder:text-gray-300"
                    />
                </div>
            </div>

            {/* User Grid/Table */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest pl-10">User Identity</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Role</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Intel</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center">
                                        <div className="max-w-xs mx-auto space-y-3">
                                            <Users className="w-12 h-12 text-gray-100 mx-auto" strokeWidth={1} />
                                            <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No matching user records found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => {
                                    const config = roleConfig[user.role?.toLowerCase()] || roleConfig.student;
                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50/30 transition-colors group">
                                            <td className="p-6 pl-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 flex items-center justify-center font-black text-indigo-400 shadow-inner group-hover:scale-110 transition-transform">
                                                        {user.full_name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-[#1a1b4b] tracking-tight">{user.full_name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">UID: {user.id.substring(0,8)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${config.bg} ${config.text} border border-transparent group-hover:border-current transition-all cursor-default`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${config.dot} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}></div>
                                                    {config.label}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                    <Mail size={12} className="text-gray-300" />
                                                    {user.email}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-emerald-100">
                                                   Active
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                      onClick={() => openEditModal(user)}
                                                      className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                      onClick={() => handleDeleteUser(user.id, user.full_name)}
                                                      className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const GraduationCap = ({ size, strokeWidth = 2, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
);

export default UserManagement;
