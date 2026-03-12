import { Linkedin, Facebook, Twitter, Instagram, MessageCircle } from 'lucide-react';

const SocialMedia = () => {
    const socialItems = [
        { icon: MessageCircle, color: 'bg-[#2E4A62]', textColor: 'text-white' }, // Dark Slate (WhatsApp-ish)
        { icon: Twitter, color: 'bg-[#F4F1EA]', textColor: 'text-[#1a1b4b]' },      // Cream
        { icon: Linkedin, color: 'bg-[#D9A7A7]', textColor: 'text-[#1a1b4b]' },     // Muted Pink
        { icon: Facebook, color: 'bg-[#F4F1EA]', textColor: 'text-[#1a1b4b]' },     // Cream
        { icon: MessageCircle, color: 'bg-[#2E4A62]', textColor: 'text-white' }, // Dark Slate
    ];

    // Double the items for seamless marquee
    const marqueeItems = [...socialItems, ...socialItems];

    return (
        <div className="bg-[var(--color-surface)] p-6 py-10 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] overflow-hidden flex flex-col justify-center h-full relative">
            <div className="absolute right-6 top-4">
                <h2 className="text-[var(--color-primary)] font-bold text-xl tracking-wide opacity-20 uppercase">Social Connect</h2>
            </div>

            <div className="relative mt-4">
                <div className="animate-marquee flex gap-8 py-2">
                    {marqueeItems.map((item, idx) => (
                        <div
                            key={idx}
                            className={`flex-shrink-0 w-16 h-16 rounded-full ${item.color} ${item.textColor} flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer`}
                        >
                            <item.icon size={28} strokeWidth={1.5} />
                        </div>
                    ))}
                </div>

                {/* Gradient Fades for smoothness */}
                <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent z-10"></div>
                <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent z-10"></div>
            </div>

            <div className="absolute top-8 left-0 w-1/2 h-[2px] bg-[var(--color-surface-muted)]"></div>
        </div>
    );
}

export default SocialMedia;
