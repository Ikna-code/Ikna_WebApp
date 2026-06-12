import React from 'react';
import { Feather, ShieldCheck, Zap } from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const problems: Feature[] = [
  {
    title: "COMFORT",
    description: "No more digging wires or red marks at the end of the day.",
    icon: <Feather size={24} strokeWidth={1.5} />,
  },
  {
    title: "SUPPORT",
    description: "Engineered lift that stays in place without constant adjusting.",
    icon: <ShieldCheck size={24} strokeWidth={1.5} />,
  },
  {
    title: "SHAPING",
    description: "Seamless technology for a smooth silhouette under any fabric.",
    icon: <Zap size={24} strokeWidth={1.5} />,
  },
];

const ProblemSolver = () => {
  return (
    /* Outer Container: Deepest shade of your brand color */
    <div className="w-full bg-[#320523] p-5 md:p-12 rounded-3xl space-y-6 md:space-y-10 shadow-2xl relative overflow-hidden">
      
      {/* Subtle Glow using #840d5c */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#840d5c]/20 blur-[80px] rounded-full"></div>

      {/* SECTION HEADER */}
      <div className="space-y-0.5 md:space-y-1 relative z-10 text-center md:text-left">
        <h3 className="text-[10px] tracking-[0.4em] font-bold uppercase text-[#c41a8e]">
          The IKNA Solution
        </h3>
        <h2 className="text-2xl md:text-3xl font-serif text-white">
          Problems solved by IKNA
        </h2>
        <div className="w-12 h-1 bg-[#840d5c] mt-2.5 md:mt-4 mx-auto md:mx-0 rounded-full"></div>
      </div>

      {/* ICON GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 md:gap-6 relative z-10">
        {problems.map((item, index) => (
          <div key={index} className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-2.5 md:space-y-4 group p-2.5 md:p-8 bg-[#4d0836] rounded-2xl transition-all duration-500 hover:bg-[#840d5c]/20 border border-[#840d5c]/30 hover:border-[#c41a8e]">
            
            {/* Icon Circle: Solid Brand Color */}
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-[#840d5c] flex items-center justify-center text-white transition-all duration-500 group-hover:shadow-[0_0_25px_#840d5c] group-hover:scale-110">
              {item.icon}
            </div>
            
            {/* Text Content */}
            <div className="space-y-2">
              <h4 className="text-[12px] font-bold tracking-widest uppercase text-[#c41a8e]">
                {item.title}
              </h4>
              <p className="text-[12px] leading-relaxed text-white/70 group-hover:text-white transition-colors">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER NOTE */}
      <div className="pt-4 md:pt-6 border-t border-[#840d5c]/20 relative z-10">
        <p className="text-[10px] tracking-widest uppercase font-bold text-[#c41a8e]/60 flex items-center justify-center md:justify-start gap-3">
          Designed in Pune
          <span className="w-1 h-1 rounded-full bg-[#840d5c]"></span>
          For every body type
        </p>
      </div>
    </div>
  );
};

export default ProblemSolver;