# Fitted (demo build)

A home-screen web app for iPhone. No build step: these files are the whole app.

## Put it on Vercel (no terminal)
1. On GitHub click **New repository** and name it `fitted`.
2. On the empty repo page click **uploading an existing file** and drag in everything in this folder (keep the `img` and `icons` folders). Commit.
3. Go to vercel.com, sign in with GitHub, click **Add New → Project**, pick `fitted`, keep Framework Preset = **Other**, click **Deploy**.
4. You get a link like `https://fitted-xxxx.vercel.app`.

## Put it on Vercel (with Node installed)
In this folder run `npx vercel` and then `npx vercel --prod`.

## Add it to your iPhone
Open the link in **Safari** (not Chrome) → tap **Share** → **Add to Home Screen** → **Add**. Open Fitted from the icon; it runs full screen.

## Notes
- Your closet and saved fits are stored on the phone (in Safari's storage for this app). Deleting the app from the Home Screen clears them.
- Updates: push to GitHub and Vercel redeploys. The phone picks up the new version the next time Fitted is opened (the app code is fetched fresh; images stay cached).
- Weather is live for Johannesburg (Open-Meteo, no key).
- The stylist uses built-in rules for now. The local LLM on your PC plugs in later.
