# Fitted

A closet stylist for iPhone that you add to your Home Screen. Snap your clothes or paste shop links, and Fitted builds outfits around the weather, your colours and your fit.

## What it does
- **Today's fit**: an outfit for today's weather and plan (Casual, Work, Date, Braai, Gym). Swipe right to save it, left to skip, or tap a piece to swap it.
- **Colour and fit aware**: every outfit is scored on colour harmony (neutral base, one accent, echoed colours, no clashes or pattern fights) and on silhouette (loose over neat, no baggy on baggy for smart plans). The card shows the palette and fit so you can see why it works.
- **Try before you buy**: paste a link from an online shop. Fitted pulls in the photo, name and price, adds the item to your wishlist and shows how many fits it makes with clothes you already own.
- **Add lots of photos at once**: pick as many as you like from your gallery (up to 40 per round). Each photo is fixed for you on the phone: the background is removed with a small AI model (U²-Net), the photo is turned upright and a tilted item is straightened, it's cropped, and its colours, type and name are filled in. Check them in one grid, tap any piece to fix it, then add them all. With the AI stylist switched on, it also names each piece and fixes sideways photos.
- **Build**: put a fit together yourself, let Fitted complete the empty slots, and get a fit check out of 10 (colour, fit, weather).
- **Stylist chat**: swipe up on the bottom bar (or tap its handle). Ask what to wear, what goes with an item, whether a wishlist piece is worth buying, or plan your week.
- **Fits**: saved outfits and a weekly log of what you wore.

## Security
- Strict security headers on every page: a Content Security Policy that only runs Fitted's own code, HSTS, no framing, no sniffing, and locked-down browser permissions.
- Every API route checks that the request comes from the Fitted app itself, limits how often one visitor can call it, and turns away known attack scanners.
- Shop-link import only fetches public web addresses. Every redirect is checked, so the server can't be tricked into reaching private networks.
- **Honeypots**: the paths that bots probe (`/.env`, `/.git/config`, `/wp-login.php`, `/phpmyadmin`, `/admin`, `/api/v1` and more) answer with fake bait. Anyone who touches one is logged and blocked from the real API for 24 hours. See who knocked in **Vercel → Logs** by searching `honeypot`.
- The blocklist and rate limits live in each server instance's memory, so they're a speed bump, not a wall. For heavy traffic, turn on **Vercel → Firewall** (Bot Protection and Attack Challenge Mode are free).

## Deploy on Vercel
1. On vercel.com: **Add New → Project**, import `fitted`, keep Framework Preset = **Other**, then **Deploy**.
2. Every push to `main` redeploys. The phone picks up the new version the next time Fitted is opened.

Shop-link import runs on Vercel functions (`api/`), so it works on the deployed site, not when the files are opened straight from disk.

## Use the AI on your PC (LM Studio + ngrok)
The stylist chat and photo tagging can run on a model on your own PC. When the PC is off, Fitted quietly falls back to its built-in rules.

1. **LM Studio:** load a model (a small instruct model such as Llama 3.2 3B or Qwen 2.5 3B is fast enough; use a vision model such as Gemma 3 or Qwen2-VL if you want photo tagging). Open the **Developer** tab and start the server (port 1234). Copy the model's **API Model Identifier**.
2. **ngrok:** make a free account, claim your free static domain (Domains page), then run
   `ngrok http 1234 --url=<name>.ngrok-free.dev`
   The screen must show `-> http://localhost:1234`.
3. **Vercel → Settings → Environment Variables**, then **Redeploy**:
   | Name | Value |
   |---|---|
   | `LLM_BASE_URL` | `https://<name>.ngrok-free.dev/v1` |
   | `LLM_MODEL` | the API Model Identifier from LM Studio |
   | `LLM_API_KEY` | `lm-studio` (unless you turned on LM Studio auth) |
   | `LLM_MERGE_SYSTEM` | `1` only for models without a system role (e.g. Mistral 7B Instruct v0.2) |
4. **Test from your phone:** open `https://<name>.ngrok-free.dev/v1/models`. A list of models means the tunnel works. The chat header shows **Local AI · <model>** when it's connected.

Keep the ngrok URL private: anyone with it can use your PC's model. The app calls it from the server, so it never reaches the phone. Optional: set `FITTED_ACCESS_CODE` to a password and enter it in **Settings → Stylist AI**, so only your phone can use the AI through your Fitted link.

**Keep it online while you're out:**
- Set the PC to never sleep when plugged in (Windows: Settings → System → Power & battery → Screen and sleep → Never).
- In LM Studio, turn on starting the server at login and turn off auto-unload (Idle TTL) for the model.
- Run ngrok as a service so it restarts with the PC: fill in `local-ai/ngrok.yml`, then in an Administrator terminal run `ngrok service install --config "<path to ngrok.yml>"` and `ngrok service start`.

**If the chat says "PC offline":** run `local-ai/check_llm.ps1` (Windows) or `local-ai/check_llm.sh` (macOS/Linux) on the PC. It checks each link (LM Studio server, ngrok, public URL, model) and tells you which one is broken. **Settings → Stylist AI** in the app shows the reason too.

## Switch on the AI stylist with Claude instead (optional)
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
`npm install`, then `npm test` runs the engine, shop-parser, API and security tests.

The background remover runs in the browser from `vendor/` (ONNX Runtime Web, MIT; U²-Net small model, Apache-2.0). See `vendor/NOTICE.md`.
