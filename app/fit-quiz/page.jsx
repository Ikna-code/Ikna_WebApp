'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Shield,
  ShoppingBag,
  Shirt,
  Briefcase,
  Plane,
  Dumbbell,
  Wine,
  Gift,
  SunMedium,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { getOptimizedSupabaseImageUrl } from '@/lib/supabaseImage';

import Portal from '@/components/ui/Portal';

const outfitOptions = [
  {
    id: 'tshirt',
    title: 'T-Shirt',
    icon: '/images/AI_images/tshirt_pink.png',
  },
  {
    id: 'kurti',
    title: 'Kurtis /\nDaily Wear',
    icon: '/images/AI_images/kurthi_pink.png',
  },
  {
    id: 'office',
    title: 'Office Wear',
    icon: '/images/AI_images/office_pink.png',
  },
  {
    id: 'sports',
    title: 'Sportswear',
    icon: '/images/AI_images/sports_pink.png',
  },
  {
    id: 'party',
    title: 'Party Wear',
    icon: '/images/AI_images/nightout_pink.png',
  },
  {
    id: 'lounge',
    title: 'Lounge Wear',
    icon: '/images/AI_images/night_pink.png',
  },
];

const comfortOptions = [
  {
    id: 'light',
    title: 'Light Support',
    desc: 'Soft, breathable & barely-there feel',
    icon: '/images/AI_images/light.png',
  },
  {
    id: 'medium',
    title: 'Medium Support',
    desc: 'Balanced support & comfort',
    icon: '/images/AI_images/medium.png',
  },
  {
    id: 'maximum',
    title: 'Maximum Support',
    desc: 'Extra hold for active days',
    icon: '/images/AI_images/maximum.png',
  },
];

const occasionOptions = [
  {
    id: 'everyday',
    title: 'Everyday',
    icon: SunMedium,
  },
  {
    id: 'office',
    title: 'Office',
    icon: Briefcase,
  },
  {
    id: 'travel',
    title: 'Travel',
    icon: Plane,
  },
  {
    id: 'workout',
    title: 'Workout',
    icon: Dumbbell,
  },
  {
    id: 'party',
    title: 'Party / Night Out',
    icon: Wine,
  },
  {
    id: 'special',
    title: 'Special Event',
    icon: Gift,
  },
];

