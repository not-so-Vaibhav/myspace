import { useAuth } from '../context/AuthContext';
import { CreditCard, FileText, CheckCircle, Search } from 'lucide-react';

const StaffDashboard = () => {
    const { profile } = useAuth();

    return (
        <div className="p-8 sm:p-12 space-y-10">
            <div className="mb-4 items-center justify-between flex">
                <div>
                    <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter">
                        Staff Dashboard
                    </h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">
                        Finance & Administration
                    </p>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search Student/ID..."
                        className="pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ef4444] text-sm w-64"
                    />
                    <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Today's Collection", value: '$12,450', icon: CreditCard, color: 'text-green-500' },
                    { label: 'Pending Dues', value: '45', icon: FileText, color: 'text-red-500' },
                    { label: 'New Admissions', value: '12', icon: CheckCircle, color: 'text-blue-500' },
                    { label: 'Forms Pending', value: '28', icon: FileText, color: 'text-amber-500' },
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

            <div className="bg-white rounded-3xl p-8 border border-[var(--color-border-light)] shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tight">Recent Transactions</h2>
                    <button className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">Download Report</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-100">
                                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Transaction ID</th>
                                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student Name</th>
                                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { id: 'TXN-9842', name: 'John Doe', type: 'Tuition Fee', amount: '$4,500', status: 'Success' },
                                { id: 'TXN-9843', name: 'Alice Smith', type: 'Library Fine', amount: '$15', status: 'Pending' },
                                { id: 'TXN-9844', name: 'Bob Johnson', type: 'Hostel Fee', amount: '$1,200', status: 'Success' },
                            ].map((txn, i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="py-4 font-mono text-sm text-gray-600">{txn.id}</td>
                                    <td className="py-4 font-bold text-[#1a1b4b]">{txn.name}</td>
                                    <td className="py-4 text-sm text-gray-600">{txn.type}</td>
                                    <td className="py-4 font-bold text-gray-800">{txn.amount}</td>
                                    <td className="py-4">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-widest ${txn.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {txn.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
