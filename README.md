# Fitted

A closet stylist for iPhone that you add to your Home Screen. Snap your clothes or paste shop links, and Fitted builds outfits around the weather, your colours and your fit.

## What it does
- **Today's fit**: an outfit for today's weather and plan (Casual, Work, Date, Braai, Gym). Swipe right to save it, left to skip, or tap a piece to swap it.
- **Colour and fit aware**: every outfit is scored on colour harmony (neutral base, one accent, echoed colours, no clashes or pattern fights) and on silhouette (loose over neat, no baggy on baggy for smart plans). The card shows the palette and fit so you can see why it works.
- **Try before you buy**: paste a link from an online shop. Fitted pulls in the photo, name and price, adds the item to your wishlist and shows how many fits it makes with clothes you already own.
- **Add from a photo**: the plain background is cut out on the phone, the item is cropped and its colours are read automatically.
- **Build**: put a fit together yourself, let Fitted complete the empty slots, and get a fit check out of 10 (colour, fit, weather).
- **Stylist chat**: swipe up on the bottom bar (or tap its handle). Ask what to wear, what goes with an item, whether a wishlist piece is worth buying, or plan your week.
- **Fits**: saved outfits and a weekly log of what you wore.

## Deploy on Vercel
1. On vercel.com: **Add New → Project**, import `fitted`, keep Framework Preset = **Other**, then **Deploy**.
2. Every push to `main` redeploys. The phone picks up the new version the next time Fitted is opened.

Shop-link import runs on Vercel functions (`api/`), so it works on the deployed site, not when the files are opened straight from disk.

## Switch on the AI stylist (optional)
Without a key, Fitted styles with its built-in rules. To use Claude for the chat and for automatic photo tagging:
1. In Vercel, open the project → **Settings → Environment Variables**.
2. Add `ANTHROPIC_API_KEY` with your key from console.anthropic.com.
3. Optional: add `FITTED_ACCESS_CODE` with any password. Only phones that enter it in **Settings → Stylist AI** can use your key.
4. Redeploy (Deployments → ⋯ → Redeploy).

## Add it to your iPhone
Open the link in **Safari** → **Share** → **Add to Home Screen** → **Add**. Open Fitted from the icon; it runs full screen.

## Notes
- Your closet lives on the phone. Use **Settings → Back up** before deleting the app, and **Restore** to bring it back.
- Weather comes from Open-Meteo (no key). Change the city in **Settings** or tap the weather pill.
- A few big shops block link imports. For those, screenshot the item and add it from Photos.

## Develop
`npm install`, then `npm test` runs the engine, shop-parser and API tests.