// Fully synchronized structure containing your requested overrides
const braRecommendations = {
  tshirt: {
    light: {
      everyday: { name: 'EVERYDAY WEAR COMFY BRA', desc: 'Soft breathable comfort for seamless t-shirt use.', imgurl: '/images/match_bras/IMG_9266.jpg' },
      travel: { name: 'EVERYDAY WEAR COMFY BRA', desc: 'Seamless comfort for comfortable traveling.', imgurl: '/images/match_bras/IMG_9266.jpg' },
      lounge: { name: 'EVERYDAY WEAR COMFY BRA', desc: 'Seamless comfort for relaxing around the house.', imgurl: '/images/match_bras/IMG_9266.jpg' }
    },
    medium: {
      everyday: { name: 'Barely there – Light padded, non-wired cotton bra', desc: 'Smooth shape with balanced comfort and support.', imgurl: '/images/match_bras/IMG_1301_cropped.jpeg' },
      office: { name: 'Barely there – Light padded, non-wired cotton bra', desc: 'Smooth silhouette with professional support.', imgurl: '/images/match_bras/IMG_1301_cropped.jpeg' },
      travel: { name: 'Barely there – Light padded, non-wired cotton bra', desc: 'Reliable shape and comfort for long commutes.', imgurl: '/images/match_bras/IMG_1301_cropped.jpeg' }
    },
    maximum: {
      everyday: { name: 'COMFY SUPPORTIVE MINIMIZER BRA', desc: 'Extra support with minimized bounce for active days.', imgurl: '/images/match_bras/IMG_9529.jpg' },
      office: { name: 'COMFY SUPPORTIVE MINIMIZER BRA', desc: 'Maximum professional hold throughout long work hours.', imgurl: '/images/match_bras/IMG_9529.jpg' },
      special: { name: 'COMFY SUPPORTIVE MINIMIZER BRA', desc: 'Flawless shaping and full security for special occasions.', imgurl: '/images/match_bras/IMG_9529.jpg' }
    }
  },
  kurti: {
    light: {
      everyday: { name: 'EVERYDAY WEAR COMFY BRA', desc: 'Soft breathable comfort for daily ethnic wear.', imgurl: '/images/match_bras/IMG_9266.jpg' },
      lounge: { name: 'EVERYDAY WEAR COMFY BRA', desc: 'Relaxed softness for lounge routines.', imgurl: '/images/match_bras/IMG_9266.jpg' }
    },
    medium: {
      everyday: { name: 'SIDE NET COVERAGE BRA', desc: 'Enhanced side coverage under kurtis and fitted outfits.', imgurl: '/images/match_bras/IMG_1202_cropped.jpeg' },
      office: { name: 'SIDE NET COVERAGE BRA', desc: 'All-day security with excellent side smoothing.', imgurl: '/images/match_bras/IMG_1202_cropped.jpeg' },
      travel: { name: 'SIDE NET COVERAGE BRA', desc: 'Stay secure and worry-free while on the move.', imgurl: '/images/match_bras/IMG_1202_cropped.jpeg' }
    },
    maximum: {
      everyday: { name: 'COMFY SUPPORTIVE MINIMIZER BRA', desc: 'Maximum comfort and support throughout the day.', imgurl: '/images/match_bras/IMG_9529.jpg' },
      office: { name: 'COMFY SUPPORTIVE MINIMIZER BRA', desc: 'Firm hold and confident support for long schedules.', imgurl: '/images/match_bras/IMG_9529.jpg' },
      special: { name: 'COMFY SUPPORTIVE MINIMIZER BRA', desc: 'Clean, compact outline for formal ethnic styling.', imgurl: '/images/match_bras/IMG_9529.jpg' }
    }
  },
  office: {
    light: {
      office: { name: 'Barely there – Light padded, non-wired cotton bra', desc: 'Light support with a smooth office-ready silhouette.', imgurl: '/images/match_bras/IMG_1301_cropped.jpeg' },
      travel: { name: 'Barely there – Light padded, non-wired cotton bra', desc: 'Subtle padding for a neat look during your trips.', imgurl: '/images/match_bras/IMG_1301_cropped.jpeg' }
    },
    medium: {
      office: { name: 'PADDED BRA', desc: 'Secure support and structured shaping during long work hours.', imgurl: '/images/match_bras/IMG_1101_cropped.jpeg' },
      travel: { name: 'PADDED BRA', desc: 'Ideal structured support for business travels.', imgurl: '/images/match_bras/IMG_1101_cropped.jpeg' }
    },
    maximum: {
      office: { name: 'COMFY SUPPORTIVE MINIMIZER BRA', desc: 'Firm hold and support for all-day confidence.', imgurl: '/images/match_bras/IMG_9529.jpg' },
      special: { name: 'COMFY SUPPORTIVE MINIMIZER BRA', desc: 'Maximum control and posture boost for special events.', imgurl: '/images/match_bras/IMG_9529.jpg' }
    }
  },
  sports: {
    light: {
      everyday: { name: 'EVERYDAY WEAR COMFY BRA', desc: 'Flexible comfort for light movement and casual activity.', imgurl: '/images/match_bras/IMG_9266.jpg' },
      lounge: { name: 'EVERYDAY WEAR COMFY BRA', desc: 'Breathable wire-free design optimized for indoor ease.', imgurl: '/images/match_bras/IMG_9266.jpg' }
    },
    medium: {
      workout: { name: 'COMFY SUPPORTIVE MINIMIZER BRA', desc: 'Balanced support for active workout routines.', imgurl: '/images/match_bras/IMG_9529.jpg' },
      travel: { name: 'COMFY SUPPORTIVE MINIMIZER BRA', desc: 'Secure anti-bounce compression when traveling active.', imgurl: '/images/match_bras/IMG_9529.jpg' }
    },
    maximum: {
      workout: { name: 'COMFY SUPPORTIVE MINIMIZER BRA', desc: 'Maximum support for intense workouts and high activity.', imgurl: '/images/match_bras/IMG_9529.jpg' }
    }
  },
  party: {
    light: {
      party: { name: 'SIDE NET COVERAGE BRA', desc: 'Elegant styling with dependable side smoothing comfort.', imgurl: '/images/match_bras/IMG_1202_cropped.jpeg' },
      special: { name: 'SIDE NET COVERAGE BRA', desc: 'Clean underarm silhouette suitable for exquisite special functions.', imgurl: '/images/match_bras/IMG_1202_cropped.jpeg' }
    },
    medium: {
      party: { name: 'Barely there – Light padded, non-wired cotton bra', desc: 'Enhanced shape and stylish support for party outfits.', imgurl: '/images/match_bras/IMG_1301_cropped.jpeg' },
      special: { name: 'Barely there – Light padded, non-wired cotton bra', desc: 'Adds seamless definition under evening party fashion.', imgurl: '/images/match_bras/IMG_1301_cropped.jpeg' }
    },
    maximum: {
      party: { name: 'PADDED BRA', desc: 'Secure fit, ultimate bounce-control, and extra lift under fitted wear.', imgurl: '/images/match_bras/IMG_1101_cropped.jpeg' },
      special: { name: 'PADDED BRA', desc: 'Firm, structural shaping perfect for evening hugging outfits.', imgurl: '/images/match_bras/IMG_1101_cropped.jpeg' }
    }
  },
  lounge: {
    light: {
      everyday: { name: 'EVERYDAY WEAR COMFY BRA', desc: 'Relaxed softness for lounging and home comfort.', imgurl: '/images/match_bras/IMG_9266.jpg' },
      lounge: { name: 'EVERYDAY WEAR COMFY BRA', desc: 'Zero pressure feel engineered for sheer downtime comfort.', imgurl: '/images/match_bras/IMG_9266.jpg' },
      travel: { name: 'EVERYDAY WEAR COMFY BRA', desc: 'Easy-going fabric setup for long relaxing transit.', imgurl: '/images/match_bras/IMG_9266.jpg' }
    },
    medium: {
      everyday: { name: 'Barely there - Light padded, non-wired cotton bra', desc: 'Soft support with breathable comfort.', imgurl: '/images/match_bras/IMG_1301_cropped.jpeg' },
      lounge: { name: 'Barely there - Light padded, non-wired cotton bra', desc: 'Perfect lightweight structure to unwind comfortably.', imgurl: '/images/match_bras/IMG_1301_cropped.jpeg' }
    },
    maximum: {
      everyday: { name: 'SIDE NET COVERAGE BRA', desc: 'Extra side support with full comfort.', imgurl: '/images/match_bras/IMG_1202_cropped.jpeg' },
      special: { name: 'SIDE NET COVERAGE BRA', desc: 'Supportive coverage mixed with soft all-day leisure wear details.', imgurl: '/images/match_bras/IMG_1202_cropped.jpeg' }
    }
  }
};

