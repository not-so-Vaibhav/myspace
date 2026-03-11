import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
    { name: 'Present', value: 85, color: '#4B7BFF' },
    { name: 'Absent', value: 10, color: '#FF6B9E' },
    { name: 'Late', value: 5, color: '#FFB84D' },
];

const AttendanceChart = () => {
    return (
        <div className="bg-[var(--color-surface)] p-6 rounded-[1.5rem] border border-[var(--color-border-light)] shadow-sm relative flex flex-col items-center justify-center h-full min-h-[300px]">
            <div className="absolute top-6 left-6">
                <h2 className="text-[var(--color-text)] font-semibold text-lg">Overall Attendance</h2>
            </div>

            <div className="w-full h-[220px] mt-10">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="80%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={10}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            itemStyle={{ color: 'var(--color-text)' }}
                            contentStyle={{ borderRadius: 'var(--radius-button)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="absolute bottom-12 flex flex-col items-center">
                <span className="text-2xl font-bold text-[var(--color-text)]">85%</span>
                <span className="text-sm font-medium text-[var(--color-text-muted)] mt-1">Present</span>
            </div>

            <div className="absolute bottom-4 flex gap-6 text-xs font-semibold text-[var(--color-text-muted)]">
                {data.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></span>
                        {entry.name}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AttendanceChart;
