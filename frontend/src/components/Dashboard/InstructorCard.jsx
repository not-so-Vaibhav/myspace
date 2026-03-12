import { Link } from 'react-router-dom';

const InstructorCard = ({ id, name, description = 'Design Course.', coursesCount = '5', avatarUrl }) => {
  const initial = name?.charAt(0)?.toUpperCase() || 'I';

  return (
    <div className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] transition-all hover:shadow-lg flex items-center justify-between gap-6">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-[#1a1b4b]/5 flex items-center justify-center flex-shrink-0 border-2 border-[#f4f6fa] shadow-sm">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-black text-[#1a1b4b]">{initial}</span>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-black text-[#1a1b4b] truncate tracking-tight">{name}</h4>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{description}</p>
        </div>
      </div>
      <Link
        to={`/instructors/${id || ''}`}
        className="px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#f4f6fa] text-[#1a1b4b] hover:bg-[#1a1b4b] hover:text-white transition-all shadow-sm active:scale-95 flex-shrink-0"
      >
        View
      </Link>
    </div>
  );
};

export default InstructorCard;
