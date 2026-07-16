import type { ReactNode } from 'react';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF3F5] text-[#321327] flex flex-col">
      <Header />
      <main className="flex-grow pt-20 sm:pt-24 md:pt-28 px-3 sm:px-4 md:px-6 lg:px-8 pb-8 sm:pb-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
