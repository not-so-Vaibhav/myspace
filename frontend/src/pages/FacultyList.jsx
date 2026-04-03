import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Mail, Phone } from 'lucide-react';

const facultyData = [
    { id: 1, name: 'Dr. Alan Turing', designation: 'Professor', department: 'Computer Science', email: 'turing@uni.edu', phone: '+91 98765 43210', status: 'active', subjects: ['AI', 'Algorithms'] },
    { id: 2, name: 'Dr. Grace Hopper', designation: 'Professor', department: 'Computer Science', email: 'hopper@uni.edu', phone: '+91 98765 43211', status: 'active', subjects: ['Compilers', 'OS'] },
    { id: 3, name: 'Dr. Ada Lovelace', designation: 'Associate Professor', department: 'Computer Science', email: 'lovelace@uni.edu', phone: '+91 98765 43212', status: 'active', subjects: ['Mathematics', 'Data Structures'] },
    { id: 4, name: 'Dr. Jane Smith', designation: 'Assistant Professor', department: 'Computer Science', email: 'smith@uni.edu', phone: '+91 98765 43213', status: 'on-leave', subjects: ['Networks', 'Security'] },
    { id: 5, name: 'Prof. Mark Lee', designation: 'Professor', department: 'Computer Science', email: 'lee@uni.edu', phone: '+91 98765 43214', status: 'on-leave', subjects: ['DBMS', 'Cloud Computing'] },
    { id: 6, name: 'Dr. Priya Patel', designation: 'Associate Professor', department: 'Computer Science', email: 'patel@uni.edu', phone: '+91 98765 43215', status: 'active', subjects: ['Machine Learning', 'Statistics'] },
    { id: 7, name: 'Prof. Amit Sharma', designation: 'Professor', department: 'Computer Science', email: 'sharma@uni.edu', phone: '+91 98765 43216', status: 'active', subjects: ['Software Engineering', 'Design Patterns'] },
    { id: 8, name: 'Dr. Kavita Nair', designation: 'Assistant Professor', department: 'Computer Science', email: 'nair@uni.edu', phone: '+91 98765 43217', status: 'active', subjects: ['Web Dev', 'Mobile Dev'] },
    { id: 9, name: 'Prof. Rahul Verma', designation: 'Professor', department: 'Computer Science', email: 'verma@uni.edu', phone: '+91 98765 43218', status: 'on-leave', subjects: ['Embedded Systems', 'IoT'] },
    { id: 10, name: 'Dr. Neha Gupta', designation: 'Associate Professor', department: 'Computer Science', email: 'gupta@uni.edu', phone: '+91 98765 43219', status: 'active', subjects: ['Cyber Security', 'Cryptography'] },
];

const statusConfig = {
    'active': { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-400', label: 'Active' },
    'on-leave': { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400', label: 'On Leave' },
};

const FacultyList = () => {
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const filtered = facultyData.filter(f => {
        const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
            f.subjects.some(s => s.toLowerCase().includes(search.toLowerCase()));
        const matchStatus = filterStatus === 'all' || f.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const activeCount = facultyData.filter(f => f.status === 'active').length;
    const onLeaveCount = facultyData.filter(f => f.status === 'on-leave').length;

    return (
        <div className="p-8 sm:p-12 space-y-8">
            {/* Header */}
            <div>
                <Link to="/hod-dashboard" className="inline-flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1a1b4b] transition-colors mb-4">
                    <ArrowLeft size={13} strokeWidth={3} /> Back to Dashboard
                </Link>
                <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">Faculty List</h1>
                <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
                    {activeCount} active • {onLeaveCount} on leave • {facultyData.length} total
                </p>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or subject..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-[#1a1b4b] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a1b4b]/20 focus:border-[#1a1b4b]/40 transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'active', 'on-leave'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterStatus(f)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                filterStatus === f
                                    ? 'bg-[#1a1b4b] text-white'
                                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {f === 'on-leave' ? 'On Leave' : f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Faculty Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-gray-100">
                        <Search size={32} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-gray-400">No faculty found</p>
                    </div>
                ) : (
                    filtered.map(f => {
                        const s = statusConfig[f.status];
                        return (
                            <div key={f.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-[#1a1b4b]/8 flex items-center justify-center font-black text-lg text-[#1a1b4b]">
                                            {f.name.charAt(f.name.indexOf('.') + 2) || f.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#1a1b4b] group-hover:text-[#2a2b6b] transition-colors">{f.name}</p>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{f.designation}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${s.bg} ${s.text}`}>
                                        <span className={`w-1.5 h-1.5 rounded-sm ${s.dot}`} />
                                        {s.label}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {f.subjects.map(sub => (
                                        <span key={sub} className="px-2.5 py-1 bg-[#f4f6fa] text-[10px] font-bold text-[#1a1b4b] rounded-lg">
                                            {sub}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                    <a href={`mailto:${f.email}`} className="inline-flex items-center gap-1.5 hover:text-[#1a1b4b] transition-colors">
                                        <Mail size={13} /> {f.email}
                                    </a>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default FacultyList;
