# ⚡ QUICK START: OAuth Fix in 3 Steps

## 🔴 THE PROBLEM
When you click "Continue with Google" on your production site, you get redirected to `http://localhost:3000` instead of `https://www.iknaonline.com`.

## 🟢 THE SOLUTION
Add 2 missing environment variables to Vercel and redeploy.

---

## ✅ 3-STEP FIX (15 MINUTES)

### Step 1: Open Vercel (2 min)
1. Go to: https://vercel.com/dashboard
2. Select your **IKNA** project
3. Click **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)

### Step 2: Add Environment Variables (5 min)
**Add Variable #1:**
- **Name:** `NEXT_PUBLIC_APP_URL`
- **Value:** `https://www.iknaonline.com`
- **Environments:** Check all 3 boxes
- Click **Save**

**Add Variable #2:**
- **Name:** `NEXT_PUBLIC_SITE_URL`
- **Value:** `https://www.iknaonline.com`
- **Environments:** Check all 3 boxes
- Click **Save**

### Step 3: Redeploy (5 min)
1. Go to **Deployments** tab
2. Find latest deployment
3. Click **...** menu
4. Click **Redeploy**
5. Wait for deployment to complete

---

## 🧪 TEST IT
1. Visit: https://www.iknaonline.com
2. Click "Continue with Google"
3. ✅ You should redirect to `https://www.iknaonline.com`
4. ❌ If still going to localhost, clear browser cache and try again

---

## 📚 DETAILED DOCS
- [OAUTH_FIX_SUMMARY.md](OAUTH_FIX_SUMMARY.md) - Executive summary
- [OAUTH_REDIRECT_ANALYSIS.md](OAUTH_REDIRECT_ANALYSIS.md) - Complete analysis
- [PRODUCTION_OAUTH_SETUP.md](PRODUCTION_OAUTH_SETUP.md) - Detailed setup guide

---

## ❓ WHAT WENT WRONG?
Your `.env` file was missing:
```env
NEXT_PUBLIC_APP_URL=https://www.iknaonline.com
NEXT_PUBLIC_SITE_URL=https://www.iknaonline.com
```

So when the app deployed, it used the hardcoded fallback: `http://localhost:3000`

---

## ✅ WHAT'S FIXED
✅ Code now has better error handling  
✅ `.env` file has correct URLs  
✅ Vercel deployment ready (just needs env vars added)

---

**That's it! Just add those 2 env vars to Vercel and redeploy.**

