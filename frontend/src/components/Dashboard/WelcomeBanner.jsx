import { GraduationCap, Users } from 'lucide-react';

const WelcomeBanner = ({ role = 'Student', userName }) => {
  return (
    <section className="rounded-[var(--radius-card)] overflow-hidden border border-[var(--color-border-light)] bg-[#ccfbf1]/80 shadow-[var(--shadow-card)] card-hover">
      <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="max-w-xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] mb-2">
            Learn Effectively With Us!
          </h1>
          <p className="text-[var(--color-text-muted)] mb-6">
            Get 30% off every course on January.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-[var(--color-border-light)] shadow-sm">
              <div className="w-10 h-10 rounded-full bg-[var(--color-accent-rose)]/20 flex items-center justify-center text-[var(--color-accent-rose)]">
                <GraduationCap size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)]">Students</p>
                <p className="text-lg font-bold text-[var(--color-text)]">75,000+</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-[var(--color-border-light)] shadow-sm">
              <div className="w-10 h-10 rounded-full bg-[var(--color-accent-amber)]/20 flex items-center justify-center text-[var(--color-accent-amber)]">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)]">Expert Mentors</p>
                <p className="text-lg font-bold text-[var(--color-text)]">200+</p>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0 w-48 h-32 bg-[var(--color-primary)]/10 rounded-2xl flex items-center justify-center">
          <GraduationCap size={64} className="text-[var(--color-primary)]/40" />
        </div>
      </div>
    </section>
  );
};

export default WelcomeBanner;
