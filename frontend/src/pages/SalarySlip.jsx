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
            <style>
                {`
                @media print {
                    @page {
                        size: A4;
                        margin: 1.5cm;
                    }
                    body {
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-container {
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                        background: white !important;
                    }
                    .print-slip {
                        border: 1px solid #eee !important;
                        box-shadow: none !important;
                        border-radius: 1rem !important;
                        margin-top: 0 !important;
                    }
                    .print-compact-p {
                        padding: 1.5rem !important;
                    }
                    .print-compact-table-py {
                        padding-top: 0.5rem !important;
                        padding-bottom: 0.5rem !important;
                    }
                    .print-compact-mb {
                        margin-bottom: 1rem !important;
                    }
                    .print-grid-min-h {
                        min-h: auto !important;
                        min-height: auto !important;
                    }
                }
                `}
            </style>
            <div className="max-w-4xl mx-auto space-y-8 print-container">
                {/* Header Actions */}
                <div className="flex justify-between items-center no-print">
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
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-[#1a1b4b]/5 overflow-hidden print-slip">
                    {/* Brand Header */}
                    <div className="bg-[#1a1b4b] p-8 text-center border-b border-white/10 print:p-6">
                        <h2 className="text-2xl font-black text-white tracking-widest uppercase print:text-xl">MIT ADT UNIVERSITY</h2>
                        <div className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
                            <Calendar size={12} className="text-[#ef4444]" />
                            <span className="text-[12px] font-black text-white uppercase tracking-widest">Salary slip for {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                        </div>
                    </div>

                    {/* Employee Info */}
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-gray-100 print:p-6 print:gap-4 print:grid-cols-2">
                        <div className="space-y-4 print:space-y-2">
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
                        <div className="space-y-4 print:space-y-2">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[400px] print:grid-cols-2 print:min-h-0 print:min-height-0 overflow-hidden">
                        {/* Earnings Section */}
                        <div className="p-8 border-r border-gray-100 print:p-6 print:border-r">
                            <h3 className="text-xs font-black text-[#1a1b4b] uppercase tracking-widest mb-6 flex items-center gap-2 print:mb-3">
                                <div className="w-2 h-4 bg-green-500 rounded-sm"></div> Earnings
                            </h3>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-50">
                                        <th className="text-left py-3 text-[12px] font-black text-gray-400 uppercase tracking-widest print:py-1">Sr.</th>
                                        <th className="text-left py-3 text-[12px] font-black text-gray-400 uppercase tracking-widest print:py-1">Head</th>
                                        <th className="text-right py-3 text-[12px] font-black text-gray-400 uppercase tracking-widest print:py-1">Amt (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salaryData.earnings.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 text-xs font-bold text-gray-400 print:py-2">{item.id}</td>
                                            <td className="py-4 text-xs font-bold text-[#1a1b4b] print:py-2">{item.head}</td>
                                            <td className="py-4 text-xs font-black text-[#1a1b4b] text-right print:py-2">{item.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Deductions Section */}
                        <div className="p-8 bg-[#fcfdfe] print:p-6 print:bg-white">
                            <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-6 flex items-center gap-2 print:mb-3">
                                <div className="w-2 h-4 bg-red-500 rounded-sm"></div> Deductions
                            </h3>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-50">
                                        <th className="text-left py-3 text-[12px] font-black text-gray-400 uppercase tracking-widest print:py-1">Sr.</th>
                                        <th className="text-left py-3 text-[12px] font-black text-gray-400 uppercase tracking-widest print:py-1">Head</th>
                                        <th className="text-right py-3 text-[12px] font-black text-gray-400 uppercase tracking-widest print:py-1">Amt (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salaryData.deductions.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-50 hover:bg-red-50/30 transition-colors">
                                            <td className="py-4 text-xs font-bold text-gray-400 print:py-2">{item.id}</td>
                                            <td className="py-4 text-xs font-bold text-[#1a1b4b] print:py-2">{item.head}</td>
                                            <td className="py-4 text-xs font-black text-red-500 text-right print:py-2">{item.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Footer */}
                    <div className="p-8 bg-gray-50/50 border-t border-gray-100 print:p-6 print:bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-3 print:gap-3">
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3 print:p-3 print:space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross / PM</span>
                                    <span className="text-xs font-black text-[#1a1b4b]">₹{totalEarnings.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CTC / PM</span>
                                    <span className="text-xs font-black text-[#1a1b4b]">₹{totalEarnings.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="bg-white p-5 rounded-2xl border border-red-50 shadow-sm space-y-3 print:p-3 print:space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Total Deduction</span>
                                    <span className="text-xs font-black text-red-500">₹{totalDeductions.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-gray-50 print:pt-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reimbursement</span>
                                    <span className="text-xs font-black text-gray-400">-</span>
                                </div>
                            </div>

                            <div className="bg-[#1a1b4b] p-6 rounded-2xl shadow-lg shadow-[#1a1b4b]/20 flex flex-col justify-center gap-4 print:p-4 print:gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Net Salary</span>
                                    <span className="text-xl font-black text-white">₹{netSalary.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 text-center print:mt-4">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic leading-relaxed print:text-[8px] print:text-gray-400">
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
