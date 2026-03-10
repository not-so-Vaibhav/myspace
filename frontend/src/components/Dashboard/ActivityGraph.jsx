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
    <div className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] card-hover">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-text)]">{title}</h3>
          <p className="text-sm text-[var(--color-text-muted)]">{subtitle}</p>
        </div>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-subtle)' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-subtle)' }} />
            <Tooltip
              contentStyle={{ borderRadius: 'var(--radius-button)', border: '1px solid var(--color-border)' }}
              formatter={(value) => [`${value}%`, 'Progress']}
            />
            <Area type="monotone" dataKey="progress" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorProgress)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ActivityGraph;
