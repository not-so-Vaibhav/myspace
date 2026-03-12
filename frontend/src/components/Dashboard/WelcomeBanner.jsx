import { GraduationCap, Users } from 'lucide-react';

const WelcomeBanner = ({ role = 'Student', userName }) => {
  return (
    <section className="rounded-[var(--radius-card)] overflow-hidden border border-[var(--color-border-light)] bg-gradient-to-br from-[#1a1b4b]/5 to-[#4B7BFF]/5 shadow-[var(--shadow-card)] transition-all hover:shadow-lg">
      <div className="p-8 sm:p-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
        <div className="max-w-xl">
          <h1 className="text-3xl sm:text-4xl font-black text-[#1a1b4b] uppercase tracking-tighter mb-2">
            Learn Effectively With <span className="text-[#ef4444]">MySpace</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-8">
            Elevate your learning experience with our premium tools.
          </p>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-3xl border border-[#f4f6fa] shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444]">
                <GraduationCap size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enrolled Students</p>
                <p className="text-xl font-black text-[#1a1b4b] tracking-tight">75,000+</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-3xl border border-[#f4f6fa] shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-[#4B7BFF]/10 flex items-center justify-center text-[#4B7BFF]">
                <Users size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expert Mentors</p>
                <p className="text-xl font-black text-[#1a1b4b] tracking-tight">200+</p>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0 w-56 h-40 bg-[#1a1b4b] rounded-[2.5rem] flex items-center justify-center shadow-xl rotate-3">
          <GraduationCap size={80} className="text-white opacity-80" />
        </div>
      </div>
    </section>
  );
};

export default WelcomeBanner;
