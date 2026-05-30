import type { ReactNode } from 'react';
import Sidebar from './Analytics/Sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    /* 
      CRITICAL HARDENING: 
      Changed 'min-h-screen' to 'h-screen' and forced 'overflow-hidden' + 'overscroll-none' globally.
      This locks the browser layout container in place on both mobile and desktop.
    */
    <div className="h-screen w-screen bg-[#F7F4F0] text-[#2B1B24] antialiased flex overflow-hidden overscroll-none isolate">
      
      <Sidebar />
      
      {/* 
        CRITICAL SCROLL ISOLATION:
        1. Changed 'overflow-visible' to 'overflow-y-auto' for ALL screen sizes. 
           Mobile scrolling now happens inside this container, completely separating it from the root page view.
        2. Added 'touch-pan-y' to let mobile users scroll vertically seamlessly, but it explicitly tells 
           the browser's engine to ignore and block dual-finger viewport resizing (pinch-to-zoom) over this area.
        3. Added 'overscroll-contain' to eliminate elastic bounce handling.
      */}
      <main 
        className="min-w-0 flex-1 h-full overflow-y-auto overflow-x-hidden px-4 pb-6 pt-20 sm:px-6 sm:pb-8 sm:pt-24 lg:px-8 lg:pb-10 lg:pt-8 overscroll-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }} // Smooth fluid momentum scrolling for iOS safari
      >
        <div className="mx-auto w-full max-w-400">{children}</div>
      </main>

    </div>
  );
}