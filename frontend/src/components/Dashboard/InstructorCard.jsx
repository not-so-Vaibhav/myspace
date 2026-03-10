import { Link } from 'react-router-dom';

const InstructorCard = ({ id, name, description = 'Design Course.', coursesCount = '5', avatarUrl }) => {
  const initial = name?.charAt(0)?.toUpperCase() || 'I';

  return (
    <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] card-hover flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0 border border-[var(--color-border-light)]">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-[var(--color-primary)]">{initial}</span>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-[var(--color-text)] truncate">{name}</h4>
          <p className="text-sm text-[var(--color-text-muted)] truncate">{description}</p>
        </div>
      </div>
      <Link
        to={`/instructors/${id || ''}`}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors flex-shrink-0"
      >
        Courses
      </Link>
    </div>
  );
};

export default InstructorCard;
