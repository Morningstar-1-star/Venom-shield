# Venom for Quetta

Three pieces. Do them in this order.

## 1. Put the pack on GitHub (2 minutes, phone is fine)
1. Create a public repo called `venom-shield` (any name works, but the links below assume this one).
2. Upload ALL the files in this zip into the repo (no folders needed).
3. Settings > Pages > Deploy from branch `main`, folder `/ (root)`. Your test page will be at
   `https://morningstar-1-star.github.io/venom-shield/quetta-test.html`

## 2. Test what Quetta's blocker understands
1. Quetta > Settings > Content Filters > **Add filter using URL**:
   `https://raw.githubusercontent.com/Morningstar-1-star/venom-shield/main/venom-test-filters.txt`
2. Open the test page, reload once. Read the table (PASS/FAIL). Tap **Copy report** and send it to me.
   * Rows 1-4 PASS  = normal blocking and hiding works.
   * Rows 5-6 PASS  = scriptlets (`##+js`) work. 5 is "all sites", 6 is "one site".
   * Row 7 PASS     = stand-in resources work.
   * Rows 8-10 PASS = timer speed-up and pop-up guard work.
3. Remove the test list when done.

## 3. Add the real list
`https://raw.githubusercontent.com/Morningstar-1-star/venom-shield/main/venom-quetta-filters.txt`
Sections 0-3 are normal rules and safe. Section 4 (scriptlets) only does something if rows 5-6 passed.
If a site breaks, turn the list off for that site in Quetta's shield, or remove the list and tell me which site.

## What a list cannot do (use scripts for these)
Auto-clicking VERIFY / CONTINUE / "Continue with ads", skipping the GPlinks paywall page, the
click-image-then-wait step, per-site script switches, and Venom Shield's captcha-aware countdown boost.

## 4. Scripts in Quetta (Violentmonkey)
1. Quetta > Extensions > open the Chrome Web Store > install **Violentmonkey**.
2. Open Violentmonkey's dashboard > `+` > **Install from URL**, one at a time:
   * `https://raw.githubusercontent.com/Morningstar-1-star/venom-shield/main/Venom-Shield.user.js`
   * `https://raw.githubusercontent.com/Morningstar-1-star/venom-shield/main/Venom-GPlinks.user.js`
   * `https://raw.githubusercontent.com/Morningstar-1-star/venom-shield/main/Venom-Core.user.js`
   * `https://raw.githubusercontent.com/Morningstar-1-star/venom-shield/main/SiteDrift-Engine.user.js`
3. Per-site off switch: Violentmonkey's toolbar popup lists the scripts running on the page; tap one to disable it
   for that site. Shield's own menu commands (boost now, show timers, pop-up guard, clear overlay) appear in the same popup.
4. Test on a GPlinks link: you should see the "GP: Continue with ads" toast, then the step pages clicked for you.
If Violentmonkey does not install or the toasts never appear, tell me; Tampermonkey is the next thing to try.

## Honest limits
* I could not test inside Quetta. Everything here was checked with an offline simulation only.
* Server-side waits (for example GPlinks counting steps x 30 s) cannot be skipped by any list or script.
* Cloudflare / captcha boxes are left alone on purpose.
