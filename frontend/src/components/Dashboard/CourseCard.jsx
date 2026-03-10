import { MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';

const colorMap = {
  yellow: 'bg-amber-400/20 text-amber-700',
  pink: 'bg-pink-400/20 text-pink-700',
  green: 'bg-emerald-400/20 text-emerald-700',
  blue: 'bg-blue-400/20 text-blue-700',
};

const CourseCard = ({ id, title, coursesCount = '30+ Courses', initial, colorKey = 'blue', viewUrl }) => {
  const color = colorMap[colorKey] || colorMap.blue;
  const letter = initial || title?.charAt(0)?.toUpperCase() || 'C';

  return (
    <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] card-hover flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${color}`}>
          {letter}
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-[var(--color-text)] truncate">{title}</h4>
          <p className="text-sm text-[var(--color-text-muted)]">{coursesCount}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to={viewUrl || `/courses/${id || ''}`}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors"
        >
          View Courses
        </Link>
        <button type="button" className="p-1.5 text-[var(--color-text-subtle)] hover:text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors" aria-label="More">
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  );
};

export default CourseCard;
