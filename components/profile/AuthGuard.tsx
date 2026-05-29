'use client';
import React, { useEffect, useState } from 'react';
import { createClient } from '@/backend/lib/supabaseClient';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { sendAuthEventNotification } from '@/backend/actions/auth';

function getAppBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

function buildRedirectUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getAppBaseUrl()}${normalized}`;
}

function getFriendlyAuthErrorMessage(error: any) {
  const errorCode = String(error?.code || '').toLowerCase();
  let message = String(error?.message || '').toLowerCase();

  // Some providers return JSON-like strings: {"code":"invalid_credentials","message":"..."}
  if (message.startsWith('{') && message.endsWith('}')) {
    try {
      const parsed = JSON.parse(message);
      message = String(parsed?.message || message).toLowerCase();
      if (!errorCode && parsed?.code) {
        if (String(parsed.code).toLowerCase() === 'invalid_credentials') {
          return 'Incorrect password';
        }
      }
    } catch {
      // Ignore parse failures and continue with the raw message.
    }
  }

  if (message.includes('user already registered') || message.includes('already exists')) {
    return 'User already exists';
  }

  if (errorCode === 'invalid_credentials') {
    return 'Incorrect password';
  }

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials') ||
    message.includes('invalid password') ||
    message.includes('wrong password')
  ) {
    return 'Incorrect password';
  }

  return error?.message || 'An unexpected error occurred';
}

async function sendAuthEmailOnce(email: string, event: 'signup' | 'login') {
  if (!email) return;

  const cacheKey = `ikna_auth_email_${event}_${email}`;
  const now = Date.now();
  const recent = Number(sessionStorage.getItem(cacheKey) || 0);

  if (recent && now - recent < 2 * 60 * 1000) {
    return;
  }

  sessionStorage.setItem(cacheKey, String(now));
  await sendAuthEventNotification(email, event);
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Initial session:", session);
      setSession(session);
      setLoading(false);
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state changed:", currentSession);
      setSession(currentSession);
      setLoading(false);

      if (event === 'SIGNED_IN' && currentSession?.user?.email) {
        await sendAuthEmailOnce(currentSession.user.email, 'login');
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [supabase.auth]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: buildRedirectUrl('/'),
          },
        });

        if (error) {
          setAuthError(getFriendlyAuthErrorMessage(error));
          return;
        }

        await sendAuthEmailOnce(email, 'signup');

        if (!data.session) {
          alert('Verification email sent. Please verify your email before logging in.');
          setAuthMode('login');
          return;
        }

        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setAuthError(getFriendlyAuthErrorMessage(error));
        return;
      }

      const emailConfirmedAt = data?.user?.email_confirmed_at;
      if (!emailConfirmedAt) {
        await supabase.auth.signOut();
        setAuthError('Please verify your email before logging in.');
        return;
      }

      await sendAuthEmailOnce(email, 'login');
    } catch (err: any) {
      setAuthError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildRedirectUrl('/'),
        },
      });
      
      if (error) {
        setAuthError(getFriendlyAuthErrorMessage(error));
      }
    } catch (err: any) {
      setAuthError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F9F3F5]">
        <Loader2 className="animate-spin text-[#840d5c]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className=" bg-[#F9F3F5] flex items-center justify-center px-4 py-4">
<div className="max-w-md w-full bg-white p-4 sm:p-6 border border-[#840d5c]/10 shadow-sm flex flex-col justify-between h-full">
  {/* Header Section - Reduced bottom margin on mobile */}
  <div className="text-center mb-3 sm:mb-5">
    {/* Hidden icon on extra small screens to save massive vertical space */}
    <div className="hidden xs:inline-flex p-3 sm:p-4 bg-[#F9F3F5] rounded-full text-[#840d5c] mb-2 sm:mb-4">
      <Lock size={24} />
    </div>
    <h2 className="text-lg sm:text-xl font-light tracking-[0.2em] text-[#321327] uppercase mt-2">
      {authMode === 'login' ? 'Welcome Back' : 'Join the Club'}
    </h2>
  </div>

  {/* Form Section - Tightened input spacing */}
  <form className="space-y-3 sm:space-y-5" onSubmit={handleAuth}>
    <div className="relative">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#321327]/40" size={16} />
      <input 
        type="email" 
        placeholder="EMAIL ADDRESS"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full bg-[#F9F3F5] border-none py-3 sm:py-4 pl-10 pr-4 text-[10px] tracking-[0.1em] outline-none"
        required 
      />
    </div>
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#321327]/40" size={16} />
      <input 
        type="password" 
        placeholder="PASSWORD"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full bg-[#F9F3F5] border-none py-3 sm:py-4 pl-10 pr-4 text-[10px] tracking-[0.1em] outline-none"
        required 
      />
    </div>

    {authError && (
      <p className="text-[10px] font-bold tracking-[0.1em] text-red-600 uppercase">
        {authError}
      </p>
    )}

    <button 
      type="submit" 
      disabled={loading}
      className="w-full bg-[#321327] text-[#F9F3F5] py-3 sm:py-4 text-[10px] font-bold tracking-[0.2em] hover:bg-[#840d5c] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {authMode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'} <ArrowRight size={14} />
    </button>
  </form>

  {/* Google Auth Divider and Button - Tighter vertical margins */}
  <div className="relative my-4 sm:my-6 flex items-center">
    <div className="flex-grow border-t border-[#F9F3F5]"></div>
    <span className="mx-3 text-[9px] tracking-[0.1em] text-[#321327]/40 uppercase">OR</span>
    <div className="flex-grow border-t border-[#F9F3F5]"></div>
  </div>

  <button
    type="button"
    onClick={handleGoogleSignIn}
    disabled={loading}
    className="w-full bg-white border border-[#321327]/20 text-[#321327] py-3 sm:py-4 text-[10px] font-bold tracking-[0.2em] hover:bg-[#F9F3F5] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
  >
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.05-3.71 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4375" />
    </svg>
    {authMode === 'login' ? 'SIGN IN WITH GOOGLE' : 'SIGN UP WITH GOOGLE'}
  </button>

  {/* Footer Link - Tighter padding */}
  <div className="pt-4 sm:pt-6 mt-2 border-t border-[#F9F3F5] text-center">
    <button 
      onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} 
      className="text-[10px] font-bold text-[#840d5c] tracking-[0.2em] underline uppercase"
    >
      {authMode === 'login' ? 'Register Now' : 'Back to Login'}
    </button>
  </div>
</div>
      </div>
    );
  }

  return <>{children}</>;
}