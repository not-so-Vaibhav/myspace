import { useAuth } from '../context/AuthContext';
import { CreditCard, Printer, Download, Calendar } from 'lucide-react';

const SalarySlip = () => {
    const { profile } = useAuth();
    const currentDate = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const salaryData = {
        earnings: [
            { id: 1, head: "Basic", amount: 40000 },
            { id: 2, head: "Dearness Allowance", amount: 4000 },
            { id: 3, head: "House Rent Allowance", amount: 20000 },
            { id: 4, head: "Conveyance Allowance", amount: 1600 },
            { id: 5, head: "Medical Allowance", amount: 4500 },
            { id: 6, head: "Special Allowance", amount: 28000 }
        ],
        deductions: [
            { id: 1, head: "Professional Tax", amount: 200 },
            { id: 2, head: "Tax Deducted at Source", amount: 10000 },
            { id: 3, head: "Employee Provident Fund", amount: 4800 }
        ]
    };

    const totalEarnings = salaryData.earnings.reduce((sum, item) => sum + item.amount, 0);
    const totalDeductions = salaryData.deductions.reduce((sum, item) => sum + item.amount, 0);
    const netSalary = totalEarnings - totalDeductions;

    return (
        <div className="p-8 sm:p-12 bg-[#fcfdfe] min-h-screen">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Actions */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                            <CreditCard className="text-[#ef4444]" /> Salary Slip
                        </h1>
                        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">Monthly Payroll Statement</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-[#1a1b4b] rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">
                            <Download size={14} /> Download PDF
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-[#1a1b4b] text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-[#2d3a8c] transition-all shadow-md">
                            <Printer size={14} /> Print
                        </button>
                    </div>
                </div>

                {/* Main Slip */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-[#1a1b4b]/5 overflow-hidden print:shadow-none print:border-black">
                    {/* Brand Header */}
                    <div className="bg-[#1a1b4b] p-8 text-center border-b border-white/10">
                        <h2 className="text-2xl font-black text-white tracking-widest uppercase">MIT ADT UNIVERSITY</h2>
                        <div className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
                            <Calendar size={12} className="text-[#ef4444]" />
                            <span className="text-[12px] font-black text-white uppercase tracking-widest">Salary slip for {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                        </div>
                    </div>

                    {/* Employee Info */}
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-gray-100">
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-gray-50 pb-2">
                                <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Name</span>
                                <span className="text-sm font-bold text-[#1a1b4b]">{profile?.full_name || 'Faculty Member'}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-50 pb-2">
                                <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Designation</span>
                                <span className="text-sm font-bold text-[#1a1b4b]">{profile?.role?.toUpperCase() || 'ASSISTANT PROFESSOR'}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-50 pb-2">
                                <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Total Working Days</span>
                                <span className="text-sm font-bold text-[#1a1b4b]">24</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-gray-50 pb-2">
                                <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Department</span>
                                <span className="text-sm font-bold text-[#1a1b4b]">School of Engineering</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-50 pb-2">
                                <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Bank Name</span>
                                <span className="text-sm font-bold text-[#1a1b4b]">HDFC Bank</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-50 pb-2">
                                <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Bank Account No.</span>
                                <span className="text-sm font-bold text-[#1a1b4b]">XXXX XXXX 4920</span>
                            </div>
                        </div>
                    </div>

                    {/* Earnings and Deductions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[400px]">
                        {/* Earnings Section */}
                        <div className="p-8 border-r border-gray-100">
                            <h3 className="text-xs font-black text-[#1a1b4b] uppercase tracking-widest mb-6 flex items-center gap-2">
                                <div className="w-2 h-4 bg-green-500 rounded-sm"></div> Earnings
                            </h3>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-50">
                                        <th className="text-left py-3 text-[12px] font-black text-gray-400 uppercase tracking-widest">Serial No.</th>
                                        <th className="text-left py-3 text-[12px] font-black text-gray-400 uppercase tracking-widest">Salary Head</th>
                                        <th className="text-right py-3 text-[12px] font-black text-gray-400 uppercase tracking-widest">Amount (Rs.)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salaryData.earnings.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 text-xs font-bold text-gray-400">{item.id}</td>
                                            <td className="py-4 text-xs font-bold text-[#1a1b4b]">{item.head}</td>
                                            <td className="py-4 text-xs font-black text-[#1a1b4b] text-right">{item.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Deductions Section */}
                        <div className="p-8 bg-[#fcfdfe]">
                            <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <div className="w-2 h-4 bg-red-500 rounded-sm"></div> Deductions
                            </h3>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-50">
                                        <th className="text-left py-3 text-[12px] font-black text-gray-400 uppercase tracking-widest">Serial No.</th>
                                        <th className="text-left py-3 text-[12px] font-black text-gray-400 uppercase tracking-widest">Salary Head</th>
                                        <th className="text-right py-3 text-[12px] font-black text-gray-400 uppercase tracking-widest">Amount (Rs.)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salaryData.deductions.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-50 hover:bg-red-50/30 transition-colors">
                                            <td className="py-4 text-xs font-bold text-gray-400">{item.id}</td>
                                            <td className="py-4 text-xs font-bold text-[#1a1b4b]">{item.head}</td>
                                            <td className="py-4 text-xs font-black text-red-500 text-right">{item.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Footer */}
                    <div className="p-8 bg-gray-50/50 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Salary (Gross) / PM</span>
                                    <span className="text-sm font-black text-[#1a1b4b]">₹{totalEarnings.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Salary (CTC) / PM</span>
                                    <span className="text-sm font-black text-[#1a1b4b]">₹{totalEarnings.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="bg-white p-5 rounded-2xl border border-red-50 shadow-sm space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[12px] font-black text-red-400 uppercase tracking-widest">Total Deduction</span>
                                    <span className="text-sm font-black text-red-500">₹{totalDeductions.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                                    <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Reimbursement</span>
                                    <span className="text-sm font-black text-gray-400">-</span>
                                </div>
                            </div>

                            <div className="bg-[#1a1b4b] p-6 rounded-2xl shadow-lg shadow-[#1a1b4b]/20 flex flex-col justify-center gap-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[12px] font-black text-white/50 uppercase tracking-widest">Net Salary</span>
                                    <span className="text-2xl font-black text-white">₹{netSalary.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 text-center">
                            <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest italic leading-relaxed">
                                This is a computer generated salary slip and does not require an official signature. <br />
                                MIT ADT University, Loni Kalbhor, Pune - 412201
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalarySlip;
