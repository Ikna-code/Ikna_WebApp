import type { ReactNode } from 'react';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF3F5] text-[#321327] flex flex-col">
      <Header />
      <main className="flex-grow pt-24 md:pt-28 px-4 md:px-8 pb-10">{children}</main>
      <Footer />
    </div>
  );
}
