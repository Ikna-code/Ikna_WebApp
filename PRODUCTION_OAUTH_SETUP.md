# 🚀 PRODUCTION DEPLOYMENT CHECKLIST: OAuth Fix

## Overview
Your Next.js app was redirecting OAuth callbacks to `localhost:3000` because required environment variables were missing in production. This guide shows you exactly how to fix it on Vercel.

---

## ✅ STEP 1: Verify Code Changes (DONE)

The codebase has been updated with:
- ✅ Better error messages for missing env vars
- ✅ Explicit failures in production (instead of silent localhost fallbacks)
- ✅ `.env` file now includes `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL`

**Files modified:**
1. [lib/seo.ts](lib/seo.ts) - Better error handling
2. [app/layout.tsx](app/layout.tsx) - Better error handling
3. [components/profile/AuthGuard.tsx](components/profile/AuthGuard.tsx) - Better error handling
4. [app/account/settings/page.tsx](app/account/settings/page.tsx) - Better error handling
5. [.env](.env) - Added environment variables

---

## 🔑 STEP 2: Add Environment Variables to Vercel

### Option A: Vercel Dashboard (Recommended)

1. **Login** to https://vercel.com/dashboard
2. **Select** your IKNA project
3. **Click** `Settings` in the top menu
4. **Click** `Environment Variables` in the left sidebar
5. **Add** `NEXT_PUBLIC_APP_URL`:
   - **Name:** `NEXT_PUBLIC_APP_URL`
   - **Value:** `https://www.iknaonline.com`
   - **Environments:** Check all (Production, Preview, Development)
   - **Click** `Save`

6. **Add** `NEXT_PUBLIC_SITE_URL`:
   - **Name:** `NEXT_PUBLIC_SITE_URL`
   - **Value:** `https://www.iknaonline.com`
   - **Environments:** Check all (Production, Preview, Development)
   - **Click** `Save`

**Screenshot locations:**
- Environment Variables: Dashboard → Settings (top right) → Environment Variables (left sidebar)

### Option B: Vercel CLI

```bash
# Login to Vercel
vercel login

# Navigate to project
cd d:\IKNA\ikna_app

# Add environment variables
vercel env add NEXT_PUBLIC_APP_URL
# When prompted, enter: https://www.iknaonline.com

vercel env add NEXT_PUBLIC_SITE_URL
# When prompted, enter: https://www.iknaonline.com
```

---

## 🔑 STEP 3: Configure Supabase OAuth

### In Supabase Console

1. **Login** to https://app.supabase.com/
2. **Select** your project (jpvznrtznfvfhpecylxj)
3. **Navigate** to: `Settings → Authentication`
4. **Click** `URL Configuration` in the left menu
5. **Set Site URL**:
   ```
   https://www.iknaonline.com
   ```
   Click outside the field to save.

6. **Add Additional Redirect URLs** (if not already present):
   ```
   https://www.iknaonline.com/**
   https://api.iknaonline.com/**
   ```
   (The `**` matches any path on those domains)

7. **Provider Settings** → **Google**:
   - Verify your Google OAuth credentials are configured
   - Verify Google has authorized redirect URI: `https://jpvznrtznfvfhpecylxj.supabase.co/auth/v1/callback`

---

## 🚀 STEP 4: Redeploy Application

### Option A: Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to the `Deployments` tab
4. Find the latest deployment
5. Click the `...` menu → `Redeploy`
6. Select `Use existing Build Cache` (optional, faster)
7. Click `Redeploy`

**Wait for deployment to complete (~2-3 minutes)**

### Option B: Git Push (Automatic)

Simply push to your main branch:
```bash
cd d:\IKNA\ikna_app
git add .
git commit -m "fix: OAuth redirect - add production env vars"
git push origin main
```

Vercel will automatically deploy your changes.

### Option C: Vercel CLI

```bash
cd d:\IKNA\ikna_app
vercel --prod
```

---

## ✅ STEP 5: Verify the Fix

### Test OAuth Flow in Production

1. **Open** https://www.iknaonline.com
2. **Click** "Sign In" or "Sign Up"
3. **Click** "Continue with Google"
4. **Complete** Google authentication
5. **Verify** you are redirected to `https://www.iknaonline.com` (NOT `http://localhost:3000`)

### Check Browser Console

1. **Open** DevTools: `F12` or `Right-click → Inspect`
2. **Go to** `Console` tab
3. **Look for** any `CRITICAL` error messages about missing URLs
4. **Should be empty** (no errors)

### Check Network Tab

