"use client";
import React ,{ useState }from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import FitQuiz from '@/app/fit-quiz/page';

const QuizCard = () => {
  const router = useRouter();
  const [openFitQuiz, setOpenFitQuiz] = useState(false);
  return (
    /* Background: Deep Midnight Plum */
    <>
    <div className="bg-[#2D1B24] p-5 md:p-10 rounded-2xl border border-[#840d5c]/20 relative overflow-hidden group shadow-2xl">
      
      {/* Decorative Background Icon - Soft Lavender color at low opacity */}
      <Sparkles 
        className="absolute -right-4 -top-4 text-[#E5D5DA]/10 rotate-12 transition-all duration-700 group-hover:scale-125 group-hover:rotate-45" 
        size={150} 
      />

      <div className="relative z-10 space-y-4 md:space-y-6">
        <div className="space-y-2">
          {/* Heading in Soft Lavender Grey */}
          <h3 className="text-2xl md:text-3xl font-serif text-[#E5D5DA] leading-tight">
            Not sure about <br /> your fit?
          </h3>
          <p className="text-[10px] text-[#840d5c] tracking-[0.3em] uppercase font-bold">
            Interactive Quiz
          </p>
        </div>

        {/* Text in Muted Rose-Grey */}
        <p className="text-sm text-[#E5D5DA]/70 leading-relaxed max-w-[240px]">
          Answer 5 quick questions about your body shape and comfort preferences to find your match.
        </p>

        <div className="space-y-3 pt-2.5 md:pt-4">
          {/* Button: Using your Brand Color #840d5c */}
          <button className="flex items-center justify-between w-full bg-[#840d5c] text-white px-5 md:px-6 py-3 md:py-4 text-[11px] font-bold uppercase tracking-[0.2em] hover:brightness-125 hover:shadow-[0_0_20px_rgba(132,13,92,0.4)] transition-all rounded-lg group"  onClick={() => setOpenFitQuiz(true)}>
            TAKE THE INTERACTIVE QUIZ
            <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-2" />
          </button>
          
          <p className="text-[11px] text-[#E5D5DA]/50 italic text-center">
            "98% of women found their perfect fit"
          </p>
        </div>
      </div>

      {/* Progress visual: Darker plum base with Brand Color progress */}
      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-[#3D2933]">
        <div className="h-full bg-[#840d5c] w-1/3 shadow-[0_0_10px_#840d5c]"></div>
      </div>
    </div>
    {openFitQuiz && (
      <FitQuiz handleClose={() => setOpenFitQuiz(false)} />
    )}
    </>
  );
};

export default QuizCard;