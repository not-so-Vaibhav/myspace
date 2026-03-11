import { Mail, Twitter, Youtube, Facebook } from 'lucide-react';

const SocialMedia = () => {
    return (
        <div className="bg-[var(--color-surface)] p-6 py-10 rounded-[1.5rem] border border-[var(--color-border-light)] shadow-sm flex flex-col justify-center h-full relative">
            <div className="absolute right-6 top-4">
                <h2 className="text-[#4B7BFF] font-bold text-2xl tracking-wide opacity-50">Social Media</h2>
            </div>

            <div className="flex justify-center flex-wrap gap-5 mt-4">
                <a href="#" className="w-14 h-14 rounded-full bg-[#3498DB] text-white flex items-center justify-center hover:-translate-y-1 transition-transform shadow-md hover:shadow-lg">
                    <Mail size={24} fill="currentColor" />
                </a>
                <a href="#" className="w-14 h-14 rounded-full bg-white border border-gray-200 text-[#1DA1F2] flex items-center justify-center hover:-translate-y-1 transition-transform shadow-md hover:shadow-lg">
                    <Twitter size={24} fill="currentColor" />
                </a>
                <a href="#" className="w-14 h-14 rounded-full bg-[#EA4335] text-white flex items-center justify-center hover:-translate-y-1 transition-transform shadow-md hover:shadow-lg">
                    <span className="font-extrabold text-2xl leading-none">g+</span>
                </a>
                <a href="#" className="w-14 h-14 rounded-full bg-[#FF0000] text-white flex items-center justify-center hover:-translate-y-1 transition-transform shadow-md hover:shadow-lg">
                    <Youtube size={26} fill="currentColor" className="text-white" />
                </a>
                <a href="#" className="w-14 h-14 rounded-full bg-[#3b5998] text-white flex items-center justify-center hover:-translate-y-1 transition-transform shadow-md hover:shadow-lg">
                    <Facebook size={26} fill="currentColor" className="text-white" />
                </a>
            </div>

            <div className="absolute top-8 left-0 w-3/4 h-[3px] bg-gray-300"></div>
            <div className="absolute top-8 right-0 w-[4px] h-[3px] bg-gray-300 mr-4"></div>
        </div>
    );
}

export default SocialMedia;