export default function PerfectFitQuiz({ handleClose }) {
  const [isOpen, setIsOpen] = useState(true);
  const [step, setStep] = useState(0);

  const [outfit, setOutfit] = useState('tshirt');
  const [comfort, setComfort] = useState('light');
  const [occasion, setOccasion] = useState('everyday');
  const products = useStore((state) => state.products);
  const loadProducts = useStore((state) => state.loadProducts);
  const isProductsInitialized = useStore((state) => state.isProductsInitialized);

  // Compute valid occasions based on current selections
  const validOccasionsForSelection = useMemo(() => {
    const directMatches = braRecommendations[outfit]?.[comfort];
    return directMatches ? Object.keys(directMatches) : [];
  }, [outfit, comfort]);

  // Handle fallback context if the selected outfit changes validation availability
  useEffect(() => {
    if (validOccasionsForSelection.length > 0 && !validOccasionsForSelection.includes(occasion)) {
      setOccasion(validOccasionsForSelection[0]);
    }
  }, [validOccasionsForSelection, occasion]);

  const recommendation = useMemo(() => {
    return (
      braRecommendations[outfit]?.[comfort]?.[occasion] || {
        name: 'EVERYDAY WEAR COMFY BRA',
        desc: 'Comfortable bra for everyday use.',
        imgurl: '/images/match_bras/IMG_9266.jpg'
      }
    );
  }, [outfit, comfort, occasion]);

  const youMayAlsoLike = useMemo(() => {
    const suggestionName = String(recommendation?.name || '').toLowerCase().trim();

    const storeProducts = (products || [])
      .filter((product) => {
        if (!product?.id) return false;
        const productName = String(product?.name || '').toLowerCase().trim();
        if (!productName) return false;
        if (!suggestionName) return true;
        return !productName.includes(suggestionName) && !suggestionName.includes(productName);
      })
      .slice(0, 3)
      .map((product) => {
        const productImage =
          product?.image ||
          product?.image_path ||
          product?.product_images?.[0]?.image_path ||
          '';

        return {
          id: product.id,
          title: product?.name || 'Product',
          imgurl: getOptimizedSupabaseImageUrl(productImage, { width: 320, quality: 70 }),
          price: `₹${Number(product?.price || 0).toLocaleString()}`,
          href: `/product/${product.id}`,
        };
      });

    if (storeProducts.length > 0) return storeProducts;

    return outfitOptions
      .filter((item) => item.id !== outfit)
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        title: item.title.replace(/\s*\/\s*\n?/g, ' ').replace(/\n/g, ' ').trim(),
        imgurl: item.icon,
        price: '₹699',
        href: '/shop',
      }));
  }, [outfit, products, recommendation]);

  const route = useRouter();

  useEffect(() => {
    if (!isProductsInitialized) {
      loadProducts();
    }
  }, [isProductsInitialized, loadProducts]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const closeModal = () => {
    setIsOpen(false);
    handleClose();
  };

  const nextStep = () => {
    if (step < 7) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    }
  };

  const progressStep = useMemo(() => {
    if (step === 0) return 0;
    if (step <= 3) return step;
    return 4;
  }, [step]);

  if (!isOpen) return null;

  const ProgressBar = () => (
    <div className="px-6 pt-6 pb-4 border-b border-[#f1eeee]">
      <h3 className="text-center text-[15px] font-semibold tracking-wide text-[#202020]">
        FIND YOUR PERFECT BRA
      </h3>
      <div className="flex items-start justify-between mt-7 relative">
        {[1, 2, 3, 4].map((item, idx) => {
          const active = progressStep >= item;
          const completed = progressStep > item;

          return (
            <div key={item} className="flex-1 flex items-start relative">
              <div className="flex flex-col items-center relative z-10 w-full">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all duration-300 ${
                    active
                      ? 'bg-[#ea3f77] text-white'
                      : 'bg-[#ece7e7] text-[#8f8f8f]'
                  }`}
                >
                  {completed ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    item
                  )}
                </div>
                <span
                  className={`text-[11px] mt-2 font-medium ${
                    active ? 'text-[#ea3f77]' : 'text-[#9f9f9f]'
                  }`}
                >
                  {item === 1 && 'Outfit'}
                  {item === 2 && 'Comfort'}
                  {item === 3 && 'Occasion'}
                  {item === 4 && 'Result'}
                </span>
              </div>
              {idx !== 3 && (
                <div
                  className={`absolute top-4 left-1/2 w-full h-[2px] ${
                    progressStep > item ? 'bg-[#ea3f77]' : 'bg-[#ebe7e7]'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Portal>
      <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <div className="relative w-full max-w-[420px] h-[min(680px,85vh)] bg-white rounded-[30px] shadow-[0_10px_50px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col">
          
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 z-[999] text-[#404040] hover:opacity-80 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>

          {/* INTRO (STEP 0) */}
          {step === 0 && (
            <div className="relative w-full h-full flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-x-0 top-0 bottom-[120px] sm:bottom-[130px] z-0 overflow-hidden">
                <img
                  src="/images/AI_images/quiz-bg.png"
                  alt="Perfect Bra Fit Background"
                  className="w-full h-full object-cover object-center"
                />
              </div>

              <div className="relative z-10 flex flex-col justify-between p-5 sm:p-6 pt-6 sm:pt-8 h-full">
                <div className="text-center mb-2 shrink-0">
                  <div className="inline-flex items-center gap-2 bg-[#ffe9f1] text-[#ea3f77] text-[10px] sm:text-[11px] font-semibold px-3 sm:px-4 py-1.5 rounded-full">
                    <Heart className="w-3 h-3 fill-[#ea3f77]" />
                    INTERACTIVE QUIZ
                  </div>
                </div>

                <div className="relative flex-1 flex flex-col justify-start items-center text-center">
                  <h1 className="text-[32px] sm:text-[36px] leading-[1.1] font-serif text-[#1f1f1f] mt-5 shrink-0">
                    Find Your<br />Perfect Bra Fit
                  </h1>
                </div>

                <div className="mt-4 w-full shrink-0 z-10">
                  <button
                    onClick={nextStep}
                    className="w-full h-[50px] sm:h-[54px] rounded-[16px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[16px] font-semibold shadow-lg shadow-pink-100 active:scale-[0.99] transition-transform"
                  >
                    Start Quiz
                  </button>
                  <button
                    onClick={closeModal}
                    className="w-full text-center mt-2.5 text-[#ea3f77] text-[13px] font-medium underline hover:text-[#e93369]"
                  >
                    Skip Quiz
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1-3 */}
          {step >= 1 && step <= 3 && (
            <div className="w-full h-full flex flex-col">
              <ProgressBar />

              {/* STEP 1 */}
              {step === 1 && (
                <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 pt-4 overflow-hidden">
                  <div className="flex-1 overflow-y-auto hide-scrollbar pr-0.5">
                    <p className="text-center text-[14px] text-[#686868]">Step 1 of 4</p>
                    <h2 className="text-center text-[26px] sm:text-[30px] leading-[1.2] font-semibold mt-2 text-[#202020]">
                      What are you planning to wear?
                    </h2>
                    <p className="text-center text-[#747474] text-[14px] mt-1">Choose your outfit type</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-5">
                      {outfitOptions.map((item) => {
                        const active = outfit === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setOutfit(item.id)}
                            className={`relative rounded-[18px] border h-[110px] sm:h-[120px] flex flex-col items-center justify-center transition-all duration-300 px-2 ${
                              active ? 'border-[#ea3f77] bg-[#fff5f8]' : 'border-[#ebe7e7]'
                            }`}
                          >
                            {active && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#ea3f77] flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <img src={item.icon} alt={item.title} className="w-9 h-9 sm:w-11 sm:h-11 object-contain" />
                            <span className="text-[12px] leading-4 font-medium text-center whitespace-pre-line mt-2 text-[#202020]">
                              {item.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 bg-white shrink-0">
                    <button
                      onClick={nextStep}
                      className="w-full h-[52px] sm:h-[56px] rounded-[16px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[15px] sm:text-[16px] font-semibold flex items-center justify-center gap-3"
                    >
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 pt-4 overflow-hidden">
                  <div className="flex-1 overflow-y-auto hide-scrollbar pr-0.5">
                    <p className="text-center text-[14px] text-[#686868]">Step 2 of 4</p>
                    <h2 className="text-center text-[26px] sm:text-[30px] leading-[1.2] font-semibold mt-2 text-[#202020]">
                      How do you like your bra to feel?
                    </h2>
                    <p className="text-center text-[#747474] text-[14px] mt-1">Choose your comfort level</p>

                    <div className="space-y-3 mt-5">
                      {comfortOptions.map((item) => {
                        const active = comfort === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setComfort(item.id)}
                            className={`w-full rounded-[18px] border px-4 py-3 sm:py-4 flex items-center justify-between transition-all duration-300 ${
                              active ? 'border-[#ea3f77] bg-[#fff6f8]' : 'border-[#ece7e7]'
                            }`}
                          >
                            <div className="flex items-center gap-3 text-left flex-1">
                              <img src={item.icon} alt={item.title} className="w-9 h-9 object-contain shrink-0" />
                              <div className="min-w-0">
                                <h4 className="text-[15px] sm:text-[17px] font-semibold text-[#202020]">{item.title}</h4>
                                <p className="text-[12px] sm:text-[13px] text-[#707070] mt-0.5">{item.desc}</p>
                              </div>
                            </div>
                            {active && (
                              <div className="w-5 h-5 rounded-full bg-[#ea3f77] flex items-center justify-center shrink-0 ml-2">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 bg-white shrink-0">
                    <button onClick={prevStep} className="h-[52px] rounded-[16px] border border-[#ddd] flex items-center justify-center gap-2 text-[14px] font-medium">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={nextStep} className="h-[52px] rounded-[16px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[14px] font-semibold flex items-center justify-center gap-2">
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 pt-4 overflow-hidden">
                  <div className="flex-1 overflow-y-auto hide-scrollbar pr-0.5">
                    <p className="text-center text-[14px] text-[#686868]">Step 3 of 4</p>
                    <h2 className="text-center text-[26px] sm:text-[30px] leading-[1.2] font-semibold mt-2 text-[#202020]">
                      What's the occasion?
                    </h2>
                    <p className="text-center text-[#747474] text-[14px] mt-1">Choose the occasion type</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-5">
                      {occasionOptions.map((item) => {
                        const active = occasion === item.id;
                        const isAvailable = validOccasionsForSelection.includes(item.id);
                        const Icon = item.icon;
                        
                        return (
                          <button
                            key={item.id}
                            disabled={!isAvailable}
                            onClick={() => isAvailable && setOccasion(item.id)}
                            className={`relative rounded-[18px] border h-[110px] sm:h-[120px] flex flex-col items-center justify-center transition-all duration-300 px-2 ${
                              !isAvailable 
                                ? 'opacity-40 bg-gray-50/50 border-gray-200 cursor-not-allowed select-none' 
                                : active 
                                ? 'border-[#ea3f77] bg-[#fff6f8]' 
                                : 'border-[#ebe7e7] hover:bg-gray-50/50'
                            }`}
                          >
                            {active && isAvailable && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#ea3f77] flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <Icon className={`w-7 h-7 ${!isAvailable ? 'text-gray-400' : 'text-[#ea3f77]'}`} />
                            <span className={`text-[12px] font-medium text-center mt-2 ${!isAvailable ? 'text-gray-400' : 'text-[#202020]'}`}>
                              {item.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 bg-white shrink-0">
                    <button onClick={prevStep} className="h-[52px] rounded-[16px] border border-[#ddd] flex items-center justify-center gap-2 text-[14px] font-medium">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={() => setStep(4)} className="h-[52px] rounded-[16px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[14px] font-semibold flex items-center justify-center gap-2">
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RESULT (STEP 4) */}
          {step === 4 && (
            <div className="w-full h-full flex flex-col overflow-hidden">
              <ProgressBar />
              <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 overflow-hidden">
                <div className="flex-1 overflow-y-auto hide-scrollbar pr-0.5">
                  <h2 className="text-center text-[26px] sm:text-[30px] leading-[1.2] font-semibold text-[#202020]">
                    Here's your perfect match!
                  </h2>
                  <p className="text-center text-[#777] mt-1 text-[14px]">Based on your choices</p>

                  <div className="bg-[#fbf7f7] rounded-[24px] p-4 mt-4 border border-[#f2eded]">
                    <div className="relative">
                      <div className="absolute top-2 left-2 bg-[#ea3f77] text-white text-[9px] font-semibold px-2.5 py-1 rounded-full">
                        BEST MATCH
                      </div>
                      <img src={recommendation.imgurl} alt="Bra" className="w-full max-h-[140px] object-contain mx-auto" />
                    </div>

                    <h3 className="text-[20px] sm:text-[24px] font-semibold text-center mt-3 text-[#202020]">
                      {recommendation.name}
                    </h3>
                    <p className="text-center text-[#747474] text-[13px] sm:text-[14px] mt-1.5 leading-relaxed">
                      {recommendation.desc}
                    </p>

                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {['Seamless\nLook', 'Light\nPadding', 'All Day\nComfort', 'T-Shirt\nFriendly'].map((text, idx) => (
                        <div key={idx} className="text-center">
                          <div className="w-9 h-9 rounded-full border border-[#eddfe2] bg-white flex items-center justify-center mx-auto">
                            {idx === 0 && <Shirt className="w-4 h-4 text-[#ea3f77]" />}
                            {idx === 1 && <Heart className="w-4 h-4 text-[#ea3f77]" />}
                            {idx === 2 && <Shield className="w-4 h-4 text-[#ea3f77]" />}
                            {idx === 3 && <ShoppingBag className="w-4 h-4 text-[#ea3f77]" />}
                          </div>
                          <p className="whitespace-pre-line text-[10px] text-[#555] leading-3 mt-1.5">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 bg-white shrink-0">
                  <button onClick={() => setStep(5)} className="w-full h-[52px] rounded-[16px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[15px] font-semibold">
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WHY THIS BRA (STEP 5) */}
          {step === 5 && (
            <div className="w-full h-full flex flex-col justify-between p-4 sm:p-5 overflow-hidden">
              <div className="flex-1 overflow-y-auto hide-scrollbar pr-0.5">
                <h3 className="text-[#ea3f77] font-semibold text-[22px]">Why this bra?</h3>
                <div className="space-y-2.5 mt-3">
                  {['Custom tailored for your specific clothing selection', 'Engineered profile for an optimized, seamless fit', 'Breathable materials for all-day reliability', 'Invisible transition lines under your fashion layers'].map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-[14px] leading-5 text-[#3b3b3b]">
                      <Check className="w-4 h-4 text-[#ea3f77] mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <p className="text-center text-[#555] text-[14px] font-medium mt-5 mb-3">You may also like</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {youMayAlsoLike.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => route.push(item.href)}
                      className="text-left"
                    >
                      <div className="bg-[#faf7f7] rounded-[14px] p-1.5 border border-[#f1ebeb]">
                        <img src={item.imgurl} alt={item.title} className="w-full object-contain max-h-[60px]" />
                      </div>
                      <h4 className="text-[11px] font-medium truncate mt-1.5">{item.title}</h4>
                      <p className="text-[12px] font-semibold">{item.price}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 bg-white shrink-0">
                <button onClick={() => setStep(6)} className="w-full h-[52px] rounded-[16px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[15px] font-semibold">
                  Shop This Bra
                </button>
                <button onClick={() => setStep(1)} className="w-full text-center mt-3 text-[#ea3f77] text-[14px] font-medium">
                  Retake Quiz
                </button>
              </div>
            </div>
          )}

          {/* SUMMARY (STEP 6) */}
          {step === 6 && (
            <div className="w-full h-full flex flex-col justify-between p-4 sm:p-5 overflow-hidden">
              <div className="flex-1 overflow-y-auto hide-scrollbar pr-0.5">
                <h2 className="text-center text-[14px] font-semibold tracking-wide">FIND YOUR PERFECT BRA</h2>
                
                <div className="bg-[#fcf8f8] border border-[#f2ebeb] rounded-[20px] p-4 mt-4 space-y-3.5">
                  <div className="flex items-start gap-3 border-b border-[#ece7e7] pb-3">
                    <Shirt className="w-5 h-5 text-[#ea3f77] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] text-[#666]">Outfit Type</p>
                      <h4 className="font-medium text-[14px]">{outfitOptions.find((item) => item.id === outfit)?.title}</h4>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 border-b border-[#ece7e7] pb-3">
                    <Heart className="w-5 h-5 text-[#ea3f77] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] text-[#666]">Comfort Level</p>
                      <h4 className="font-medium text-[14px]">{comfortOptions.find((item) => item.id === comfort)?.title}</h4>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <SunMedium className="w-5 h-5 text-[#ea3f77] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] text-[#666]">Occasion</p>
                      <h4 className="font-medium text-[14px]">{occasionOptions.find((item) => item.id === occasion)?.title}</h4>
                    </div>
                  </div>
                </div>

                <div className="bg-[#fff6f8] rounded-[20px] p-4 mt-4 border border-[#f7dce5] flex gap-3">
                  <Heart className="w-5 h-5 text-[#ea3f77] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-[#ea3f77] text-[14px]">Why quiz helps?</h4>
                    <p className="text-[12px] text-[#555] leading-relaxed mt-1">
                      We recommend bras that match your outfit, comfort & occasion for the perfect fit.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 bg-white shrink-0">
                <button onClick={() => setStep(7)} className="w-full h-[52px] rounded-[16px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[15px] font-semibold">
                  Save My Result
                </button>
              </div>
            </div>
          )}

          {/* FINAL (STEP 7) */}
          {step === 7 && (
            <div className="w-full h-full flex flex-col justify-between p-4 sm:p-5 text-center overflow-hidden">
              <div className="flex-1 overflow-y-auto hide-scrollbar pr-0.5">
                <div className="w-16 h-16 rounded-full bg-[#fff2f6] flex items-center justify-center mx-auto mt-2">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <ShoppingBag className="w-5 h-5 text-[#ea3f77]" />
                  </div>
                </div>

                <h2 className="text-[30px] font-serif mt-4 text-[#202020]">You’re all set!</h2>
                <p className="text-[#666] text-[14px] mt-1">We’ve found the perfect bra for you.</p>

                <div className="border border-[#ece7e7] rounded-[20px] p-4 mt-5 text-left bg-gray-50/50">
                  <h3 className="text-[16px] font-semibold text-center">Save your result for next time</h3>
                  <p className="text-[#666] text-[13px] text-center mt-1.5">
                    We’ll remember your preferences to improve your experience.
                  </p>
                  <button className="w-full h-[48px] rounded-[14px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[14px] font-semibold mt-4">
                    Save My Result
                  </button>
                </div>
              </div>

              <div className="pt-4 bg-white shrink-0">
                <button className="w-full h-[52px] rounded-[16px] border border-[#ddd] text-[15px] font-medium flex items-center justify-center gap-2" onClick={() => route.push('/shop')}>
                  Continue Shopping <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </Portal>
  );
}