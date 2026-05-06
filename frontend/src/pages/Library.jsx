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
  Info,
  X,
  CreditCard,
  CheckCircle2
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
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const stats = [
        { label: 'Currently Borrowed', value: '0 / 28', icon: BookMarked, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Reserved Items', value: '0 / 2', icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Library Fine', value: '₹150', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', showPay: true },
        { label: 'Suggestions', value: '0', icon: MessageSquare, color: 'text-slate-600', bg: 'bg-slate-50' }
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
                        <p className="text-[12px] font-bold text-amber-700 uppercase tracking-widest">
                            Click on Catalog title to get details like rack, shelf & other placement info
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} opacity-20 rounded-bl-[4rem] group-hover:scale-110 transition-transform`} />
                        <div className="flex items-start justify-between relative z-10">
                            <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                                <stat.icon size={24} className={stat.color} />
                            </div>
                            <button className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-[#1a1b4b] flex items-center gap-1 transition-colors">
                                View Details <ArrowRight size={10} />
                            </button>
                        </div>
                        <div className="mt-6 flex items-end justify-between relative z-10">
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <h3 className={`text-3xl font-black text-[#1a1b4b] ${stat.label === 'Library Fine' && 'text-rose-500'}`}>{stat.value}</h3>
                            </div>
                            {stat.showPay && (
                                <button 
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="px-5 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 active:scale-95 mb-1"
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
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight mb-8 flex items-center gap-3">
                            <Filter size={20} className="text-indigo-500" /> Catalog Search
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Library</label>
                                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-[#1a1b4b] focus:ring-2 focus:ring-[#1a1b4b] outline-none">
                                        <option>Select Library</option>
                                        <option>Main Library</option>
                                        <option>Digital Library</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Item Type</label>
                                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-[#1a1b4b] focus:ring-2 focus:ring-[#1a1b4b] outline-none">
                                        <option>All Types</option>
                                        <option>Book</option>
                                        <option>Journal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Subject Index</label>
                                    <div className="relative">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                        <input type="text" placeholder="Enter subject code..." className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1a1b4b] outline-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Title</label>
                                    <div className="relative">
                                        <Book className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                        <input type="text" placeholder="Search by title..." className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1a1b4b] outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Author</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                        <input type="text" placeholder="Search by author..." className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1a1b4b] outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Publisher</label>
                                    <input type="text" placeholder="Search by publisher..." className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1a1b4b] outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-50">
                            <button className="px-6 py-3 bg-gray-50 text-gray-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-colors">Clear Filters</button>
                            <button className="px-10 py-3 bg-[#1a1b4b] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#2d3a8c] transition-all flex items-center gap-2 shadow-lg shadow-indigo-100">
                                <Search size={14} /> Find Books
                            </button>
                        </div>
                    </div>
                </div>

                {/* Issued Holding Display */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight flex items-center gap-3">
                                <BookMarked size={20} className="text-indigo-500" /> Borrowed Items
                            </h2>
                            <span className="px-3 py-1 bg-gray-50 text-xs font-black text-gray-400 border border-gray-100 rounded-lg tracking-widest uppercase">
                                0 Books
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
                            <button className="text-[12px] font-black text-blue-500 uppercase tracking-widest hover:underline pt-2 leading-relaxed">
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
                    <h4 className="text-[13px] font-black text-indigo-900 uppercase tracking-widest">Digital Catalog Tip</h4>
                    <p className="text-[12px] text-indigo-700 font-bold mt-0.5 leading-relaxed">
                        Use the Author or Title filters for faster searching. You can also save books to your "reserved" list directly from the search results.
                    </p>
                </div>
            </div>

            {/* PAYMENT MODAL */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1a1b4b]/20 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl border border-white/50 relative overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Decorative background element */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-50 rounded-full opacity-50 blur-3xl pointer-events-none" />
                        
                        {!paymentSuccess ? (
                            <>
                                <div className="flex items-center justify-between mb-8 relative z-10">
                                    <div>
                                        <h2 className="text-2xl font-black text-[#1a1b4b] uppercase tracking-tighter">Settle Fine</h2>
                                        <p className="text-xs font-black text-rose-500 uppercase tracking-widest mt-1">Institutional Billing</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsPaymentModalOpen(false)}
                                        className="p-3 hover:bg-gray-100 rounded-2xl transition-all"
                                    >
                                        <X size={20} className="text-gray-400" />
                                    </button>
                                </div>

                                <div className="space-y-6 relative z-10">
                                    <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Invoice Details</p>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Fine Type</span>
                                                <span className="text-xs font-black text-[#1a1b4b] uppercase">Overdue Books (3)</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Date Accrued</span>
                                                <span className="text-xs font-black text-[#1a1b4b] uppercase">May 01, 2026</span>
                                            </div>
                                            <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-center">
                                                <span className="text-sm font-black text-[#1a1b4b] uppercase tracking-tight">Total Amount</span>
                                                <span className="text-2xl font-black text-rose-500 tracking-tighter">₹150.00</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
                                                <CreditCard size={18} className="text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-indigo-900 uppercase tracking-widest">Payment Method</p>
                                                <p className="text-xs font-black text-indigo-600 uppercase">Linked Student Account</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            onClick={() => setIsPaymentModalOpen(false)}
                                            className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setIsProcessing(true);
                                                setTimeout(() => {
                                                    setIsProcessing(false);
                                                    setPaymentSuccess(true);
                                                }, 2000);
                                            }}
                                            disabled={isProcessing}
                                            className="flex-[2] py-4 bg-[#1a1b4b] text-white rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isProcessing ? 'Processing...' : 'Authorize Payment'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 font-bold text-center uppercase tracking-widest mt-4">Safe & Encrypted Gateway</p>
                                </div>
                            </>
                        ) : (
                            <div className="py-10 text-center space-y-6">
                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 scale-110">
                                    <CheckCircle2 size={48} className="text-green-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-[#1a1b4b] uppercase tracking-tighter">Payment Success!</h2>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2 leading-relaxed">
                                        Your library fine has been cleared. <br />You can now issue new items.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setIsPaymentModalOpen(false);
                                        setPaymentSuccess(false);
                                    }}
                                    className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl shadow-green-100 hover:bg-green-600 transition-all"
                                >
                                    Return to Library
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Library;
