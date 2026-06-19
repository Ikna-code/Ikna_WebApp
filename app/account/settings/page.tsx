'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Shield,
  Save,
  Loader2,
  CheckCircle2,
  LogOut,
  Trash2,
  Bell,
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateUserProfile, getCommPrefs, updateCommPrefs, deleteAccount, type CommPrefs } from '@/backend/actions/user';
import { useStore } from '@/store/useStore';

/* ─── types ─────────────────────────────────────────────────────────────── */
interface DbUser {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  // comm prefs come from DB row when getUser includes them
  commOrderUpdates?: boolean;
  commBackInStock?: boolean;
  commNewCollections?: boolean;
  commPromotions?: boolean;
}

interface AuthMeta {
  email: string;
  emailVerified: boolean;
  isGoogleAccount: boolean;
}

/* ─── helpers ────────────────────────────────────────────────────────────── */
function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

const DEFAULT_PREFS: CommPrefs = {
  commOrderUpdates: true,
  commBackInStock: true,
  commNewCollections: true,
  commPromotions: true,
};

/* ─── sub-component: floating label input ────────────────────────────────── */
function FloatingInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  required,
  className,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={label}
        className="peer w-full bg-white border border-[#321327]/20 rounded-xl px-4 py-3.5 text-[13px] text-[#321327] focus:border-[#840d5c] transition-colors outline-none placeholder-transparent"
      />
      <label
        htmlFor={id}
        className="absolute left-3 top-3.5 z-10 px-1 bg-white text-[13px] text-[#321327]/50 tracking-wide pointer-events-none transition-all duration-200 origin-[left_top]
                   peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100
                   peer-focus:-translate-y-[22px] peer-focus:scale-[0.75] peer-focus:text-[#840d5c] peer-focus:font-semibold
                   peer-[:not(:placeholder-shown)]:-translate-y-[22px] peer-[:not(:placeholder-shown)]:scale-[0.75] peer-[:not(:placeholder-shown)]:font-semibold"
      >
        {label}
      </label>
    </div>
  );
}

/* ─── sub-component: section card ────────────────────────────────────────── */
function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-3xl border border-[#840d5c]/10 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#FAF3F5] flex items-center gap-3">
        <div className="p-2 bg-[#F9F3F5] rounded-lg text-[#840d5c]">
          <Icon size={16} />
        </div>
        <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#321327]">
          {title}
        </h3>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

/* ─── sub-component: toggle row ──────────────────────────────────────────── */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = `pref-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between gap-4 py-3 border-b border-[#FAF3F5] last:border-0 cursor-pointer group"
    >
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-[#321327] group-hover:text-[#840d5c] transition-colors">
          {label}
        </p>
        <p className="text-[11px] text-[#321327]/50 mt-0.5">{description}</p>
      </div>
      {/* toggle pill */}
      <div className="relative shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-10 h-5 rounded-full transition-colors duration-200 ${
            checked ? 'bg-[#840d5c]' : 'bg-[#321327]/20'
          }`}
        />
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </label>
  );
}

