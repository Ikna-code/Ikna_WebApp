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

const braRecommendations = {
  tshirt: {
    light: {
      name: 'Barely there - Light padded, non-wired cotton bra',
      desc: 'Seamless comfort for t-shirts and everyday wear.',
    },

    medium: {
      name: 'PADDED BRA',
      desc: 'Smooth shape with balanced comfort and support.',
    },

    maximum: {
      name: 'COMFY SUPPORTIVE MINIMIZER BRA',
      desc: 'Extra support with minimized bounce for active days.',
    },
  },

  kurti: {
    light: {
      name: 'EVERYDAY WEAR COMFY BRA',
      desc: 'Soft breathable comfort for daily ethnic wear.',
    },

    medium: {
      name: 'SIDE NET COVERAGE BRA',
      desc: 'Enhanced side coverage under kurtis and fitted outfits.',
    },

    maximum: {
      name: 'COMFY SUPPORTIVE MINIMIZER BRA',
      desc: 'Maximum comfort and support throughout the day.',
    },
  },

  office: {
    light: {
      name: 'PADDED BRA',
      desc: 'Light support with a smooth office-ready silhouette.',
    },

    medium: {
      name: 'SIDE NET COVERAGE BRA',
      desc: 'Secure support and side coverage during long work hours.',
    },

    maximum: {
      name: 'COMFY SUPPORTIVE MINIMIZER BRA',
      desc: 'Firm hold and support for all-day confidence.',
    },
  },

  sports: {
    light: {
      name: 'EVERYDAY WEAR COMFY BRA',
      desc: 'Flexible comfort for light movement and casual activity.',
    },

    medium: {
      name: 'COMFY SUPPORTIVE MINIMIZER BRA',
      desc: 'Balanced support for active routines.',
    },

    maximum: {
      name: 'COMFY SUPPORTIVE MINIMIZER BRA',
      desc: 'Maximum support for workouts and high activity.',
    },
  },

  party: {
    light: {
      name: 'Barely There Bridgerton limited edition',
      desc: 'Elegant styling with luxurious comfort.',
    },

    medium: {
      name: 'PADDED BRA',
      desc: 'Enhanced shape and stylish support for party outfits.',
    },

    maximum: {
      name: 'SIDE NET COVERAGE BRA',
      desc: 'Secure fit and extra confidence under fitted wear.',
    },
  },

  lounge: {
    light: {
      name: 'EVERYDAY WEAR COMFY BRA',
      desc: 'Relaxed softness for lounging and home comfort.',
    },

    medium: {
      name: 'Barely there - Light padded, non-wired cotton bra',
      desc: 'Soft support with breathable comfort.',
    },

    maximum: {
      name: 'SIDE NET COVERAGE BRA',
      desc: 'Extra side support with full comfort.',
    },
  },
};


