# 🔍 ROOT CAUSE ANALYSIS: OAuth Redirect to localhost:3000

## EXECUTIVE SUMMARY

Your deployed Next.js application redirects OAuth callbacks to `http://localhost:3000` instead of your production domain because **required environment variables are missing in your production deployment**. When env vars are absent, the code falls back to hardcoded `http://localhost:3000` defaults.

---

## 1️⃣ CRITICAL ISSUE: MISSING ENVIRONMENT VARIABLES

### Current State (.env file)
Your `.env` file is **MISSING** these critical variables:
```env
NEXT_PUBLIC_APP_URL=              ❌ NOT SET
NEXT_PUBLIC_SITE_URL=             ❌ NOT SET  
SITE_URL=                          ❌ NOT SET
```

Only set:
```env
NEXT_PUBLIC_SUPABASE_URL='https://jpvznrtznfvfhpecylxj.supabase.co'
NEXT_PUBLIC_SUPABASE_ANON_KEY='...'
```

### Impact
**In production deployment (Vercel/hosting), if these env vars are not configured, the fallback value is hardcoded to `http://localhost:3000`.**

---

## 2️⃣ THE 4 FALLBACK LOCATIONS WITH HARDCODED LOCALHOST

### File 1: [lib/seo.ts](lib/seo.ts#L16)
```typescript
const RAW_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'http://localhost:3000';  // ❌ LINE 16: HARDCODED FALLBACK
```

### File 2: [app/layout.tsx](app/layout.tsx#L16)
```typescript
const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.SITE_URL ||
  "http://localhost:3000";  // ❌ LINE 16: HARDCODED FALLBACK
```

### File 3: [components/profile/AuthGuard.tsx](components/profile/AuthGuard.tsx#L25)
```typescript
function getAppBaseUrl() {
  // In browser flows (Google OAuth), trust the current origin first.
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return 'http://localhost:3000';  // ❌ LINE 25: HARDCODED FALLBACK
}
```

### File 4: [app/account/settings/page.tsx](app/account/settings/page.tsx#L55)
```typescript
function getAppBaseUrl(): string {
  // In browser flows, always prefer the live origin over build-time env.
  if (typeof window !== 'undefined' && window.location?.origin) {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname === 'iknaonline.com' || hostname === 'www.iknaonline.com') {
      return CANONICAL_PROD_ORIGIN;
    }
    return window.location.origin.replace(/\/$/, '');
  }
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return 'http://localhost:3000';  // ❌ LINE 55: HARDCODED FALLBACK
}
```

---

## 3️⃣ OAUTH FLOW - STEP-BY-STEP TRACE

### Button Click → Redirect URL Generation

```
1. User clicks "Continue with Google" button
   ↓
2. handleGoogleSignIn() triggered in AuthGuard.tsx (line 417)
   ↓
3. getOAuthRedirectOrigin() called (line 418)
   ↓
   const redirectTo = `${getOAuthRedirectOrigin()}/`;
   ↓
4. supabase.auth.signInWithOAuth() called with redirectTo (line 420)
   ↓
5. Supabase redirects to Google OAuth endpoint with:
   redirect_uri: <redirectTo value>
   ↓
6. User authenticates with Google
   ↓
7. Google redirects back to Supabase with auth code
   ↓
8. Supabase redirects user to: redirectTo (from step 3)
   ↓ 
   IF redirectTo = "http://localhost:3000/" → USER REDIRECTED TO LOCALHOST ❌
   IF redirectTo = "https://www.iknaonline.com/" → USER REDIRECTED TO PRODUCTION ✅
```

---

## 4️⃣ WHERE LOCALHOST IS INTRODUCED

### Scenario A: Browser has `window.location.origin` (Normal Case)
```typescript
function getOAuthRedirectOrigin() {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return getAppBaseUrl();
  }

  const hostname = window.location.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return window.location.origin.replace(/\/$/, '');
  }

  if (hostname === 'iknaonline.com' || hostname === 'www.iknaonline.com') {
    return CANONICAL_PROD_ORIGIN;
  }

  return window.location.origin.replace(/\/$/, '');
}
```

**If deployed correctly:**
- User accesses: `https://www.iknaonline.com`
- `window.location.hostname` = `"www.iknaonline.com"`
- Should return: `"https://www.iknaonline.com"`
- Redirects to Google OAuth ✅

**If issue occurs (localhost returned):**
- Either user somehow accessed localhost version of production app
- OR browser is cache/redirect issue at DNS level
- OR Supabase internal handling is misconfigured

---

