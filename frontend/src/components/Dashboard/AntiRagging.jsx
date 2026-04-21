const AntiRagging = () => {
    return (
        <a 
            href="https://www.antiragging.in/affidavit_university_form.php" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-[var(--color-surface)] border-2 border-[var(--color-border-light)] rounded-[var(--radius-card)] py-4 w-full overflow-hidden flex items-center shadow-[var(--shadow-card)] hover:bg-red-50/10 transition-colors group cursor-pointer"
        >
            <div className="animate-marquee flex whitespace-nowrap">
                {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="text-[#ef4444] font-black text-xl uppercase tracking-[0.2em] px-8 group-hover:scale-105 transition-transform">
                        Anti Ragging-Undertaking Form Required
                    </span>
                ))}
            </div>
        </a>
    );
};

export default AntiRagging;
