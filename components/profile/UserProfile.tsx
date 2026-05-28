'use client';
import React, { useEffect, useState ,useRef} from 'react';
import Link from 'next/link';
import { 
  Settings, Package, MapPin, LogOut, Heart, 
  CreditCard, Loader2, ChevronRight, LayoutGrid 
} from 'lucide-react';
import { createClient } from '@/backend/lib/supabaseClient';
import AuthGuard from './AuthGuard';
import { getUser } from '@/backend/actions/user';
import OrdersPage from '@/app/account/orders/page';
import WishlistPage from '@/app/account/wishlist/page';
import AddressPage from '@/app/account/address/page';
import PaymentMethodsPage from '@/app/account/payments/page';
import UserSettings from '@/app/account/settings/page';

// 1. Define your component/section views
const DashboardView = ({ dbUser }: { dbUser: any }) => (
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
        <p className="text-[10px] text-[#321327]/40 tracking-widest italic">No orders placed yet.</p>
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
);

const SettingsView = ({ dbUser , refetch}: { dbUser: any, refetch: () => void }) => (
  <div className="bg-white p-4  border border-[#840d5c]/5 shadow-sm rounded-3xl text-center">
    <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#321327] mb-4">Settings</h3>
    <p className="text-[10px] text-[#321327]/60 tracking-widest uppercase mb-8">Adjust account preferences and notifications.</p>
    <UserSettings dbUser={dbUser} onUpdate={refetch} />
  </div>
);

const UserProfile = () => {
  const supabase = createClient();
  const [dbUser, setDbUser] = useState<any>(null);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  
  // Hydration-safe Tab State
  const [activeStep, setActiveStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef(null);
const [isDragging, setIsDragging] = useState(false);
const [startX, setStartX] = useState(0);
const [scrollLeft, setScrollLeft] = useState(0);

// 1. PLACE A LOG HERE: To check if the component even mounts inside AuthGuard
// SAFE LOGGER: This will now ONLY log in your browser console, never the server terminal
  if (typeof window !== 'undefined') {
    console.log("Browser Render -> Mounted State:", mounted);
  }
  
  const handleMouseDown = (e) => {
  setIsDragging(true);
  setStartX(e.pageX - scrollRef.current.offsetLeft);
  setScrollLeft(scrollRef.current.scrollLeft);
};

const handleMouseLeave = () => setIsDragging(false);
const handleMouseUp = () => setIsDragging(false);

const handleMouseMove = (e) => {
  if (!isDragging) return;
  e.preventDefault();
  const x = e.pageX - scrollRef.current.offsetLeft;
  const walk = (x - startX) * 2; // Multiply for faster scroll speed
  scrollRef.current.scrollLeft = scrollLeft - walk;
};

    async function fetchProfile() {
      try {
        const response = await getUser();
        console.log("Profile response:", response);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response;
        console.log("Fetched user data:", data);
        setDbUser(data.user);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setFetchingProfile(false);
      }
    }
  useEffect(() => {
// Test 1: Bypasses standard log filters
  console.info("🚨 HOOK TRIGGERED: useEffect is executing!");
  
  // Test 2: Forces the browser to halt and show a popup (Impossible to miss)
    setMounted(true);

    fetchProfile();
  }, []);

  // Corrected missing/renamed method handler
  const handleSignOutHandler = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; 
  };

  const menuItems = [
    { label: 'DASHBOARD', icon: <LayoutGrid size={18} />, id: 1, href: '/account' },
    { label: 'ORDERS', icon: <Package size={18} />, href: '/account/orders', count: dbUser?._count?.orders, id: 2 },
    { label: 'WISHLIST', icon: <Heart size={18} />, href: '/account/wishlist', count: dbUser?._count?.wishlistItems, id: 3 },
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
        return <DashboardView dbUser={dbUser} />;
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
      <div className="min-h-screen bg-[#F9F3F5] py-6 px-4 md:px-6 lg:px-8 pb-36 md:pb-16 overflow-x-hidden">
        <div className="max-w-6xl mx-auto w-full">
          {fetchingProfile ? (
            <div className="flex h-96 items-center justify-center">
              <Loader2 className="animate-spin text-[#840d5c]" />
            </div>
          ) : (
            <div className="flex flex-col gap-0 ">
              {/* PROFILE HEADER */}
              {/* <div className="flex flex-col md:flex-row items-center md:items-end justify-between border-b border-[#840d5c]/10 pb-6 gap-6">
                <div className="flex items-center gap-4 text-center md:text-left flex-wrap justify-center md:justify-start w-full md:w-auto">
                  <div className="w-12 h-12 rounded-full bg-[#840d5c]/10 flex items-center justify-center text-[#840d5c] font-serif font-bold text-lg flex-shrink-0">
                    {dbUser?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-light tracking-[0.05em] text-[#832763] uppercase leading-tight">
                      <span className="text-black">Welcome,</span> {dbUser?.email?.split('@')[0] || 'User'}
                    </h1>
                    <p className="text-[10px] tracking-[0.15em] text-[#321327]/60 mt-1 uppercase font-medium">
                      Active Account • {dbUser?._count?.orders || 0} Total Orders
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={handleSignOutHandler}
                  className="flex items-center justify-center gap-2 text-[9px] font-bold tracking-[0.2em] text-[#840d5c] hover:bg-[#840d5c] hover:text-white transition-all uppercase border border-[#840d5c] px-6 py-2.5 rounded-full w-full md:w-auto"
                >
                  <LogOut size={13} />
                  Sign Out
                </button>
              </div> */}

              {/* NAVIGATION BAR - EXPANDED TO FULL WIDTH */}
<nav ref={scrollRef}
  onMouseDown={handleMouseDown}
  onMouseLeave={handleMouseLeave}
  onMouseUp={handleMouseUp}
  onMouseMove={handleMouseMove}
  className="flex flex-row bg-white/95 backdrop-blur-md p-2 md:p-3 border border-[#321327]/10 rounded-2xl md:rounded-full shadow-md items-center justify-between w-full gap-1 md:gap-4 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none scroll-smooth">
  {menuItems.map((item) => {
    const isActive = activeStep === item.id;
    return (
      <button
        key={item.label}
        onClick={() => setActiveStep(item.id)}
        className={`flex items-center justify-center p-2.5 sm:p-3.5 rounded-xl md:rounded-full transition-all duration-300 flex-1 md:flex-none min-w-[44px] whitespace-nowrap ${
          isActive 
            ? 'bg-gradient-to-br from-[#840d5c] to-[#321327] text-[#F9F3F5] shadow-lg' 
            : 'text-[#840d5c] hover:bg-white/80'
        }`}
        title={item.label}
      >
        <span className={`flex items-center justify-center ${isActive ? 'text-[#F9F3F5]' : 'text-[#840d5c]'}`}>
          {item.icon}
        </span>
        
        {/* Label: Shown on medium screens and up, or hidden on very small mobile */}
        <span className="hidden md:inline text-[10px] font-bold tracking-wider uppercase ml-2">
          {item.label}
        </span>

        {item.count !== undefined && (
          <span className="hidden md:inline text-[10px] opacity-70 font-mono ml-1">
            ({item.count})
          </span>
        )}
      </button>
    );
  })}
</nav>

              {/* WORKSPACE CONTENT */}
              <main className="mt-4 w-full">
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