## 5️⃣ THE REAL CULPRIT: BUILD-TIME ENV VAR FALLBACK

When Next.js builds for production **without** setting environment variables:

1. Build-time variable substitution occurs
2. `process.env.NEXT_PUBLIC_APP_URL` = `undefined` (not set)
3. Code reaches: `return 'http://localhost:3000'`
4. This value is **BAKED INTO** the production bundle
5. Runtime `window.location.origin` is correct, BUT...
6. If ANY code path reaches the fallback (even briefly), localhost is used

---

## 6️⃣ WHERE EACH ENV VAR IS REFERENCED

### `NEXT_PUBLIC_APP_URL` References (3 files):
- [app/account/settings/page.tsx:51](app/account/settings/page.tsx#L51)
- [app/layout.tsx:14](app/layout.tsx#L14)
- [components/profile/AuthGuard.tsx:21](components/profile/AuthGuard.tsx#L21)

### `NEXT_PUBLIC_SITE_URL` References (4 files):
- [app/account/settings/page.tsx:52](app/account/settings/page.tsx#L52)
- [app/layout.tsx:13](app/layout.tsx#L13)
- [components/profile/AuthGuard.tsx:22](components/profile/AuthGuard.tsx#L22)
- [lib/seo.ts:14](lib/seo.ts#L14)

### `SITE_URL` References (2 files):
- [app/account/settings/page.tsx:53](app/account/settings/page.tsx#L53)
- [lib/seo.ts:15](lib/seo.ts#L15)

---

## 7️⃣ SUPABASE CONFIGURATION CHECK

### What's Correct ✅
- Supabase URL is set: `NEXT_PUBLIC_SUPABASE_URL`
- Supabase key is set: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### What's Missing ❌
**In Supabase Project Dashboard** (https://app.supabase.com/):
1. Go to: `Settings → Authentication → URL Configuration`
2. Check: **Site URL** field
   - Should be: `https://www.iknaonline.com`
   - **Currently likely**: blank or set to `http://localhost:3000`
3. Check: **Additional Redirect URLs** section
   - Should include: `https://www.iknaonline.com/**`

### Supabase OAuth Configuration
The app uses:
```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo,  // From getOAuthRedirectOrigin()
  },
});
```

If `redirectTo` doesn't match Supabase's Site URL or Additional Redirect URLs, Supabase will reject it.

---

## 8️⃣ AUTHENTICATION FILES CONTRIBUTING TO ISSUE

### Primary Auth File:
- **[components/profile/AuthGuard.tsx](components/profile/AuthGuard.tsx)** - Main auth component
  - Lines 13: `CANONICAL_PROD_ORIGIN` constant
  - Lines 15-25: `getAppBaseUrl()` function (has localhost fallback)
  - Lines 33-47: `getOAuthRedirectOrigin()` function (OAuth URL determination)
  - Line 418: OAuth button handler

### Secondary Auth Files:
- **[lib/supabase/client.ts](lib/supabase/client.ts)** - Browser Supabase client
- **[lib/supabase/server.ts](lib/supabase/server.ts)** - Server Supabase client
- **[backend/actions/auth.ts](backend/actions/auth.ts)** - Auth email notifications
- **[app/account/settings/page.tsx](app/account/settings/page.tsx)** - User settings (also has localhost fallback)

### Supporting Components:
- **[components/utility/AppInitializer.tsx](components/utility/AppInitializer.tsx)** - Auth state listener
  - Subscribes to `supabase.auth.onAuthStateChange()` events

---

## 9️⃣ EXACT CODE CHANGES REQUIRED

### ✅ STEP 1: Add Environment Variables to Production Deployment

**For Vercel:**
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to: `Settings → Environment Variables`
4. Add these 2 variables (BOTH required):

```
Name: NEXT_PUBLIC_APP_URL
Value: https://www.iknaonline.com
Environments: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_SITE_URL
Value: https://www.iknaonline.com
Environments: Production, Preview, Development
```

5. Redeploy your application

**For other hosting (AWS, Netlify, etc.):**
Add to your environment configuration:
```env
NEXT_PUBLIC_APP_URL=https://www.iknaonline.com
NEXT_PUBLIC_SITE_URL=https://www.iknaonline.com
```

### ✅ STEP 2: Update .env File (for local development)

Edit `.env`:
```env
# Add these lines
NEXT_PUBLIC_APP_URL=https://www.iknaonline.com
NEXT_PUBLIC_SITE_URL=https://www.iknaonline.com

# Existing content...
NEXT_PUBLIC_SUPABASE_URL='https://jpvznrtznfvfhpecylxj.supabase.co'
# ... rest of env
```

### ✅ STEP 3: Remove Hardcoded Localhost Fallbacks (Optional but Recommended)

Instead of defaulting to `localhost:3000`, fail explicitly with helpful error:

**Change [lib/seo.ts](lib/seo.ts#L16):**
```typescript
const RAW_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (() => {
    throw new Error(
      'Missing NEXT_PUBLIC_SITE_URL or SITE_URL env var. ' +
      'Set it to your production domain (e.g., https://www.iknaonline.com)'
    );
  })();
```

**Change [app/layout.tsx](app/layout.tsx#L16):**
```typescript
const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.SITE_URL ||
  (() => {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      throw new Error('Missing URL env vars for production build');
    }
    return "http://localhost:3000"; // Keep for dev only
  })();
```

**Change [components/profile/AuthGuard.tsx](components/profile/AuthGuard.tsx#L25):**
```typescript
function getAppBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  
  // Fail explicitly instead of defaulting to localhost
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    console.error(
      'CRITICAL: Missing URL env vars. Set NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL'
    );
  }
  return 'http://localhost:3000'; // Dev fallback only
}
```

---

## 🔟 SUPABASE DASHBOARD CONFIGURATION

### Critical: Configure Supabase OAuth

1. **Login** to https://app.supabase.com/
2. **Select** your project
3. **Navigate** to: `Settings → Authentication → URL Configuration`
4. **Set Site URL**:
   ```
   https://www.iknaonline.com
   ```
5. **Set Additional Redirect URLs**:
   ```
   https://www.iknaonline.com/**
   https://*.iknaonline.com/**
   ```
   (These patterns ensure Google redirects are allowed)

6. **Save**

### Configure Google OAuth Provider

1. In same dashboard, go to: `Authentication → Providers → Google`
2. Verify these match your Google Cloud Console settings:
   - **Authorized redirect URIs** should include:
     ```
     https://jpvznrtznfvfhpecylxj.supabase.co/auth/v1/callback
     ```

---

## 📋 PRIORITY ORDERED ISSUES

### 🔴 **PRIORITY 1 - CRITICAL (Do This First)**
**Add production environment variables to your deployment platform**
- **Impact**: Direct cause of localhost redirect
- **Time to fix**: 5 minutes
- **Files affected**: Vercel/hosting dashboard

### 🟠 **PRIORITY 2 - IMPORTANT (Do This Second)**
**Configure Supabase URL settings**
- **Impact**: Supabase may reject callbacks if not configured
- **Time to fix**: 5 minutes  
- **Files affected**: Supabase project dashboard

### 🟡 **PRIORITY 3 - RECOMMENDED (Do This Third)**
**Update code to remove hardcoded localhost fallbacks**
- **Impact**: Prevents future accidental localhost usage
- **Time to fix**: 15 minutes
- **Files affected**:
  - [lib/seo.ts](lib/seo.ts)
  - [app/layout.tsx](app/layout.tsx)
  - [components/profile/AuthGuard.tsx](components/profile/AuthGuard.tsx)
  - [app/account/settings/page.tsx](app/account/settings/page.tsx)

---

## ✅ VERIFICATION CHECKLIST

After implementing fixes:

- [ ] Added `NEXT_PUBLIC_APP_URL=https://www.iknaonline.com` to Vercel (or hosting)
- [ ] Added `NEXT_PUBLIC_SITE_URL=https://www.iknaonline.com` to Vercel (or hosting)
- [ ] Redeployed application after adding env vars
- [ ] Verified Supabase Site URL is set to production domain
- [ ] Verified Supabase Additional Redirect URLs include production domain
- [ ] Tested Google OAuth flow on production domain
- [ ] Verified OAuth redirects to `https://www.iknaonline.com` (NOT localhost)
- [ ] Checked browser console for auth errors
- [ ] Cleared browser cache and tested again

---

## 🧪 TESTING THE FIX

### Test in Production:
1. Visit: `https://www.iknaonline.com`
2. Click: "Continue with Google"
3. Complete Google auth
4. Verify: Browser redirects to `https://www.iknaonline.com` (NOT `http://localhost:3000`)

### Monitor Errors:
1. Open browser DevTools → Console
2. Check for auth-related errors
3. Open Network tab → search for "callback" requests
4. Verify redirect URL starts with `https://www.iknaonline.com`

---

## 🔗 RELATED DOCUMENTATION

- Supabase OAuth: https://supabase.com/docs/guides/auth/social-login/auth-google
- Next.js Environment Variables: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
- Vercel Environment Variables: https://vercel.com/docs/projects/environment-variables

