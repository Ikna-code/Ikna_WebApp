"use client";
import React from 'react';
import Header from '@/components/layout/Header';
import { CreditCard, ShieldCheck } from 'lucide-react';

const PaymentMethodsPage = () => {
  return (
    <div className="bg-[#FAF3F5] min-h-screen">
      {/* <Header /> */}
      <main className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-serif text-[#321327] mb-8">Payment Methods</h1>
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-[#321327] rounded flex items-center justify-center text-white text-[8px] font-bold italic">VISA</div>
              <div>
                <p className="font-bold text-[#321327]">•••• •••• •••• 4242</p>
                <p className="text-[10px] text-[#321327]/40 uppercase tracking-widest">Expires 12/26</p>
              </div>
            </div>
            <button className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Remove</button>
          </div>
          
          <div className="flex items-center justify-center gap-2 opacity-40 py-8">
            <ShieldCheck size={16} className="text-[#321327]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#321327]">Secure Razorpay Encryption</span>
          </div>
        </div>
      </main>
    </div>
  );
};
export default PaymentMethodsPage;