'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/backend/lib/supabaseClient';
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { sendAuthEventNotification } from '@/backend/actions/auth';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const OTP_EMAIL_STORAGE_KEY = 'ikna_signup_otp_email';
const OTP_RESEND_UNTIL_STORAGE_KEY = 'ikna_signup_resend_until';

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

function isRateLimitError(error: any) {
  const status = error?.status ?? error?.code;
  const message = String(error?.message || '').toLowerCase();
  return status === 429 || message.includes('429') || message.includes('rate limit') || message.includes('too many requests');
}

function getFriendlyOtpErrorMessage(error: any, fallback: string) {
  if (isRateLimitError(error)) {
    return 'Too many attempts. Please wait before trying again.';
  }
  return getFriendlyAuthErrorMessage(error) || fallback;
}

function storeOtpEmail(email: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OTP_EMAIL_STORAGE_KEY, email);
  sessionStorage.setItem(OTP_EMAIL_STORAGE_KEY, email);
}

function getStoredOtpEmail() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(OTP_EMAIL_STORAGE_KEY) || sessionStorage.getItem(OTP_EMAIL_STORAGE_KEY) || '';
}

function clearStoredOtpEmail() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OTP_EMAIL_STORAGE_KEY);
  sessionStorage.removeItem(OTP_EMAIL_STORAGE_KEY);
}

function storeResendUntil(until: number) {
  if (typeof window === 'undefined') return;
  const value = String(until);
  localStorage.setItem(OTP_RESEND_UNTIL_STORAGE_KEY, value);
  sessionStorage.setItem(OTP_RESEND_UNTIL_STORAGE_KEY, value);
}

