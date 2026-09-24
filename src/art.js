/* Hand-drawn SVG assets. Stroke-based so they inherit currentColor and scale crisply. */

export const LOGO = '<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><path d="M27 17a5 5 0 1 1 7.6 4.3c-1.6 1-2.6 2.2-2.6 4v2.2" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M32 27.5 9.8 42.2c-2.2 1.5-1.2 4.8 1.5 4.8h41.4c2.7 0 3.7-3.3 1.5-4.8Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><circle cx="48" cy="18" r="5" fill="var(--accent)"/></svg>';

/** Empty closet: a rail with three swinging hangers. */
export const RAIL = '<svg class="art rail" viewBox="0 0 240 130" aria-hidden="true"><path d="M20 22h200" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M28 22v-10M212 22v-10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
  [60, 120, 180].map((x, i) => '<g class="hg" style="--d:' + i * 0.35 + 's;transform-origin:' + x + 'px 22px"><path d="M' + x + ' 22v6a5 5 0 1 1-5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M' + x + ' 38 ' + (x - 30) + ' 58c-2.4 1.6-1.3 5 1.6 5h56.8c2.9 0 4-3.4 1.6-5Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>' + (i === 1 ? '<rect x="' + (x - 22) + '" y="66" width="44" height="46" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.4"/>' : '') + '</g>').join('') + '</svg>';

/** Wishlist: a swing tag with a string. */
export const TAG = '<svg class="art tag" viewBox="0 0 200 130" aria-hidden="true"><path class="str" d="M40 20c30-10 50 30 70 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="4 6"/><g class="sw"><path d="M110 34 150 34 172 60 150 86 110 86Z" fill="var(--card)" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><circle cx="150" cy="60" r="5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M120 52h18M120 62h14M120 72h20" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M112 96l4 10 4-10" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/></g></svg>';

/** Build: a dashed chalk mannequin outline. */
export const CHALK = '<svg class="art chalk" viewBox="0 0 120 120" aria-hidden="true"><path d="M42 18h36l18 16-10 12-8-6v56H42V40l-8 6-10-12Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="5 6" stroke-linejoin="round"/></svg>';

/** Fit silhouettes for onboarding and settings. */
const TEE = {
  slim: 'M38 22h24l13 9-6 10-6-4v41H37V37l-6 4-6-10Z',
  regular: 'M35 22h30l16 10-7 12-7-5v40H33V39l-7 5-7-12Z',
  relaxed: 'M31 22h38l19 12-8 13-8-5v39H28V42l-8 5-8-13Z',
  oversized: 'M26 22h48l22 16-9 14-9-6v36H22V46l-9 6-9-14Z'
};
export const tee = f => '<svg class="tee" viewBox="0 0 100 90" aria-hidden="true"><path d="' + TEE[f] + '" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M' + (f === 'oversized' ? 42 : 44) + ' 22c2 5 10 5 12 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

/** The swipe-up hint drawn as a tiny bar with a finger arc. */
export const SWIPE = '<svg class="art swipe" viewBox="0 0 80 60" aria-hidden="true"><rect x="8" y="40" width="64" height="14" rx="7" fill="currentColor"/><rect x="33" y="43" width="14" height="3" rx="1.5" fill="var(--paper)"/><circle class="dot" cx="40" cy="44" r="5" fill="var(--accent)"/><path class="arc" d="M40 36V10M33 17l7-7 7 7" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* Photo tips: little scenes drawn in the same stroke style. */
const tipSvg = inner => '<svg class="tipart" viewBox="0 0 120 90" aria-hidden="true">' + inner + '</svg>';
const shirt = (x, y, s, fill) => '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M-14-16h28l14 10-6 10-6-4v26h-32V0l-6 4-6-10Z" fill="' + fill + '" stroke="currentColor" stroke-width="' + (2.2 / s) + '" stroke-linejoin="round"/>';
export const TIPS = [
  ['flat', tipSvg('<rect x="14" y="10" width="92" height="70" rx="10" fill="var(--paper-2)" stroke="currentColor" stroke-width="2.2"/>' + shirt(60, 45, 1, 'var(--ink)')), 'Lay it flat on a plain surface', 'A bed sheet, floor or table with nothing else on it. Light clothes on a dark surface, dark clothes on a light one.'],
  ['frame', tipSvg('<rect x="22" y="8" width="76" height="74" rx="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="5 5"/>' + shirt(60, 46, 0.95, 'var(--accent-soft)') + '<path d="M22 22v-14h14M98 22v-14h-14M22 68v14h14M98 68v14h-14" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>'), 'The whole piece, with space around it', 'Nothing cut off at the edges. Leave a hand’s width of floor around it so the cut-out stays clean.'],
  ['light', tipSvg('<circle cx="30" cy="26" r="11" fill="#F5A524" opacity=".85"/><path d="M30 8v4M30 40v4M12 26h4M44 26h4M17 13l3 3M40 36l3 3M17 39l3-3M40 16l3-3" stroke="#F5A524" stroke-width="2.4" stroke-linecap="round"/>' + shirt(78, 50, 0.9, 'var(--card)')), 'Soft daylight, no flash', 'Near a window is perfect. Flash and harsh lamps make shadows that look like part of the shirt.'],
  ['above', tipSvg('<rect x="42" y="6" width="36" height="22" rx="5" fill="var(--ink)"/><circle cx="60" cy="17" r="5" fill="var(--paper)"/><path d="M60 30v10" stroke="currentColor" stroke-width="2.2" stroke-dasharray="3 4"/><path d="M20 78h80" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' + shirt(60, 60, 0.75, 'var(--card)')), 'Straight down from above', 'Hold the phone flat over the piece. Fitted straightens small tilts and turns sideways shots upright.'],
  ['one', tipSvg('<path d="M24 62c0-8 6-12 14-12h14c4 0 6 3 6 6v6Z" fill="var(--card)" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M62 62c0-8 6-12 14-12h14c4 0 6 3 6 6v6Z" fill="var(--card)" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M20 66h80" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M60 16v18M52 26l8 8 8-8" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'), 'One piece per photo', 'Shoes are the exception: put the pair side by side in one shot. Hangers and hands are fine.'],
  ['shot', tipSvg('<rect x="38" y="4" width="44" height="82" rx="9" fill="var(--card)" stroke="currentColor" stroke-width="2.2"/><rect x="42" y="14" width="36" height="34" rx="3" fill="var(--paper-2)"/>' + shirt(60, 33, 0.55, 'var(--accent)') + '<path d="M44 56h28M44 63h20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="44" y="70" width="32" height="7" rx="3.5" fill="#2A6BE0"/>'), 'Shop screenshots work too', 'Screenshot a listing and add it from Photos. Fitted keeps just the item and, with the AI on, reads its name.']
];
