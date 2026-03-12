import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
    { name: 'Present', value: 85, color: '#1a1b4b' }, // Dark Navy
    { name: 'Absent', value: 15, color: '#ef4444' },  // Vibrant Red
];

const AttendanceChart = () => {
    return (
        <div className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] relative flex flex-col items-center justify-center" style={{ height: '350px' }}>
            <div className="absolute top-8 left-8">
                <h2 className="text-[var(--color-text)] font-black text-xl tracking-tight uppercase opacity-40">Attendance</h2>
            </div>

            <div className="w-full h-[240px] mt-8">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="80%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={80}
                            outerRadius={125}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={20}
                        >
                            {data.map((entry, index) => (
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

            <div className="absolute bottom-16 flex flex-col items-center">
                <span className="text-4xl font-black text-[var(--color-text)] tracking-tighter">85%</span>
                <span className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-1 opacity-50">Overall Rate</span>
            </div>

            <div className="absolute bottom-6 flex gap-8 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                {data.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                        {entry.name}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AttendanceChart;
