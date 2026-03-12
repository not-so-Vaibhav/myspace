const StatsCards = ({ items }) => {
  if (!items?.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map(({ label, value, icon: Icon, iconBg }) => (
        <div
          key={label}
          className="bg-[var(--color-surface)] p-8 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] transition-all hover:-translate-y-2"
        >
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl sm:text-4xl font-black text-[#1a1b4b] tracking-tighter">{value}</span>
            {Icon && (
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${iconBg || 'bg-[#1a1b4b]/5 text-[#1a1b4b]'}`}>
                <Icon size={28} strokeWidth={2.5} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
