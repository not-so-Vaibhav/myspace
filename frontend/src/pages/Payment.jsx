import { CreditCard, History, CheckCircle, IndianRupee, Clock, Wallet, Printer } from 'lucide-react';

const Payment = () => {
    const transactions = [
        { receipt: 'FR25-26/125SOC/51972', due: 78750, arrear: 0, lateFee: 0, amount: 78750, currency: 'INR', date: '25th Dec, 25', type: 'Payment', instrument: 'Online' },
        { receipt: 'FR25-26/125SOC/51735', due: 157500, arrear: 0, lateFee: 0, amount: 78750, currency: 'INR', date: '24th Dec, 25', type: 'Payment', instrument: 'Online' },
        { receipt: 'FR25-26/125SOC/49767', due: 20, arrear: 0, lateFee: 0, amount: 20, currency: 'INR', date: '3rd Dec, 25', type: 'Payment', instrument: 'Online' },
        { receipt: 'FR25-26/125SOC/49650', due: 16, arrear: 0, lateFee: 0, amount: 16, currency: 'INR', date: '1st Dec, 25', type: 'Payment', instrument: 'Online' },
        { receipt: 'FR25-26/125SOC/43331', due: 0, arrear: 0, lateFee: 450, amount: 450, currency: 'INR', date: '28th Jul, 25', type: 'Payment', instrument: 'Online' },
    ];

    const semesterBreakdown = [
        { sem: 'I', scheduled: 147000, paid: 147000, scholarship: 0, due: 0 },
        { sem: 'II', scheduled: 140000, paid: 140000, scholarship: 0, due: 0 },
        { sem: 'III', scheduled: 157520, paid: 157986, scholarship: 0, due: 0 },
        { sem: 'IV', scheduled: 157500, paid: 157500, scholarship: 0, due: 0 },
    ];

    const formatInr = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="p-6 sm:p-8 space-y-8">
            <header>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">Payment & Fees</h1>
                        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">Applicant Fee Details · Currency: INR</p>
                    </div>
                </div>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-6 -top-6 text-indigo-50 group-hover:scale-110 transition-transform">
                        <Wallet size={120} strokeWidth={1} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Current Session Schedule</p>
                        <h3 className="text-4xl font-black text-[#1a1b4b] flex items-baseline gap-1">
                            <span className="text-xl">₹</span> 157,500
                        </h3>
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                           <Clock size={12} /> Pending Review
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-6 -top-6 text-emerald-50 group-hover:scale-110 transition-transform">
                        <CreditCard size={120} strokeWidth={1} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Current Session Paid</p>
                        <h3 className="text-4xl font-black text-emerald-600 flex items-baseline gap-1">
                            <span className="text-xl">₹</span> 157,500
                        </h3>
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                           <CheckCircle size={12} /> Fully Settled
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-6 -top-6 text-rose-50 group-hover:scale-110 transition-transform">
                        <Clock size={120} strokeWidth={1} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Amount Due</p>
                        <h3 className="text-4xl font-black text-rose-500 flex items-baseline gap-1">
                            <span className="text-xl">₹</span> 0
                        </h3>
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                           <Wallet size={12} /> No Outstanding
                        </div>
                    </div>
                </div>
            </div>

            {/* Semester Breakdown */}
            <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {semesterBreakdown.map((sem, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 transition-colors">
                            <div className="text-center pb-4 border-b border-gray-100 mb-4">
                                <h4 className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest bg-gray-50 py-1.5 rounded-lg">SEMESTER {sem.sem}</h4>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400 font-bold uppercase tracking-wider">Scheduled</span>
                                    <span className="font-bold text-[#1a1b4b]">{formatInr(sem.scheduled)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400 font-bold uppercase tracking-wider">Amount Paid</span>
                                    <span className="font-bold text-emerald-600">{formatInr(sem.paid)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400 font-bold uppercase tracking-wider">Scholarship</span>
                                    <span className="font-bold text-indigo-600">{formatInr(sem.scholarship)}</span>
                                </div>
                                <div className="pt-3 flex justify-between items-center text-xs border-t border-gray-50">
                                    <span className="text-red-500 font-black uppercase tracking-widest">Amount Due</span>
                                    <span className="font-black text-lg text-[#1a1b4b] bg-gray-50 px-3 py-1 rounded-md">{formatInr(sem.due)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Transaction History */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight">Previous 5 Transactions</h2>
                    <button className="text-[12px] text-gray-500 font-black uppercase tracking-widest hover:text-[#1a1b4b] flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
                        <History size={14} /> View All
                    </button>
                </div>
                
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left min-w-[800px]">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Receipt Number</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Due Amount</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Arrear</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Late Fee</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Amount Paid</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Date</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Type</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.map((txn, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0">
                                    <td className="p-6 text-xs font-black text-[#1a1b4b] whitespace-nowrap">{txn.receipt}</td>
                                    <td className="p-6 text-xs font-bold text-gray-500 text-right">{formatInr(txn.due)}</td>
                                    <td className="p-6 text-xs font-bold text-gray-500 text-right">{formatInr(txn.arrear)}</td>
                                    <td className="p-6 text-xs font-bold text-rose-500 text-right">{formatInr(txn.lateFee)}</td>
                                    <td className="p-6 text-xs font-black text-emerald-600 text-right">{formatInr(txn.amount)}</td>
                                    <td className="p-6 text-xs font-bold text-gray-400 text-center whitespace-nowrap">{txn.date}</td>
                                    <td className="p-6 text-center">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600">
                                            {txn.type}
                                        </span>
                                    </td>
                                    <td className="p-6 text-center">
                                        <button className="p-2.5 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                            <Printer size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default Payment;