export default function PerfectFitQuiz({ handleClose }) {
  const [isOpen, setIsOpen] = useState(true);

  const [step, setStep] = useState(0);

  const [outfit, setOutfit] = useState('tshirt');
  const [comfort, setComfort] = useState('light');
  const [occasion, setOccasion] = useState('everyday');

  const recommendation =
  braRecommendations[outfit]?.[comfort] || {
    name: 'EVERYDAY WEAR COMFY BRA',
    desc: 'Comfortable bra for everyday use.',
  };

    const route = useRouter();

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
            <div
              key={item}
              className="flex-1 flex items-start relative"
            >
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
                    active
                      ? 'text-[#ea3f77]'
                      : 'text-[#9f9f9f]'
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
                    progressStep > item
                      ? 'bg-[#ea3f77]'
                      : 'bg-[#ebe7e7]'
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
      <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm overflow-hidden">

        <div className=" flex items-center justify-center p-3 sm:p-6">

          <div className="relative w-full max-w-[420px] bg-white rounded-[30px] shadow-[0_10px_50px_rgba(0,0,0,0.18)] overflow-auto max-h-[90vh] overflow-y-auto hide-scrollbar scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent">



            {/* INTRO */}
{step === 0 && (
  <div >

    {/* BG */}
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#fff7f8_100%)]" />

    <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#ea3f77_1px,transparent_1px)] [background-size:16px_16px]" />

    {/* CLOSE */}
    <button
      onClick={closeModal}
      className="absolute top-4 right-4 sm:top-5 sm:right-5 z-50 text-[#404040]"
    >
      <X className="w-5 h-5" />
    </button>

    {/* MAIN CONTENT */}
    <div className="relative z-10 flex flex-col min-h-screen sm:min-h-[760px] px-4 sm:px-6 pt-8 sm:pt-10 pb-6">

      {/* TOP BADGE */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-[#ffe9f1] text-[#ea3f77] text-[10px] sm:text-[11px] font-semibold px-3 sm:px-4 py-1.5 rounded-full">
          <Heart className="w-3 h-3 fill-[#ea3f77]" />
          INTERACTIVE QUIZ
        </div>
      </div>

      {/* IMAGE CONTAINER */}
      <div className="relative mt-6 flex-1 flex items-end justify-center">

        {/* BRA IMAGE */}
        <img
          src="/images/AI_images/quiz-bg.png"
          alt="Bra"
          className="
            w-full
            max-w-[260px]
            sm:max-w-[320px]
            md:max-w-[360px]
            object-contain
          "
        />

        {/* TEXT OVER IMAGE EMPTY SPACE */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full px-3 sm:px-4 text-center">

          <h1
            className="
              text-[38px]
              leading-[0.95]
              sm:text-[48px]
              md:text-[48px]
              font-serif
              text-[#1f1f1f]
            "
          >
            Find Your
            <br />
            Perfect Bra
            <br />
            Fit
          </h1>

          <p
            className="
              text-[#6e6e6e]
              text-[14px]
              leading-[26px]
              sm:text-[16px]
              sm:leading-[30px]
              md:text-[17px]
              md:leading-[34px]
              max-w-[300px]
              mx-auto
              mt-5
              sm:mt-8
            "
          >
            Personalized recommendations based
            on your outfit, comfort & occasion.
          </p>
        </div>
      </div>

      {/* BUTTONS */}
      <div className="mt-6 sm:mt-8">

        <button
          onClick={nextStep}
          className="
            w-full
            h-[54px]
            sm:h-[58px]
            rounded-[16px]
            sm:rounded-[18px]
            bg-gradient-to-r
            from-[#ea3f77]
            to-[#e93369]
            text-white
            text-[16px]
            sm:text-[17px]
            font-semibold
            shadow-lg
            shadow-pink-200
          "
        >
          Start Quiz
        </button>

        <button
          onClick={closeModal}
          className="
            w-full
            mt-4
            sm:mt-5
            text-[#ea3f77]
            text-[13px]
            sm:text-[14px]
            underline
          "
        >
          Skip Quiz
        </button>
      </div>
    </div>
  </div>
)}

            {/* STEP 1-3 */}
            {step >= 1 && step <= 3 && (
              <>
                <ProgressBar />

                {/* STEP 1 */}
{step === 1 && (
  <div className="px-4 sm:px-5 pt-6 sm:pt-7 pb-6">

    {/* Step */}
    <p className="text-center text-[14px] sm:text-[15px] text-[#686868]">
      Step 1 of 4
    </p>

    {/* Heading */}
    <h2 className="text-center text-[28px] sm:text-[34px] leading-[1.2] font-semibold mt-3 text-[#202020] px-2">
      What are you planning to wear?
    </h2>

    {/* Subtitle */}
    <p className="text-center text-[#747474] text-[14px] sm:text-[15px] leading-6 mt-2 px-3">
      Choose your outfit type
    </p>

    {/* Outfit Options */}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-7 sm:mt-8">

      {outfitOptions.map((item) => {
        const active = outfit === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setOutfit(item.id)}
            className={`relative rounded-[18px] sm:rounded-[20px] border h-[120px] sm:h-[132px] flex flex-col items-center justify-center transition-all duration-300 px-2 ${
              active
                ? 'border-[#ea3f77] bg-[#fff5f8]'
                : 'border-[#ebe7e7]'
            }`}
          >
            {active && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#ea3f77] flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}

            <img
              src={item.icon}
              alt={item.title}
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
            />

            <span className="text-[12px] sm:text-[13px] leading-5 font-medium text-center whitespace-pre-line mt-3 text-[#202020]">
              {item.title}
            </span>
          </button>
        );
      })}
    </div>

    {/* CTA */}
    <button
      onClick={nextStep}
      className="w-full h-[52px] sm:h-[58px] rounded-[16px] sm:rounded-[18px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[15px] sm:text-[17px] font-semibold flex items-center justify-center gap-3 mt-7 sm:mt-8"
    >
      Next
      <ArrowRight className="w-4 h-4" />
    </button>
  </div>
)}

                {/* STEP 2 */}
{step === 2 && (
  <div className="px-4 sm:px-5 pt-6 sm:pt-7 pb-6">

    {/* Step */}
    <p className="text-center text-[14px] sm:text-[15px] text-[#686868]">
      Step 2 of 4
    </p>

    {/* Heading */}
    <h2 className="text-center text-[28px] sm:text-[34px] leading-[1.2] font-semibold mt-3 text-[#202020] px-2">
      How do you like your bra to feel?
    </h2>

    {/* Subtitle */}
    <p className="text-center text-[#747474] text-[14px] sm:text-[15px] leading-6 mt-2 px-3">
      Choose your comfort level
    </p>

    {/* Options */}
    <div className="space-y-4 mt-7 sm:mt-8">

      {comfortOptions.map((item) => {
        const active = comfort === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setComfort(item.id)}
            className={`w-full rounded-[18px] sm:rounded-[20px] border px-4 sm:px-5 py-4 sm:py-5 flex items-center justify-between transition-all duration-300 ${
              active
                ? 'border-[#ea3f77] bg-[#fff6f8]'
                : 'border-[#ece7e7]'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 text-left flex-1">

              <img
                src={item.icon}
                alt={item.title}
                className="w-10 h-10 sm:w-11 sm:h-11 object-contain shrink-0"
              />

              <div className="min-w-0">
                <h4 className="text-[16px] sm:text-[19px] leading-6 font-semibold text-[#202020]">
                  {item.title}
                </h4>

                <p className="text-[13px] sm:text-[14px] leading-5 text-[#707070] mt-1">
                  {item.desc}
                </p>
              </div>
            </div>

            {active && (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#ea3f77] flex items-center justify-center shrink-0 ml-3">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>

    {/* Navigation */}
    <div className="grid grid-cols-2 gap-3 mt-7 sm:mt-8">

      <button
        onClick={prevStep}
        className="h-[52px] sm:h-[56px] rounded-[16px] sm:rounded-[18px] border border-[#ddd] flex items-center justify-center gap-2 text-[14px] sm:text-base font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <button
        onClick={nextStep}
        className="h-[52px] sm:h-[56px] rounded-[16px] sm:rounded-[18px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[14px] sm:text-base font-semibold flex items-center justify-center gap-2"
      >
        Next
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
)}

                {/* STEP 3 */}
{step === 3 && (
  <div className="px-4 sm:px-5 pt-6 sm:pt-7 pb-6">

    {/* Step */}
    <p className="text-center text-[14px] sm:text-[15px] text-[#686868]">
      Step 3 of 4
    </p>

    {/* Heading */}
    <h2 className="text-center text-[28px] sm:text-[34px] leading-[1.2] font-semibold mt-3 text-[#202020] px-2">
      What's the occasion?
    </h2>

    {/* Subtitle */}
    <p className="text-center text-[#747474] text-[14px] sm:text-[15px] leading-6 mt-2 px-3">
      Choose the occasion type
    </p>

    {/* Options */}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-7 sm:mt-8">

      {occasionOptions.map((item) => {
        const active = occasion === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => setOccasion(item.id)}
            className={`relative rounded-[18px] sm:rounded-[20px] border h-[120px] sm:h-[130px] flex flex-col items-center justify-center transition-all duration-300 px-2 ${
              active
                ? 'border-[#ea3f77] bg-[#fff6f8]'
                : 'border-[#ebe7e7]'
            }`}
          >
            {active && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#ea3f77] flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}

            <Icon className="w-7 h-7 sm:w-9 sm:h-9 text-[#ea3f77]" />

            <span className="text-[12px] sm:text-[13px] leading-5 font-medium text-center mt-3 text-[#202020]">
              {item.title}
            </span>
          </button>
        );
      })}
    </div>

    {/* Navigation Buttons */}
    <div className="grid grid-cols-2 gap-3 mt-7 sm:mt-8">

      <button
        onClick={prevStep}
        className="h-[52px] sm:h-[56px] rounded-[16px] sm:rounded-[18px] border border-[#ddd] flex items-center justify-center gap-2 text-[14px] sm:text-base font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <button
        onClick={() => setStep(4)}
        className="h-[52px] sm:h-[56px] rounded-[16px] sm:rounded-[18px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[14px] sm:text-base font-semibold flex items-center justify-center gap-2"
      >
        Next
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
)}
              </>
            )}

            {/* RESULT */}
{step === 4 && (
  <div className="pb-6">

    <ProgressBar />

    <div className="px-4 sm:px-5 pt-6 sm:pt-7">

      {/* Heading */}
      <h2 className="text-center text-[28px] sm:text-[36px] leading-[1.2] font-semibold text-[#202020] px-2">
        Here's your perfect match!
      </h2>

      {/* Subtitle */}
      <p className="text-center text-[#777] mt-3 text-[14px] sm:text-[15px] leading-6">
        Based on your choices
      </p>

      {/* Product Card */}
      <div className="bg-[#fbf7f7] rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 mt-6 sm:mt-7 border border-[#f2eded]">

        <div className="relative">

          {/* Badge */}
          <div className="absolute top-2 left-2 bg-[#ea3f77] text-white text-[9px] sm:text-[10px] font-semibold px-2.5 sm:px-3 py-1 rounded-full">
            BEST MATCH
          </div>

          {/* Image */}
          <img
            src="/images/quiz/bra-main.png"
            alt="Bra"
            className="w-full object-contain"
          />
        </div>

        {/* Product Name */}
        <h3 className="text-[22px] sm:text-[28px] leading-[1.3] font-semibold text-center mt-4 text-[#202020]">
          {recommendation.name}
        </h3>

        {/* Description */}
        <p className="text-center text-[#747474] text-[14px] sm:text-[15px] mt-3 leading-6 sm:leading-7">
          {recommendation.desc}
        </p>

        {/* Features */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-3 mt-6 sm:mt-7">

          {[
            'Seamless\nLook',
            'Light\nPadding',
            'All Day\nComfort',
            'T-Shirt\nFriendly',
          ].map((text, idx) => (
            <div
              key={idx}
              className="text-center"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-[#eddfe2] bg-white flex items-center justify-center mx-auto">

                {idx === 0 && (
                  <Shirt className="w-4 h-4 sm:w-5 sm:h-5 text-[#ea3f77]" />
                )}

                {idx === 1 && (
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-[#ea3f77]" />
                )}

                {idx === 2 && (
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[#ea3f77]" />
                )}

                {idx === 3 && (
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#ea3f77]" />
                )}
              </div>

              <p className="whitespace-pre-line text-[11px] sm:text-[12px] text-[#555] leading-4 mt-2">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => setStep(5)}
        className="w-full h-[52px] sm:h-[58px] rounded-[16px] sm:rounded-[18px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[15px] sm:text-[17px] font-semibold mt-6 sm:mt-7"
      >
        Continue
      </button>
    </div>
  </div>
)}

            {/* WHY THIS BRA */}
{step === 5 && (
  <div className="px-4 sm:px-5 pt-5 sm:pt-6 pb-6">

    {/* Heading */}
    <h3 className="text-[#ea3f77] font-semibold text-[22px] sm:text-[24px] leading-tight">
      Why this bra?
    </h3>

    {/* Benefits */}
    <div className="space-y-4 mt-5">

      {[
        'Perfect under T-shirts & fitted tops',
        'Lightly padded for a smooth shape',
        'Breathable fabric for all-day comfort',
        'Invisible under everyday outfits',
      ].map((item) => (
        <div
          key={item}
          className="flex items-start gap-3 text-[14px] sm:text-[15px] leading-6 text-[#3b3b3b]"
        >
          <Check className="w-4 h-4 text-[#ea3f77] mt-1 shrink-0" />
          <span>{item}</span>
        </div>
      ))}
    </div>

    {/* Section Title */}
    <p className="text-center text-[#555] text-[14px] sm:text-[15px] font-medium mt-7 sm:mt-8 mb-4">
      You may also like
    </p>

    {/* Product Grid */}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">

      {[1, 2, 3].map((item) => (
        <div key={item}>

          <div className="bg-[#faf7f7] rounded-[16px] sm:rounded-[18px] p-2 border border-[#f1ebeb]">
            <img
              src="/images/quiz/bra-main.png"
              alt="Bra"
              className="w-full object-contain"
            />
          </div>

          <h4 className="text-[12px] sm:text-[13px] font-medium leading-5 mt-3">
            {recommendation.name}
          </h4>

          <p className="text-[13px] sm:text-[14px] font-semibold mt-1">
            ₹699
          </p>
        </div>
      ))}
    </div>

    {/* CTA */}
    <button
      onClick={() => setStep(6)}
      className="w-full h-[52px] sm:h-[58px] rounded-[16px] sm:rounded-[18px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[15px] sm:text-[17px] font-semibold mt-7 sm:mt-8"
    >
      Shop This Bra
    </button>

    {/* Retake */}
    <button
      onClick={() => setStep(1)}
      className="w-full text-center mt-4 sm:mt-5 text-[#ea3f77] text-[14px] sm:text-[15px] font-medium"
    >
      Retake Quiz
    </button>
  </div>
)}

            {/* SUMMARY */}
{step === 6 && (
  <div className="px-4 sm:px-5 pt-5 sm:pt-6 pb-6">

    {/* Heading */}
    <h2 className="text-center text-[14px] sm:text-[16px] font-semibold tracking-wide leading-6">
      FIND YOUR PERFECT BRA
    </h2>

    {/* Summary Card */}
    <div className="bg-[#fcf8f8] border border-[#f2ebeb] rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 mt-5 sm:mt-6">

      {/* Outfit */}
      <div className="flex items-start justify-between border-b border-[#ece7e7] pb-4 sm:pb-5">

        <div className="flex items-start gap-3">
          <Shirt className="w-5 h-5 text-[#ea3f77] mt-1 shrink-0" />

          <div>
            <p className="text-[13px] sm:text-[14px] text-[#666]">
              Outfit Type
            </p>

            <h4 className="font-medium mt-1 text-[15px] sm:text-base leading-6">
 {outfitOptions.find((item) => item.id === outfit)?.title}            </h4>
          </div>
        </div>
      </div>

      {/* Comfort */}
      <div className="flex items-start justify-between border-b border-[#ece7e7] py-4 sm:py-5">

        <div className="flex items-start gap-3">
          <Heart className="w-5 h-5 text-[#ea3f77] mt-1 shrink-0" />

          <div>
            <p className="text-[13px] sm:text-[14px] text-[#666]">
              Comfort Level
            </p>

            <h4 className="font-medium mt-1 text-[15px] sm:text-base leading-6">
             {comfortOptions.find((item) => item.id === comfort)?.title}
            </h4>
          </div>
        </div>
      </div>

      {/* Occasion */}
      <div className="flex items-start justify-between pt-4 sm:pt-5">

        <div className="flex items-start gap-3">
          <SunMedium className="w-5 h-5 text-[#ea3f77] mt-1 shrink-0" />

          <div>
            <p className="text-[13px] sm:text-[14px] text-[#666]">
              Occasion
            </p>

            <h4 className="font-medium mt-1 text-[15px] sm:text-base leading-6">
               {occasionOptions.find((item) => item.id === occasion)?.title}
            </h4>
          </div>
        </div>
      </div>
    </div>

    {/* Info Box */}
    <div className="bg-[#fff6f8] rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 mt-4 sm:mt-5 border border-[#f7dce5]">

      <div className="flex items-start gap-3 sm:gap-4">

        <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-[#ea3f77] shrink-0 mt-1" />

        <div>
          <h4 className="font-semibold text-[#ea3f77] text-[15px] sm:text-base">
            Why quiz helps?
          </h4>

          <p className="text-[13px] sm:text-[14px] text-[#555] leading-6 mt-2">
            We recommend bras that match your outfit,
            comfort & occasion for the perfect fit
            every time.
          </p>
        </div>
      </div>
    </div>

    {/* CTA */}
    <button
      onClick={() => setStep(7)}
      className="w-full h-[52px] sm:h-[58px] rounded-[16px] sm:rounded-[18px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[15px] sm:text-[17px] font-semibold mt-6 sm:mt-7"
    >
      Save My Result
    </button>
  </div>
)}

            {/* FINAL */}
{step === 7 && (
  <div className="px-4 sm:px-5 pt-6 sm:pt-8 pb-6 text-center">

    {/* Icon */}
    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-[#fff2f6] flex items-center justify-center mx-auto">
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center shadow-sm">
        <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-[#ea3f77]" />
      </div>
    </div>

    {/* Heading */}
    <h2 className="text-[34px] sm:text-[56px] leading-[1.15] font-serif mt-6 sm:mt-8 text-[#202020] px-2">
      You’re all set!
    </h2>

    {/* Description */}
    <p className="text-[#666] text-[15px] sm:text-[18px] leading-7 sm:leading-8 mt-4 sm:mt-5 px-2">
      We’ve found the perfect bra for you.
    </p>

    {/* Card */}
    <div className="border border-[#ece7e7] rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 mt-7 sm:mt-8 text-left">

      <h3 className="text-[20px] sm:text-[24px] font-semibold text-center leading-snug">
        Save your result for next time
      </h3>

      <p className="text-[#666] text-[14px] sm:text-[15px] leading-6 sm:leading-7 text-center mt-3 sm:mt-4">
        We’ll remember your preferences
        to improve your experience.
      </p>

      <button className="w-full h-[52px] sm:h-[58px] rounded-[16px] sm:rounded-[18px] bg-gradient-to-r from-[#ea3f77] to-[#e93369] text-white text-[15px] sm:text-[17px] font-semibold mt-5 sm:mt-6">
        Save My Result
      </button>
    </div>

    {/* Continue Button */}
    <button className="w-full h-[52px] sm:h-[58px] rounded-[16px] sm:rounded-[18px] border border-[#ddd] mt-4 sm:mt-5 text-[15px] sm:text-base font-medium flex items-center justify-center gap-2" onClick={()=>route.push('/shop')}>
      Continue Shopping
      <ArrowRight className="w-4 h-4" />
    </button>
  </div>
)}
          </div>
        </div>
      </div>
    </Portal>
  );
}