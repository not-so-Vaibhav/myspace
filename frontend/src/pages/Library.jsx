import { useState } from 'react';
import { 
  Library as LibIcon, 
  Search, 
  BookMarked, 
  Clock, 
  AlertCircle, 
  MessageSquare,
  Book,
  User,
  Hash,
  Filter,
  ArrowRight,
  Info
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

const Library = () => {
    const navigate = useNavigate();
    const [searchForm, setSearchForm] = useState({
        library: '',
        itemType: '',
        subjectIndex: '',
        title: '',
        author: '',
        editor: '',
        subTitle: '',
        publisher: ''
    });

    const stats = [
        { label: 'Issued Items', value: '0 / 28', icon: BookMarked, color: 'bg-blue-500' },
        { label: 'Reserved Items', value: '0 / 2', icon: Clock, color: 'bg-emerald-500' },
        { label: 'Library Fine', value: '₹150', icon: AlertCircle, color: 'bg-red-500', showPay: true },
        { label: 'Suggestions', value: '0', icon: MessageSquare, color: 'bg-purple-500' }
    ];

    return (
        <div className="p-8 sm:p-12 space-y-10 bg-[#fcfdfe] min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <LibIcon className="text-[#ef4444]" /> Library Student 360
                    </h1>
                    <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-100 rounded-lg w-fit">
                        <Info size={12} className="text-amber-500" />
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                            Click on Catalog title to get details like rack, shelf & other placement info
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.color} opacity-[0.03] rounded-bl-[4rem] group-hover:scale-110 transition-transform`} />
                        <div className="flex items-start justify-between">
                            <div className={`w-12 h-12 rounded-2xl ${stat.color} bg-opacity-10 flex items-center justify-center`}>
                                <stat.icon size={22} className={stat.color.replace('bg-', 'text-')} />
                            </div>
                            <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-[#1a1b4b] flex items-center gap-1 transition-colors">
                                View Details <ArrowRight size={10} />
                            </button>
                        </div>
                        <div className="mt-4 flex items-end justify-between">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <h3 className={`text-2xl font-black text-[#1a1b4b] ${stat.label === 'Library Fine' && 'text-red-500'}`}>{stat.value}</h3>
                            </div>
                            {stat.showPay && (
                                <button 
                                    onClick={() => navigate('/payment')}
                                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95 mb-1"
                                >
                                    Pay Now
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Catalog Search Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight mb-8 flex items-center gap-3">
                            <Filter size={20} className="text-[#ef4444]" /> Catalog Search
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Library</label>
                                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-[#1a1b4b] focus:ring-2 focus:ring-[#1a1b4b] outline-none">
                                        <option>Select Library</option>
                                        <option>Main Library</option>
                                        <option>Digital Library</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Item Type</label>
                                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-[#1a1b4b] focus:ring-2 focus:ring-[#1a1b4b] outline-none">
                                        <option>All Types</option>
                                        <option>Book</option>
                                        <option>Journal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Subject Index</label>
                                    <div className="relative">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                        <input type="text" placeholder="Enter subject code..." className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1a1b4b] outline-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Title</label>
                                    <div className="relative">
                                        <Book className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                        <input type="text" placeholder="Search by title..." className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1a1b4b] outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Author</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                        <input type="text" placeholder="Search by author..." className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1a1b4b] outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Publisher</label>
                                    <input type="text" placeholder="Search by publisher..." className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1a1b4b] outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button className="px-6 py-3 bg-gray-100 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors">Clear All</button>
                            <button className="px-10 py-3 bg-[#1a1b4b] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#2d3a8c] transition-all flex items-center gap-2 shadow-lg shadow-[#1a1b4b]/20">
                                <Search size={14} /> Search Catalog
                            </button>
                        </div>
                    </div>
                </div>

                {/* Issued Holding Display */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight flex items-center gap-3">
                                <BookMarked size={20} className="text-[#ef4444]" /> Issued Holding
                            </h2>
                            <span className="px-3 py-1 bg-gray-50 text-[9px] font-black text-gray-400 border border-gray-100 rounded-lg">
                                0 ITEMS FOUND
                            </span>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center">
                                <Search className="text-gray-200" size={32} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest">No Records Found</h3>
                                <p className="text-xs text-gray-400 font-bold mt-1">You haven't issued any books yet or the list is empty.</p>
                            </div>
                            <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline pt-2 leading-relaxed">
                                View Your History
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hint Box (from the top bar in original image) */}
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4 max-w-2xl">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                    <Info className="text-white" size={20} />
                </div>
                <div>
                    <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Digital Catalog Tip</h4>
                    <p className="text-[10px] text-indigo-700 font-bold mt-0.5 leading-relaxed">
                        Use the Author or Title filters for faster searching. You can also save books to your "reserved" list directly from the search results.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Library;
