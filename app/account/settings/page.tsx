'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  Save, 
  Loader2, 
  CheckCircle2, 
  LogOut, 
  Trash2 
} from 'lucide-react';
import { createClient } from '@/backend/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner'; 
import { updateUserProfile } from '@/backend/actions/user';
import { useStore } from '@/store/useStore';

function getAppBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

// Define a proper interface for your user
interface DbUser {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

const UserSettings = ({ dbUser, onUpdate }: { dbUser: DbUser, onUpdate: () => void }) => {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const resetStoreState = useStore;
  
  // Initialize state with props
  const [formData, setFormData] = useState({
    firstName: dbUser?.firstName || '',
    lastName: dbUser?.lastName || '',
    phone: dbUser?.phone || '',
  });

  // Sync state if dbUser props change (e.g., after a re-fetch)
  useEffect(() => {
    if (dbUser) {
      setFormData({
        firstName: dbUser.firstName || '',
        lastName: dbUser.lastName || '',
        phone: dbUser.phone || '',
      });
    }
  }, [dbUser]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateUserProfile(formData);
      
      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success("Profile updated successfully!");
      onUpdate(); 
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      resetStoreState.setState({
        user: null,
        isAuthInitialized: false,
        cartItems: [],
        isCartInitialized: false,
        cartUserId: null,
        orders: [],
        isOrdersInitialized: false,
        wishlist: [],
        isWishlistInitialized: false,
        addresses: [],
        isAddressesInitialized: false,
      });
      
      toast.success("Signed out successfully");
      
      // Force a hard refresh and redirect to clear all local state/cache
      router.push('/');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!dbUser?.email) return toast.error("Email not found");
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(dbUser.email, {
        redirectTo: `${getAppBaseUrl()}/account/settings?reset=true`,
      });
      if (error) throw error;
      toast.success("Password reset link sent to your email!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm = window.confirm("Are you sure? This will permanently delete your account data.");
    if (!confirm) return;
    toast.info("Account deletion request sent to support.");
  };

  return (
    <div className="max-w-4xl mx-auto pt-24 md:pt-26 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* PERSONAL INFORMATION SECTION */}
      <section className="bg-white rounded-3xl border border-[#840d5c]/10 shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-[#FAF3F5] flex items-center gap-3">
          <div className="p-2 bg-[#F9F3F5] rounded-lg text-[#840d5c]">
            <User size={18} />
          </div>
          <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#321327]">
            Personal Information
          </h3>
        </div>

        <form onSubmit={handleProfileUpdate} className="px-3 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-2">
            
            <div className="relative">
              <input 
                type="text" 
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="peer w-full bg-white border border-[#321327]/20 rounded-xl px-4 py-3.5 text-[13px] text-[#321327] focus:border-[#840d5c] transition-colors outline-none placeholder-transparent"
                placeholder="First Name"
                required
              />
              <label 
                htmlFor="firstName"
                className="absolute left-3 top-3.5 z-10 px-1 bg-white text-[13px] text-[#321327]/50 tracking-wide pointer-events-none transition-all duration-200 origin-[left_top]
                           peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100
                           peer-focus:-translate-y-[22px] peer-focus:scale-[0.75] peer-focus:text-[#840d5c] peer-focus:font-semibold
                           peer-[:not(:placeholder-shown)]:-translate-y-[22px] peer-[:not(:placeholder-shown)]:scale-[0.75] peer-[:not(:placeholder-shown)]:font-semibold"
              >
                First Name
              </label>
            </div>

            <div className="relative">
              <input 
                type="text" 
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="peer w-full bg-white border border-[#321327]/20 rounded-xl px-4 py-3.5 text-[13px] text-[#321327] focus:border-[#840d5c] transition-colors outline-none placeholder-transparent"
                placeholder="Last Name"
                required
              />
              <label 
                htmlFor="lastName"
                className="absolute left-3 top-3.5 z-10 px-1 bg-white text-[13px] text-[#321327]/50 tracking-wide pointer-events-none transition-all duration-200 origin-[left_top]
                           peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100
                           peer-focus:-translate-y-[22px] peer-focus:scale-[0.75] peer-focus:text-[#840d5c] peer-focus:font-semibold
                           peer-[:not(:placeholder-shown)]:-translate-y-[22px] peer-[:not(:placeholder-shown)]:scale-[0.75] peer-[:not(:placeholder-shown)]:font-semibold"
              >
                Last Name
              </label>
            </div>

            <div className="relative md:col-span-2">
              <input 
                type="tel" 
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="peer w-full bg-white border border-[#321327]/20 rounded-xl px-4 py-3.5 text-[13px] text-[#321327] focus:border-[#840d5c] transition-colors outline-none placeholder-transparent"
                placeholder="Phone Number"
              />
              <label 
                htmlFor="phone"
                className="absolute left-3 top-3.5 z-10 px-1 bg-white text-[13px] text-[#321327]/50 tracking-wide pointer-events-none transition-all duration-200 origin-[left_top]
                           peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100
                           peer-focus:-translate-y-[22px] peer-focus:scale-[0.75] peer-focus:text-[#840d5c] peer-focus:font-semibold
                           peer-[:not(:placeholder-shown)]:-translate-y-[22px] peer-[:not(:placeholder-shown)]:scale-[0.75] peer-[:not(:placeholder-shown)]:font-semibold"
              >
                Phone Number
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-start">
            <button 
              type="submit"
              disabled={loading}
              suppressHydrationWarning
              className="bg-[#321327] text-white px-8 py-3 rounded-full text-[10px] font-bold tracking-[0.15em] hover:bg-[#840d5c] transition-all flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              SAVE CHANGES
            </button>
          </div>
        </form>
      </section>

      {/* SECURITY SECTION */}
      <section className="bg-white rounded-3xl border border-[#840d5c]/10 shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-[#FAF3F5] flex items-center gap-3">
          <div className="p-2 bg-[#F9F3F5] rounded-lg text-[#840d5c]">
            <Shield size={18} />
          </div>
          <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#321327]">
            Security & Login
          </h3>
        </div>

        <div className="p-3 space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#FAF9FA] border border-[#321327]/5 rounded-2xl">
            <div className="space-y-0.5">
              <p className="text-[9px] font-bold text-[#321327]/40 uppercase tracking-widest">Email Address</p>
              <p className="text-[11px] font-medium text-[#321327]">{dbUser?.email || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle2 size={12} />
              <span className="text-[9px] font-bold tracking-tighter uppercase">Verified</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={handlePasswordReset}
              disabled={loading}
              suppressHydrationWarning
              className="w-full border border-[#321327]/10 py-3.5 rounded-2xl text-[10px] font-bold text-[#321327] hover:bg-[#FAF9FA] transition-all uppercase tracking-widest disabled:opacity-50"
            >
              Change Password
            </button>
            <button 
              disabled
              className="w-full border border-[#321327]/10 py-3.5 rounded-2xl text-[10px] font-bold text-[#321327] transition-all uppercase tracking-widest opacity-50 cursor-not-allowed"
            >
              Two-Factor Auth
            </button>
          </div>
        </div>
      </section>

      {/* DANGER ZONE / SIGN OUT */}
      <div className="space-y-3">
        <button 
          onClick={handleSignOut}
          disabled={loading}
          suppressHydrationWarning
          className="w-full flex items-center justify-center gap-2 bg-white border border-[#321327]/10 py-4 rounded-2xl text-[10px] font-bold text-[#321327] hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all uppercase tracking-[0.2em] shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          Sign Out
        </button>

        <button 
          onClick={handleDeleteAccount}
          className="w-full flex items-center justify-center gap-2 text-center py-2 text-[9px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-[0.2em]"
        >
          <Trash2 size={12} />
          Delete Account Permanently
        </button>
      </div>
    </div>
  );
};

export default UserSettings;