function getStoredResendUntil() {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(OTP_RESEND_UNTIL_STORAGE_KEY) || sessionStorage.getItem(OTP_RESEND_UNTIL_STORAGE_KEY) || '0';
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clearStoredResendUntil() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OTP_RESEND_UNTIL_STORAGE_KEY);
  sessionStorage.removeItem(OTP_RESEND_UNTIL_STORAGE_KEY);
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
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [signupStep, setSignupStep] = useState<'credentials' | 'verification'>('credentials');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());

  const otpCode = otpDigits.join('');
  const resendCountdown = Math.max(0, Math.ceil((resendAvailableAt - nowTs) / 1000));
  const canResendOtp = resendCountdown <= 0 && !isResendingOtp;

  const resetAuthFeedback = () => {
    setAuthError('');
    setAuthMessage('');
  };

  const clearOtpState = () => {
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setSignupStep('credentials');
    setResendAvailableAt(0);
    clearStoredResendUntil();
    clearStoredOtpEmail();
  };

  const startResendCooldown = () => {
    const until = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    setResendAvailableAt(until);
    storeResendUntil(until);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const storedEmail = getStoredOtpEmail();
      const storedResendUntil = getStoredResendUntil();

      if (storedEmail) {
        setEmail(storedEmail);
        setAuthMode('signup');
        setSignupStep('verification');
        if (storedResendUntil > Date.now()) {
          setResendAvailableAt(storedResendUntil);
        } else {
          clearStoredResendUntil();
        }
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setSession(null);
        setIsInitializing(false);
        return;
      }

      // Important: getSession can return stale local session data.
      // getUser validates the token with Supabase Auth and returns null/error for deleted users.
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        await supabase.auth.signOut();
        setSession(null);
      } else {
        setSession(session);
      }
      setIsInitializing(false);
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!currentSession) {
        setSession(null);
        setIsInitializing(false);
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        await supabase.auth.signOut();
        setSession(null);
      } else {
        setSession(currentSession);
      }
      setIsInitializing(false);

      if (event === 'SIGNED_IN' && currentSession?.user?.email) {
        await sendAuthEmailOnce(currentSession.user.email, 'login');
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleOtpInputChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    const next = [...otpDigits];

    if (!clean) {
      next[index] = '';
      setOtpDigits(next);
      return;
    }

    const chars = clean.slice(0, OTP_LENGTH).split('');
    for (let i = 0; i < chars.length && index + i < OTP_LENGTH; i += 1) {
      next[index + i] = chars[i];
    }

    setOtpDigits(next);
    const focusIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
    otpRefs.current[focusIndex]?.select();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((digit, i) => {
      next[i] = digit;
    });

    setOtpDigits(next);
    const focusIndex = Math.min(pasted.length - 1, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    resetAuthFeedback();
    
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });

        if (error) {
          setAuthError(getFriendlyOtpErrorMessage(error, 'Could not create account.'));
          return;
        }

        await sendAuthEmailOnce(email, 'signup');

        storeOtpEmail(email);
        setSignupStep('verification');
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        startResendCooldown();
        setAuthMessage('Verification code sent. Enter the 6-digit OTP from your email.');

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
      setAuthError(getFriendlyOtpErrorMessage(err, 'Authentication failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingOtp(true);
    resetAuthFeedback();

    try {
      if (otpCode.length !== OTP_LENGTH) {
        setAuthError('Please enter the full 6-digit verification code.');
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup',
      });

      if (error) {
        setAuthError(getFriendlyOtpErrorMessage(error, 'Invalid or expired OTP code.'));
        return;
      }

      clearStoredOtpEmail();
      clearStoredResendUntil();
      setAuthMessage('Email verified successfully. Redirecting...');
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setAuthError(getFriendlyOtpErrorMessage(err, 'OTP verification failed.'));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp || !email) return;

    setIsResendingOtp(true);
    resetAuthFeedback();

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        setAuthError(getFriendlyOtpErrorMessage(error, 'Unable to resend OTP right now.'));
        return;
      }

      startResendCooldown();
      setAuthMessage('A new verification code has been sent.');
    } catch (err: any) {
      setAuthError(getFriendlyOtpErrorMessage(err, 'Unable to resend OTP right now.'));
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    resetAuthFeedback();
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
      setIsSubmitting(false);
    }
  };

  if (isInitializing) {
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
      {authMode === 'login' ? 'Welcome Back' : signupStep === 'verification' ? 'Verify Your Email' : 'Join the Club'}
    </h2>
  </div>

  {/* Form Section - Tightened input spacing */}
  <form className="space-y-3 sm:space-y-5" onSubmit={authMode === 'signup' && signupStep === 'verification' ? handleVerifyOtp : handleAuth}>
    <div className="relative">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#321327]/40" size={16} />
      <input 
        type="email" 
        placeholder="EMAIL ADDRESS"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full bg-[#F9F3F5] border-none py-3 sm:py-4 pl-10 pr-4 text-[10px] tracking-[0.1em] outline-none"
        required 
        disabled={authMode === 'signup' && signupStep === 'verification'}
      />
    </div>

    {authMode === 'signup' && signupStep === 'verification' ? (
      <div className="space-y-2">
        <p className="text-[10px] tracking-[0.14em] uppercase text-[#321327]/60">Enter 6-digit OTP</p>
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {otpDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                otpRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              value={digit}
              onChange={(e) => handleOtpInputChange(idx, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
              onPaste={handleOtpPaste}
              className="h-10 w-full min-w-0 bg-[#F9F3F5] border border-[#321327]/10 text-center text-sm font-semibold text-[#321327] outline-none focus:border-[#840d5c] sm:h-11 sm:text-base"
              aria-label={`OTP digit ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    ) : (
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#321327]/40" size={16} />
        <input 
          type={isPasswordVisible ? 'text' : 'password'} 
          placeholder="PASSWORD"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-[#F9F3F5] border-none py-3 sm:py-4 pl-10 pr-10 text-[10px] tracking-[0.1em] outline-none"
          required 
        />
        <button
          type="button"
          onClick={() => setIsPasswordVisible((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#321327]/50 transition hover:text-[#840d5c]"
          aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
        >
          {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    )}

    {authError && (
      <p className="text-[10px] font-bold tracking-[0.1em] text-red-600 uppercase">
        {authError}
      </p>
    )}

    {authMessage && !authError && (
      <p className="text-[10px] font-bold tracking-[0.1em] text-emerald-700 uppercase">
        {authMessage}
      </p>
    )}

    <button 
      type="submit" 
      disabled={isSubmitting || isVerifyingOtp}
      className="w-full bg-[#321327] text-[#F9F3F5] py-3 sm:py-4 text-[10px] font-bold tracking-[0.2em] hover:bg-[#840d5c] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {authMode === 'signup' && signupStep === 'verification'
        ? (isVerifyingOtp ? 'VERIFYING...' : 'VERIFY CODE')
        : authMode === 'login'
          ? (isSubmitting ? 'SIGNING IN...' : 'SIGN IN')
          : (isSubmitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT')}
      <ArrowRight size={14} />
    </button>

    {authMode === 'signup' && signupStep === 'verification' && (
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={!canResendOtp}
          className="text-[10px] font-bold text-[#840d5c] tracking-[0.15em] uppercase underline disabled:opacity-40 disabled:no-underline"
        >
          {isResendingOtp ? 'SENDING...' : canResendOtp ? 'RESEND CODE' : `RESEND IN ${resendCountdown}s`}
        </button>

        <button
          type="button"
          onClick={() => {
            clearOtpState();
            resetAuthFeedback();
            setPassword('');
          }}
          className="text-[10px] font-bold text-[#321327]/60 tracking-[0.15em] uppercase"
        >
          CHANGE EMAIL
        </button>
      </div>
    )}
  </form>

  {/* Google Auth Divider and Button - Tighter vertical margins */}
  {!(authMode === 'signup' && signupStep === 'verification') && (
    <>
      <div className="relative my-4 sm:my-6 flex items-center">
        <div className="flex-grow border-t border-[#F9F3F5]"></div>
        <span className="mx-3 text-[9px] tracking-[0.1em] text-[#321327]/40 uppercase">OR</span>
        <div className="flex-grow border-t border-[#F9F3F5]"></div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting}
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
    </>
  )}

  {/* Footer Link - Tighter padding */}
  <div className="pt-4 sm:pt-6 mt-2 border-t border-[#F9F3F5] text-center">
    <button 
      onClick={() => {
        const nextMode = authMode === 'login' ? 'signup' : 'login';
        setAuthMode(nextMode);
        resetAuthFeedback();
        setPassword('');
        setOtpDigits(Array(OTP_LENGTH).fill(''));

        if (nextMode === 'login') {
          clearOtpState();
        } else {
          setSignupStep(getStoredOtpEmail() ? 'verification' : 'credentials');
        }
      }} 
      className="text-[10px] font-bold text-[#840d5c] tracking-[0.2em] underline uppercase"
    >
      {authMode === 'login'
        ? 'Register Now'
        : signupStep === 'verification'
          ? 'Back to Login'
          : 'Back to Login'}
    </button>
  </div>
</div>
      </div>
    );
  }

  return <>{children}</>;
}