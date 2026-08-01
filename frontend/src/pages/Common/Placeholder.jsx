import { useLocation } from 'react-router-dom';

const Placeholder = () => {
  const path = useLocation().pathname.slice(1) || 'Dashboard';
  const label = path.replace(/-/g, ' ');

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-[var(--color-text)] capitalize">{label}</h1>
      <p className="text-[var(--color-text-muted)] mt-2">This section is coming soon.</p>
    </div>
  );
};

export default Placeholder;