/* ─── main component ─────────────────────────────────────────────────────── */
const UserSettings = ({ dbUser, onUpdate }: { dbUser: DbUser; onUpdate: () => void }) => {
  const supabase = supabaseBrowser;
  const router = useRouter();
  const resetStoreState = useStore;

  /* profile form */
  const [profileForm, setProfileForm] = useState({
    firstName: dbUser?.firstName ?? '',
    lastName: dbUser?.lastName ?? '',
    phone: dbUser?.phone ?? '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  /* auth meta (provider + verification status) */
  const [authMeta, setAuthMeta] = useState<AuthMeta | null>(null);

  /* password reset */
  const [passwordLoading, setPasswordLoading] = useState(false);

  /* sign-out / delete */
  const [actionLoading, setActionLoading] = useState(false);

  /* comm prefs */
  const [prefs, setPrefs] = useState<CommPrefs>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);

  /* sync profile form when dbUser prop changes */
  useEffect(() => {
    if (!dbUser) return;
    setProfileForm({
      firstName: dbUser.firstName ?? '',
      lastName: dbUser.lastName ?? '',
      phone: dbUser.phone ?? '',
    });
  }, [dbUser]);

  /* load auth metadata */
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted || !user) return;
      const providers: string[] = (user.app_metadata?.providers as string[]) ?? [];
      const isGoogle =
        providers.includes('google') ||
        user.app_metadata?.provider === 'google';
      setAuthMeta({
        email: user.email ?? '',
        emailVerified: Boolean(user.email_confirmed_at),
        isGoogleAccount: isGoogle,
      });
    });
    return () => { mounted = false; };
  }, [supabase]);

  /* load comm prefs */
  useEffect(() => {
    let mounted = true;
    setPrefsLoading(true);
    getCommPrefs().then((res) => {
      if (!mounted) return;
      if (res.ok && res.prefs) setPrefs(res.prefs);
      setPrefsLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  /* handlers */
  const handleProfileUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const result = await updateUserProfile(profileForm);
      if (result?.error) throw new Error(result.error);
      toast.success('Profile updated successfully!');
      onUpdate();
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong');
    } finally {
      setProfileLoading(false);
    }
  }, [profileForm, onUpdate]);

  const handlePasswordReset = useCallback(async () => {
    const email = authMeta?.email ?? dbUser?.email;
    if (!email) return toast.error('Email not found');
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getAppBaseUrl()}/account/settings?reset=true`,
      });
      if (error) throw error;
      toast.success('Password reset link sent to your email!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setPasswordLoading(false);
    }
  }, [authMeta, dbUser, supabase]);

  const handleSignOut = useCallback(async () => {
    setActionLoading(true);
    try {
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
      toast.success('Signed out successfully');
      router.push('/');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  }, [supabase, resetStoreState, router]);

  const handleDeleteAccount = useCallback(async () => {
    const confirmed = window.confirm(
      'Are you sure? This will permanently delete your account data.'
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const result = await deleteAccount();
      if (!result.success) throw new Error(result.error ?? 'Failed to delete account');

      await supabase.auth.signOut({ scope: 'local' });
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

      toast.success('Your account has been deleted.');
      router.push('/');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message ?? 'Could not delete account');
    } finally {
      setActionLoading(false);
    }
  }, [supabase, resetStoreState, router]);

  const handleSavePrefs = useCallback(async () => {
    setPrefsSaving(true);
    try {
      const result = await updateCommPrefs(prefs);
      if (!result.success) throw new Error(result.error ?? 'Failed to save');
      toast.success('Preferences saved!');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not save preferences');
    } finally {
      setPrefsSaving(false);
    }
  }, [prefs]);

  /* ─── render ───────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* PERSONAL INFORMATION */}
      <SectionCard icon={User} title="Personal Information">
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FloatingInput
              id="firstName"
              label="First Name"
              value={profileForm.firstName}
              onChange={(v) => setProfileForm((f) => ({ ...f, firstName: v }))}
              required
            />
            <FloatingInput
              id="lastName"
              label="Last Name"
              value={profileForm.lastName}
              onChange={(v) => setProfileForm((f) => ({ ...f, lastName: v }))}
              required
            />
          </div>
          <FloatingInput
            id="phone"
            label="Phone Number"
            type="tel"
            value={profileForm.phone}
            onChange={(v) => setProfileForm((f) => ({ ...f, phone: v }))}
          />
          <div className="flex justify-start pt-1">
            <button
              type="submit"
              disabled={profileLoading}
              suppressHydrationWarning
              className="bg-[#321327] text-white px-7 py-2.5 rounded-full text-[10px] font-bold tracking-[0.15em] hover:bg-[#840d5c] transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            >
              {profileLoading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              SAVE CHANGES
            </button>
          </div>
        </form>
      </SectionCard>

      {/* SECURITY & LOGIN */}
      <SectionCard icon={Shield} title="Security & Login">
        <div className="space-y-3">

          {/* email + verification */}
          <div className="flex items-center justify-between p-3 bg-[#FAF9FA] border border-[#321327]/5 rounded-2xl gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-[#321327]/40 uppercase tracking-widest">
                Email Address
              </p>
              <p className="text-[12px] font-medium text-[#321327] truncate">
                {authMeta?.email ?? dbUser?.email ?? '—'}
              </p>
            </div>
            {authMeta?.emailVerified ? (
              <span className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-bold uppercase tracking-tighter">
                <CheckCircle2 size={11} /> Verified
              </span>
            ) : (
              <span className="shrink-0 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-bold uppercase tracking-tighter">
                Unverified
              </span>
            )}
          </div>

          {/* Google connection status */}
          <div className="flex items-center justify-between p-3 bg-[#FAF9FA] border border-[#321327]/5 rounded-2xl">
            <div className="flex items-center gap-2.5">
              {/* Google G icon */}
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <div>
                <p className="text-[12px] font-semibold text-[#321327]">Google Account</p>
                <p className="text-[10px] text-[#321327]/50">
                  {authMeta?.isGoogleAccount ? 'Sign-in with Google' : 'Not connected'}
                </p>
              </div>
            </div>
            {authMeta?.isGoogleAccount ? (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-bold uppercase tracking-tighter shrink-0">
                <CheckCircle2 size={11} /> Connected
              </span>
            ) : (
              <span className="px-2.5 py-1 border border-[#321327]/10 text-[#321327]/50 rounded-lg text-[9px] font-bold uppercase tracking-tighter shrink-0">
                Not Connected
              </span>
            )}
          </div>

          {/* Change password — only for email/password accounts */}
          {authMeta && !authMeta.isGoogleAccount && (
            <button
              onClick={handlePasswordReset}
              disabled={passwordLoading}
              suppressHydrationWarning
              className="w-full border border-[#321327]/10 py-3 rounded-2xl text-[10px] font-bold text-[#321327] hover:bg-[#FAF9FA] transition-all uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {passwordLoading && <Loader2 size={12} className="animate-spin" />}
              Change Password
            </button>
          )}
        </div>
      </SectionCard>

      {/* COMMUNICATION PREFERENCES */}
      {/* <SectionCard icon={Bell} title="Communication Preferences">
        {prefsLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={22} className="animate-spin text-[#840d5c]" />
          </div>
        ) : (
          <div className="space-y-0">
            <ToggleRow
              label="Order Updates"
              description="Shipping confirmations, delivery status, and order tracking"
              checked={prefs.commOrderUpdates}
              onChange={(v) => setPrefs((p) => ({ ...p, commOrderUpdates: v }))}
            />
            <ToggleRow
              label="Back In Stock Alerts"
              description="Get notified when a saved item becomes available again"
              checked={prefs.commBackInStock}
              onChange={(v) => setPrefs((p) => ({ ...p, commBackInStock: v }))}
            />
            <ToggleRow
              label="New Collection Notifications"
              description="Be the first to know when a new collection drops"
              checked={prefs.commNewCollections}
              onChange={(v) => setPrefs((p) => ({ ...p, commNewCollections: v }))}
            />
            <ToggleRow
              label="Promotional Offers"
              description="Exclusive discounts, flash sales, and seasonal campaigns"
              checked={prefs.commPromotions}
              onChange={(v) => setPrefs((p) => ({ ...p, commPromotions: v }))}
            />
            <div className="flex justify-start pt-4">
              <button
                onClick={handleSavePrefs}
                disabled={prefsSaving}
                className="bg-[#321327] text-white px-7 py-2.5 rounded-full text-[10px] font-bold tracking-[0.15em] hover:bg-[#840d5c] transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
              >
                {prefsSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                SAVE PREFERENCES
              </button>
            </div>
          </div>
        )}
      </SectionCard> */}

      {/* SIGN OUT + DELETE */}
      <div className="space-y-2.5">
        <button
          onClick={handleSignOut}
          disabled={actionLoading}
          suppressHydrationWarning
          className="w-full flex items-center justify-center gap-2 bg-white border border-[#321327]/10 py-3.5 rounded-2xl text-[10px] font-bold text-[#321327] hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all uppercase tracking-[0.2em] shadow-sm disabled:opacity-50"
        >
          {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
          Sign Out
        </button>
        <button
          onClick={handleDeleteAccount}
          className="w-full flex items-center justify-center gap-2 py-1.5 text-[9px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-[0.2em]"
        >
          <Trash2 size={11} />
          Delete Account Permanently
        </button>
      </div>
    </div>
  );
};

export default UserSettings;