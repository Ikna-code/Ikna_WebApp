'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { 
  Settings, Package, MapPin, Heart,
  Loader2, ChevronRight, LayoutGrid
} from 'lucide-react';
import AuthGuard from './AuthGuard';
import { getUser } from '@/backend/actions/user';
import OrdersPage from '@/app/account/orders/page';
import WishlistPage from '@/app/account/wishlist/page';
import AddressPage from '@/app/account/address/page';
import PaymentMethodsPage from '@/app/account/payments/page';
import UserSettings from '@/app/account/settings/page';
import { useStore } from '@/store/useStore';
import { getMyFitQuizResults } from '@/backend/actions/quiz';

// 1. Define your component/section views
const DashboardView = ({ dbUser, quizResults }: { dbUser: any; quizResults: any[] }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
    <section className="bg-white p-8 border border-[#840d5c]/5 shadow-sm rounded-3xl col-span-1 md:col-span-2">
      <h2 className="text-xs font-bold tracking-[0.2em] text-[#321327] uppercase mb-6 pb-2 border-b border-[#FAF3F5]">
        Most Recent Order
      </h2>
      {dbUser?.orders?.length > 0 ? (
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-[11px] font-bold text-[#321327]">Order #{dbUser.orders[0].id.slice(-6).toUpperCase()}</p>
            <p className="text-[11px] text-[#321327]/60 uppercase tracking-wider mt-1">
              Status: {dbUser.orders[0].status} • {new Date(dbUser.orders[0].createdAt).toLocaleDateString()}
            </p>
          </div>
          <Link href={`/account/orders/${dbUser.orders[0].id}`} className="text-[10px] font-bold text-[#840d5c] underline underline-offset-4 tracking-[0.1em]">
            VIEW DETAILS
          </Link>
        </div>
      ) : (
        <p className="text-[10px] text-[#321327]/40 tracking-widest italic">No orders in the last 7 days.</p>
      )}
    </section>

    <section className="bg-[#321327] p-8 text-[#F9F3F5] text-center relative overflow-hidden rounded-3xl col-span-1">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#840d5c]/10 rounded-full -mr-16 -mt-16" />
      <h3 className="text-sm tracking-[0.2em] font-light mb-4 relative z-10">WANT A PERFECT FIT?</h3>
      <p className="text-[10px] tracking-[0.1em] opacity-80 mb-6 leading-relaxed relative z-10">
        Your measurement profile helps us curate the best styles for your body type.
      </p>
      <Link 
        href="/fit-finder" 
        className="inline-flex items-center gap-2 bg-[#F9F3F5] text-[#321327] px-8 py-3 text-[10px] font-bold tracking-[0.2em] hover:bg-[#840d5c] hover:text-white transition-all relative z-10 rounded-full"
      >
        UPDATE FIT PROFILE
        <ChevronRight size={14} />
      </Link>
    </section>
    </div>

    <section className="bg-white p-8 border border-[#840d5c]/5 shadow-sm rounded-3xl">
      <h2 className="text-xs font-bold tracking-[0.2em] text-[#321327] uppercase mb-6 pb-2 border-b border-[#FAF3F5]">
        Fit Quiz Results
      </h2>

      {quizResults.length > 0 ? (
        <div className="space-y-3">
          {quizResults.map((result: any) => (
            <div key={result.id} className="rounded-2xl border border-[#840d5c]/10 bg-[#fff8fb] px-4 py-3">
              <p className="text-[11px] font-bold text-[#321327] uppercase tracking-wide">{result.recommendationName}</p>
              <p className="text-[11px] text-[#321327]/70 mt-1">{result.recommendationDesc}</p>
              <p className="text-[10px] text-[#840d5c] mt-2 uppercase tracking-wider">
                Outfit: {result.outfit} • Comfort: {result.comfort} • Occasion: {result.occasion}
              </p>
              <p className="text-[10px] text-[#321327]/50 mt-1">
                Saved on {new Date(result.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-[#321327]/40 tracking-widest italic">No quiz results saved yet.</p>
      )}
    </section>
  </div>
);

const SettingsView = ({ dbUser , refetch}: { dbUser: any, refetch: () => void }) => (
  <div className="bg-white p-4  border border-[#840d5c]/5 shadow-sm rounded-3xl text-center">
    <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#321327] mb-4">Settings</h3>
    <p className="text-[10px] text-[#321327]/60 tracking-widest uppercase mb-8">Adjust account preferences and notifications.</p>
    <UserSettings dbUser={dbUser} onUpdate={refetch} />
  </div>
);

const UserProfile = () => {
  const [dbUser, setDbUser] = useState<any>(null);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const orders = useStore((state) => state.orders);
  const wishlistItems = useStore((state) => state.wishlist);
  
  // Hydration-safe Tab State
  const [activeStep, setActiveStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    const node = scrollRef.current;
    if (!node) return;
    setIsDragging(true);
    setStartX(e.pageX - node.offsetLeft);
    setScrollLeft(node.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!isDragging) return;
    const node = scrollRef.current;
    if (!node) return;
    e.preventDefault();
    const x = e.pageX - node.offsetLeft;
    const walk = (x - startX) * 1.5;
    node.scrollLeft = scrollLeft - walk;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    const node = scrollRef.current;
    if (!node) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - node.offsetLeft);
    setScrollLeft(node.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (!isDragging) return;
    const node = scrollRef.current;
    if (!node) return;
    const x = e.touches[0].pageX - node.offsetLeft;
    const walk = (x - startX) * 1.5;
    node.scrollLeft = scrollLeft - walk;
  };

    async function fetchProfile() {
      try {
        const [response, quizResponse] = await Promise.all([
          getUser(),
          getMyFitQuizResults(5),
        ]);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response;
        setDbUser(data.user);
        setQuizResults(Array.isArray(quizResponse?.results) ? quizResponse.results : []);
      } catch (error) {
        console.error("Error fetching profile:", error);
        setQuizResults([]);
      } finally {
        setFetchingProfile(false);
      }
    }
  useEffect(() => {
    setMounted(true);

    fetchProfile();
  }, []);

  const menuItems = [
    { label: 'DASHBOARD', icon: <LayoutGrid size={18} />, id: 1, href: '/account' },
    { label: 'ORDERS', icon: <Package size={18} />, href: '/account/orders', count: orders.length, id: 2 },
    { label: 'WISHLIST', icon: <Heart size={18} />, href: '/account/wishlist', count: wishlistItems.length, id: 3 },
    { label: 'ADDRESS HUB', icon: <MapPin size={18} />, href: '/account/address', id: 4 },
    // { label: 'PAYMENTS', icon: <CreditCard size={18} />, href: '/account/payments', id: 5 },
    { label: 'SETTINGS', icon: <Settings size={18} />, href: '/account/settings', id: 6 },
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F9F3F5] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#840d5c]" />
      </div>
    );
  }

  const renderWorkspaceContent = () => {
    switch (activeStep) {
      case 1:
        return <DashboardView dbUser={dbUser} quizResults={quizResults} />;
      case 2:
        return <OrdersPage />;
      case 3:
        return <WishlistPage />;
      case 4:
        return <AddressPage />;
      case 5:
        return <PaymentMethodsPage />;
      case 6:
        return <SettingsView dbUser={dbUser} refetch={()=>fetchProfile()} />;
      default:
        return null;
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F9F3F5] py-4 sm:py-6 px-3 sm:px-4 md:px-6 lg:px-8 pb-24 md:pb-16 overflow-x-hidden">
        <div className="max-w-6xl mx-auto w-full">
          {fetchingProfile ? (
            <div className="flex h-64 sm:h-96 items-center justify-center">
              <Loader2 className="animate-spin text-[#840d5c]" />
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {/* NAVIGATION BAR */}
              <nav
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                className="flex flex-row bg-white/95 backdrop-blur-md p-2 md:p-3 border border-[#321327]/10 rounded-2xl md:rounded-full shadow-md items-center w-full gap-2 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none scroll-smooth"
              >
                {menuItems.map((item) => {
                  const isActive = activeStep === item.id;
                  const shortLabel = item.label.split(' ')[0];
                  return (
                    <button
                      key={item.label}
                      onClick={() => setActiveStep(item.id)}
                      aria-label={item.label}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 py-2.5 sm:p-3.5 rounded-xl md:rounded-full transition-all duration-300 shrink-0 min-w-16 sm:min-w-11 whitespace-nowrap ${
                        isActive
                          ? 'bg-gradient-to-br from-[#840d5c] to-[#321327] text-[#F9F3F5] shadow-lg'
                          : 'text-[#840d5c] hover:bg-white/80'
                      }`}
                      title={item.label}
                    >
                      <span className={`relative flex items-center justify-center ${isActive ? 'text-[#F9F3F5]' : 'text-[#840d5c]'}`}>
                        {item.icon}
                        {item.count !== undefined && (
                          <span
                            className={`absolute -right-2.5 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none sm:hidden ${
                              isActive ? 'bg-[#F9F3F5] text-[#321327]' : 'bg-[#840d5c] text-white'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </span>

                      <span className="text-[9px] font-bold tracking-wide uppercase sm:hidden">
                        {shortLabel}
                      </span>

                      <span className="hidden sm:inline text-[10px] font-bold tracking-wider uppercase">
                        {item.label}
                      </span>

                      {item.count !== undefined && (
                        <span className="hidden sm:inline text-[10px] opacity-70 font-mono">
                          ({item.count})
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* WORKSPACE CONTENT */}
              <main className="mt-3 sm:mt-4 w-full">
                {renderWorkspaceContent()}
              </main>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default UserProfile;