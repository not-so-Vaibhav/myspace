import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const subjectData = [
    { subject: 'CN', full: 'Computer Networks', present: 18, total: 20 },
    { subject: 'OS', full: 'Operating Systems', present: 17, total: 20 },
    { subject: 'EE', full: 'Engineering Ethics', present: 19, total: 20 },
    { subject: 'WTL', full: 'Written & Technical Language', present: 14, total: 20 },
    { subject: 'SCIL', full: 'Soft Computing & IT Lab', present: 16, total: 20 },
    { subject: 'ENT', full: 'Entrepreneurship', present: 13, total: 18 },
];

const overallPresent = subjectData.reduce((a, s) => a + s.present, 0);
const overallTotal = subjectData.reduce((a, s) => a + s.total, 0);
const overallPct = Math.round((overallPresent / overallTotal) * 100);

const chartData = [
    { name: 'Present', value: overallPct, color: '#1a1b4b' },
    { name: 'Absent', value: 100 - overallPct, color: '#ef4444' },
];

const AttendanceChart = () => {
    const [activeSubject, setActiveSubject] = useState(null);

    return (
        <div className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-[var(--color-text)] font-black text-xl tracking-tight uppercase opacity-40">Attendance</h2>
                <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-xl ${overallPct >= 75 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {overallPct >= 75 ? 'Good Standing' : 'Low Attendance'}
                </span>
            </div>

            {/* Gauge Chart */}
            <div className="relative flex flex-col items-center justify-center" style={{ height: '200px' }}>
                <div className="w-full h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="80%"
                                startAngle={180}
                                endAngle={0}
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={8}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={20}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                itemStyle={{ color: 'var(--color-text)', fontWeight: 'bold' }}
                                contentStyle={{ borderRadius: '1rem', border: 'none', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="absolute bottom-10 flex flex-col items-center">
                    <span className="text-4xl font-black text-[var(--color-text)] tracking-tighter">{overallPct}%</span>
                    <span className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-1 opacity-50">Overall Rate</span>
                </div>
                <div className="absolute bottom-2 flex gap-8 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                    {chartData.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            {entry.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* Subject-wise breakdown */}
            <div className="mt-4 space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Subject Breakdown</p>
                {subjectData.map((s, i) => {
                    const pct = Math.round((s.present / s.total) * 100);
                    const isLow = pct < 75;
                    const isActive = activeSubject === i;
                    return (
                        <div
                            key={i}
                            className={`rounded-xl p-3 cursor-pointer transition-all ${isActive ? 'bg-[#f4f6fa] shadow-sm' : 'hover:bg-gray-50'}`}
                            onClick={() => setActiveSubject(isActive ? null : i)}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-[#1a1b4b]">{s.subject}</span>
                                    {isActive && <span className="text-[10px] text-gray-400 font-medium">{s.full}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400 font-bold">{s.present}/{s.total}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${isLow ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                        {pct}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-400' : 'bg-[#1a1b4b]'}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AttendanceChart;
