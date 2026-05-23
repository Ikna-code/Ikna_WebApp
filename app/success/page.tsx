"use client";
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';

const SuccessPage = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="bg-[#FAF3F5] min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow flex items-center justify-center px-4 py-20">
        <div className="max-w-lg w-full bg-white rounded-[3rem] p-12 text-center shadow-xl border border-[#840d5c]/5 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#840d5c]/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 space-y-6">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500 mb-8">
              <CheckCircle2 size={56} strokeWidth={1.5} />
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-serif text-[#321327]">Order Placed!</h1>
              <p className="text-[#321327]/60 text-sm font-medium">
                Thank you for your purchase. Your order has been received and is being processed.
              </p>
            </div>

            {orderId && (
              <div className="bg-[#FAF3F5] py-3 px-6 rounded-2xl inline-block">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#840d5c]/60">
                  Order ID: <span className="text-[#321327] ml-1">{orderId}</span>
                </p>
              </div>
            )}

            <div className="pt-8 flex flex-col gap-4">
              <Link 
                href="/shop" 
                className="w-full bg-[#321327] text-white py-4 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 hover:bg-[#840d5c] transition-all shadow-lg"
              >
                Continue Shopping <ArrowRight size={16} />
              </Link>
              
              <Link 
                href="/orders" 
                className="text-[10px] font-bold uppercase tracking-widest text-[#321327]/40 hover:text-[#840d5c] transition-colors"
              >
                View My Orders
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuccessPage;