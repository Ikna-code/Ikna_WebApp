"use client";

import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

// Mock Data matching common e-commerce & IKNA specific features
const faqData = [
  {
    id: "product-fit",
    category: "Product & Fit",
    questions: [
      {
        q: "How do I choose the right bra size?",
        a: "Ikna bras are designed for comfort, support, and confidence. You can use the size guide available on each product page to measure your band and cup size accurately before placing an order.",
      },
      {
        q: "Are Ikna bras suitable for daily wear?",
        a: "Yes. Ikna bras are crafted for all-day comfort with breathable fabrics, smooth finishes, and supportive designs suitable for everyday use.",
      },
      {
        q: "Do your bras provide full coverage?",
        a: "Ikna offers different coverage styles depending on the product design. Product descriptions clearly mention whether the bra provides light, medium, or full coverage.",
      },
      {
        q: "Will the bra be visible under fitted outfits?",
        a: "Most Ikna bras are designed with seamless and smooth finishes to reduce visibility under T-shirts, dresses, and body-hugging outfits.",
      },
      {
        q: "Are the straps adjustable?",
        a: "Yes. Most Ikna bras come with adjustable straps to help you achieve a personalized and comfortable fit.",
      },
      {
        q: "Do your bras have padding?",
        a: "Ikna offers both padded and non-padded options depending on the style. Product details mention all specifications clearly.",
      },
      {
        q: "Can I wear Ikna bras for long hours?",
        a: "Absolutely. Comfort-focused materials and ergonomic support make them suitable for extended wear throughout the day.",
      },
      {
        q: "Are your bras wire-free or underwired?",
        a: "Ikna offers different support options including wire-free and underwired styles based on customer preferences and outfit needs.",
      },
    ],
  },
  {
    id: "fabric-comfort",
    category: "Fabric & Comfort",
    questions: [
      {
        q: "What fabrics are used in Ikna bras?",
        a: "Ikna uses soft, skin-friendly, breathable, and stretchable fabrics designed for comfort and durability.",
      },
      {
        q: "Are the materials safe for sensitive skin?",
        a: "Yes. Fabrics are selected carefully to provide a soft feel and minimize irritation for most skin types.",
      },
      {
        q: "Will the bra lose shape after washing?",
        a: "With proper care and gentle washing, Ikna bras are designed to maintain their shape and elasticity over time.",
      },
      {
        q: "Are your bras lightweight?",
        a: "Yes. The designs focus on lightweight comfort without compromising support.",
      },
      {
        q: "Do the bras offer breathable comfort in hot weather?",
        a: "Yes. Breathable materials help improve airflow and reduce discomfort during warmer conditions.",
      },
      {
        q: "Can I wear these bras under white or light-colored clothing?",
        a: "Nude and seamless options are ideal for wearing under white or light-colored outfits.",
      },
    ],
  },
  {
    id: "orders-shipping",
    category: "Orders & Shipping",
    questions: [
      {
        q: "How long does shipping take?",
        a: "Delivery timelines may vary based on location, but orders are usually processed and shipped within a few business days.",
      },
      {
        q: "Do you offer nationwide delivery?",
        a: "Yes. Ikna delivers across multiple locations to ensure customers can shop conveniently online.",
      },
      {
        q: "Will I receive order tracking details?",
        a: "Yes. Tracking information will be shared once your order has been dispatched.",
      },
      {
        q: "Can I change my shipping address after placing an order?",
        a: "Address changes may be possible before the order is shipped. Customers should contact support as early as possible.",
      },
      {
        q: "What payment methods are accepted?",
        a: "Ikna supports secure online payment options including cards, UPI, net banking, and other available payment gateways.",
      },
      {
        q: "Is Cash on Delivery available?",
        a: "Availability of Cash on Delivery depends on the delivery location and order eligibility.",
      },
    ],
  },
  {
    id: "returns-exchanges",
    category: "Returns, Exchanges & Hygiene",
    questions: [
      {
        q: "Do you offer returns or refunds?",
        a: "Due to hygiene and intimate wear safety standards, Ikna does not offer returns or refunds on bra products.",
      },
      {
        q: "Why are returns not accepted?",
        a: "Bras are intimate wear products, and maintaining hygiene and product safety for all customers is a top priority.",
      },
      {
        q: "What if I receive a damaged or incorrect product?",
        a: "Customers should contact support immediately with order details and product images for assistance.",
      },
      {
        q: "Can I exchange a product for another size?",
        a: "Exchange eligibility depends on the condition and issue reported. Customers are encouraged to review the size guide carefully before ordering.",
      },
    ],
  },
  {
    id: "care-instructions",
    category: "Care Instructions",
    questions: [
      {
        q: "How should I wash my Ikna bras?",
        a: "Hand washing with mild detergent is recommended to maintain fabric softness, elasticity, and shape.",
      },
      {
        q: "Can I machine wash the bras?",
        a: "Gentle machine washing inside a laundry bag may be possible for certain styles, but hand washing is preferred.",
      },
      {
        q: "Should I tumble dry the bras?",
        a: "Air drying is recommended to preserve elasticity and fabric quality.",
      },
      {
        q: "How can I make my bras last longer?",
        a: "Avoid harsh detergents, excessive stretching, and high heat exposure while washing or drying.",
      },
    ],
  },
  {
    id: "brand-support",
    category: "Brand & Customer Support",
    questions: [
      {
        q: "What makes Ikna different from other lingerie brands?",
        a: "Ikna focuses on combining comfort, confidence, elegance, and everyday practicality through thoughtfully designed bras.",
      },
      {
        q: "How can I contact customer support?",
        a: "Customers can reach out through the contact details provided on the website for assistance with orders, sizing, or general inquiries.",
      },
      {
        q: "Do you launch new collections regularly?",
        a: "Yes. Ikna continuously explores modern styles, comfort innovations, and customer-inspired designs.",
      },
      {
        q: "Are your products designed for all body types?",
        a: "Ikna aims to create inclusive designs that support comfort and confidence across different body shapes and sizes.",
      },
    ],
  },
];

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState(faqData[0].id);
  const [openQuestion, setOpenQuestion] = useState<number | null>(0); // Default first question open

  const currentCategory = faqData.find((cat) => cat.id === activeTab) || faqData[0];

  return (
    <div className="min-h-screen bg-[#FAF6F8] text-[#2D2D2D] font-sans antialiased flex flex-col">
      {/* TOP ANNOUNCEMENT BAR */}
      <Header />

      {/* TITLE HEAD */}
      <div className="text-center pt-12 pb-6 px-4">
        <h1 className="text-3xl md:text-4xl font-serif font-normal text-[#500b3e] mb-2">
          Help & Support
        </h1>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Have a question? Select a topic below to explore answers instantly.
        </p>
      </div>

      {/* TWO COLUMN / DROPDOWN NAVIGATION LAYOUT */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 pb-20 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        
        {/* RESPONSIVE TOPIC MENU */}
        <aside className="w-full md:w-64 bg-white rounded-2xl p-0 md:p-4 lg:p-4 shadow-sm border border-gray-100 md:sticky md:top-24">
          <p className="hidden md:block text-[10px] font-bold tracking-widest uppercase text-gray-400 px-3 mb-3">
            Browse Topics
          </p>

          {/* 1. MOBILE VIEW ONLY: DROPDOWN SELECT MENU */}
          <div className="block md:hidden relative">
            <label htmlFor="topic-select" className="sr-only">Select Topic</label>
            <select
              id="topic-select"
              value={activeTab}
              onChange={(e) => {
                setActiveTab(e.target.value);
                setOpenQuestion(0); // Reset accordion index back to first question on tab swap
              }}
              className="w-full bg-[#FAF6F8] text-[#6b0f52] font-semibold text-xs tracking-wider uppercase py-3.5 pl-4 pr-10 rounded-xl border border-pink-100 appearance-none focus:outline-none focus:ring-2 focus:ring-[#6b0f52]"
            >
              {faqData.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.category}
                </option>
              ))}
            </select>
            {/* Custom arrow decoration for mobile select overlay */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#6b0f52]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>

          {/* 2. DESKTOP VIEW ONLY: DRAWER/SIDEBAR LIST MENU */}
          <nav className="hidden md:flex flex-col space-y-1">
            {faqData.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setOpenQuestion(0);
                  }}
                  className={`text-left w-full px-4 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-150 ${
                    isSelected
                      ? "bg-[#6b0f52] text-white shadow-sm"
                      : "text-gray-600 hover:bg-pink-50/50 hover:text-[#6b0f52]"
                  }`}
                >
                  {tab.category}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* RIGHT MAIN CONTAINER: FAQ ACCORDIONS WINDOW */}
        <section className="flex-1 w-full bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 min-h-[350px]">
          <h2 className="text-xl font-serif text-[#500b3e] border-b border-pink-100 pb-4 mb-6 flex items-center justify-between">
            <span>{currentCategory.category}</span>
            <span className="text-xs font-sans font-medium text-gray-400 bg-[#FAF6F8] px-2.5 py-1 rounded-full">
              {currentCategory.questions.length} Questions
            </span>
          </h2>

          <div className="divide-y divide-gray-100">
            {currentCategory.questions.map((item, idx) => {
              const isOpen = openQuestion === idx;
              return (
                <div key={idx} className="py-4 first:pt-0 last:pb-0">
                  <button
                    className="w-full flex justify-between items-center text-left font-medium text-gray-800 hover:text-[#6b0f52] transition focus:outline-none py-2"
                    onClick={() => setOpenQuestion(isOpen ? null : idx)}
                  >
                    <span className="text-base pr-4 font-sans text-gray-900">{item.q}</span>
                    <span className="text-[#6b0f52] text-xl font-light transition-transform duration-200">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? "max-h-60 opacity-100 mt-2" : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="text-gray-600 text-sm leading-relaxed bg-[#FAF6F8] p-4 rounded-xl border border-pink-50/20">
                      {item.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* FOOTER SECTION */}
      <Footer />
    </div>
  );
}