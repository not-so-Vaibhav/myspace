import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { useStudentAttendance } from '../../hooks/useStudentAttendance';
import { Loader2 } from 'lucide-react';

const AttendanceChart = () => {
    const { loading, overallPct } = useStudentAttendance();

    const chartData = [
        { name: 'Present', value: overallPct, color: '#1a1b4b' },
        { name: 'Absent', value: 100 - overallPct, color: '#ef4444' },
    ];

    return (
        <div className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] transition-all hover:shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-[var(--color-text)] font-black text-xl tracking-tight uppercase opacity-40 flex items-center gap-2">
                    Attendance 
                    {loading && <Loader2 size={12} className="animate-spin opacity-50" />}
                </h2>
                {!loading && (
                  <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-xl ${overallPct >= 75 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {overallPct >= 75 ? 'Good Standing' : 'Low Attendance'}
                  </span>
                )}
            </div>

            {/* Gauge Chart */}
            <div className="relative flex flex-col items-center justify-center min-h-[200px]" style={{ height: '200px' }}>
                {loading ? (
                    <div className="flex items-center justify-center w-full h-full">
                        <Loader2 className="animate-spin w-8 h-8 text-[#1a1b4b]" />
                    </div>
                ) : (
                    <>
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
                        <div className="absolute bottom-2 flex gap-8 text-[12px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                            {chartData.map((entry, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                    {entry.name}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Link to Detailed Subject Breakdown Page */}
            <div className="mt-8 border-t border-[var(--color-border-light)] pt-6 flex justify-center">
                <Link to="/attendance" className="inline-flex items-center gap-2 group hover:opacity-70 transition-all cursor-pointer">
                    <span className="text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest bg-gray-50 border border-gray-100 px-4 py-2 rounded-full shadow-sm pr-8 relative">
                        View Detailed Subject Breakdown
                        <span className="text-[#ef4444] font-black absolute right-4 top-1/2 -translate-y-1/2 transform group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                </Link>
            </div>
        </div>
    );
};

export default AttendanceChart;
