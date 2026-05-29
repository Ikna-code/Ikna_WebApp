import type { ReactNode } from 'react';
import Sidebar from './Analytics/Sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F4F0] text-[#2B1B24] antialiased lg:flex lg:h-screen lg:overflow-hidden">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-visible px-4 pb-6 pt-20 sm:px-6 sm:pb-8 sm:pt-24 lg:h-screen lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:pb-10 lg:pt-8">
        <div className="mx-auto w-full max-w-400">{children}</div>
      </main>
    </div>
  );
}