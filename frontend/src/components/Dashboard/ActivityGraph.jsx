import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const defaultData = [
  { name: 'mon', progress: 10 },
  { name: 'tue', progress: 25 },
  { name: 'wed', progress: 40 },
  { name: 'thu', progress: 35 },
  { name: 'fri', progress: 60 },
  { name: 'sat', progress: 75 },
];

const ActivityGraph = ({ data = defaultData, title = 'Monthly Progress', subtitle = 'This is the latest improvement' }) => {
  return (
    <div className="bg-[var(--color-surface)] p-8 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] transition-all hover:shadow-lg">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter">{title}</h3>
          <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a1b4b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#1a1b4b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f6fa" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900, fill: '#94a3b8', textTransform: 'uppercase' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ borderRadius: '1rem', border: 'none', backgroundColor: '#fff', boxShadow: 'var(--shadow-card)' }}
              itemStyle={{ fontWeight: 'black', fontSize: '14px' }}
              formatter={(value) => [`${value}%`, 'Progress']}
            />
            <Area type="monotone" dataKey="progress" stroke="#1a1b4b" strokeWidth={4} fillOpacity={1} fill="url(#colorProgress)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ActivityGraph;
