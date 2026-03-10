const StatsCards = ({ items }) => {
  if (!items?.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map(({ label, value, icon: Icon, iconBg }) => (
        <div
          key={label}
          className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] card-hover"
        >
          <p className="text-sm font-medium text-[var(--color-text-muted)] mb-1">{label}</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--color-text)]">{value}</span>
            {Icon && (
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg || 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}>
                <Icon size={24} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
