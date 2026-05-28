"use client";

import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

// Mock Data matching common e-commerce & IKNA specific features
const faqData = [
  {
    id: "orders-shipping",
    category: "Orders & Shipping",
    questions: [
      {
        q: "How long will it take to receive my order?",
        a: "Orders are typically processed within 24-48 hours. Standard shipping takes 3-5 business days depending on your location in India.",
      },
      {
        q: "How can I track my order?",
        a: "Once your order is shipped, we will send a tracking link to your registered email address and phone number via SMS/WhatsApp.",
      },
    ],
  },
  {
    id: "sizing-fit",
    category: "Sizing & Fit",
    questions: [
      {
        q: "How do I find my perfect bra size?",
        a: "We highly recommend taking our 5-question Interactive Fit Quiz available on our homepage! It takes less than a minute and has a 98% accuracy rate for finding the perfect fit without digging wires.",
      },
      {
        q: "What if the bra I ordered doesn't fit?",
        a: "Don't worry! We offer hassle-free exchanges within 7 days of delivery. Make sure the tags are intact and the product is unworn.",
      },
    ],
  },
  {
    id: "offers-payments",
    category: "Offers & Payments",
    questions: [
      {
        q: "How does the 'Pick any 3 for Rs.999' combo offer work?",
        a: "It's simple! Add any 3 bras from our special combo collection to your cart. The discount will automatically apply at checkout—no coupon code needed.",
      },
      {
        q: "Are my payment details secure?",
        a: "Absolutely. All payments are processed through secure, encrypted third-party payment gateways. IKNA does not store any card or banking information on our servers.",
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
<Header/>

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
        <aside className="w-full md:w-64 bg-white rounded-2xl p-0 md:p-4   lg:p-4 shadow-sm border border-gray-100 md:sticky md:top-24">
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
                      isOpen ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"
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