1. **Open** DevTools: `F12`
2. **Go to** `Network` tab
3. **Click** "Continue with Google"
4. **Look for** requests to `accounts.google.com`
5. **In the request**, verify the `redirect_uri` parameter starts with `https://www.iknaonline.com`

---

## 🧪 ADVANCED: Test Different Scenarios

### Scenario 1: Production Domain
```
Access: https://www.iknaonline.com
Expected: OAuth redirects to https://www.iknaonline.com/
Result: ✅ or ❌
```

### Scenario 2: API Subdomain
```
Access: https://api.iknaonline.com (if applicable)
Expected: OAuth redirects to https://api.iknaonline.com/
Result: ✅ or ❌
```

### Scenario 3: Non-www Domain
```
Access: https://iknaonline.com
Expected: OAuth redirects to https://www.iknaonline.com/ (per CANONICAL_PROD_ORIGIN)
Result: ✅ or ❌
```

### Scenario 4: Localhost (Dev)
```
Access: http://localhost:3000
Expected: OAuth redirects to http://localhost:3000/
Result: ✅ or ❌
```

---

## 🔍 DEBUGGING: If Still Redirecting to Localhost

### Check 1: Verify Env Vars in Vercel

1. Go to: https://vercel.com/dashboard
2. Select project → Settings → Environment Variables
3. Verify both variables are present:
   - `NEXT_PUBLIC_APP_URL = https://www.iknaonline.com`
   - `NEXT_PUBLIC_SITE_URL = https://www.iknaonline.com`

### Check 2: Clear Vercel Build Cache

1. Go to: https://vercel.com/dashboard
2. Select project → Settings → Git
3. Scroll down to "Build and Development Settings"
4. Click `Clear Build Cache`
5. Redeploy

### Check 3: Verify Deployment Used New Env Vars

1. After redeploying, check the deployment details:
   - Click on the deployment
   - Go to `Runtime logs`
   - Look for build-time messages
   - Should NOT show "http://localhost:3000" in logs

### Check 4: Check Supabase Configuration

1. https://app.supabase.com/ → Your project
2. Settings → Authentication → URL Configuration
3. Verify `Site URL` is set to `https://www.iknaonline.com`
4. Try OAuth again

### Check 5: Browser Cache Issue

1. **Clear browser cache** for `www.iknaonline.com`
2. **Open new incognito/private window**
3. **Test OAuth flow again**

---

## 📊 Environment Variable Reference

| Variable | Value | Scope | Purpose |
|----------|-------|-------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://www.iknaonline.com` | Public (Client) | OAuth redirect URL, SEO |
| `NEXT_PUBLIC_SITE_URL` | `https://www.iknaonline.com` | Public (Client) | Canonical site URL, Metadata |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jpvznrtznfvfhpecylxj.supabase.co` | Public (Client) | Supabase API endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (your key) | Public (Client) | Supabase auth key |

**Note:** Variables prefixed with `NEXT_PUBLIC_` are embedded in the client bundle and visible in browser. Never put secrets here.

---

## ✅ Final Checklist

- [ ] Added `NEXT_PUBLIC_APP_URL` to Vercel
- [ ] Added `NEXT_PUBLIC_SITE_URL` to Vercel
- [ ] Redeployed application
- [ ] Verified Supabase Site URL is configured
- [ ] Tested OAuth flow on production
- [ ] OAuth redirects to correct domain (not localhost)
- [ ] No console errors about missing env vars
- [ ] Tested in incognito window (fresh cache)

---

## 🆘 Still Having Issues?

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Still redirecting to localhost | Env vars not set in Vercel | Re-check Step 2, clear cache |
| "Redirect URI mismatch" error | Supabase not configured correctly | Follow Step 3, verify Site URL |
| OAuth button not working | JavaScript error | Check DevTools console |
| Different domain after OAuth | Browser cache | Use incognito window |

### Get Help

1. **Check deployment logs:**
   - https://vercel.com/dashboard → Select project → Deployments → View logs

2. **Check Supabase logs:**
   - https://app.supabase.com/ → Logs (bottom left)

3. **Test locally:**
   ```bash
   npm run build
   npm run start
   ```
   Then visit `http://localhost:3000` and test OAuth

---

## 📝 Summary

You had **localhost:3000 hardcoded as a fallback** in 4 files. When production environment variables weren't set in Vercel, the code defaulted to localhost.

**The fix:**
1. ✅ Code now has better error handling
2. ✅ Environment variables added to `.env`
3. ⏳ Add environment variables to Vercel deployment
4. ⏳ Configure Supabase Site URL
5. ⏳ Test OAuth flow in production

**Expected result:** OAuth redirects to your production domain, not localhost.

