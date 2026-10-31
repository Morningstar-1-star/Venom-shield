// ==UserScript==
// @name         Venom GPlinks – Skip Paywall & Auto Steps
// @namespace    venom.gplinks
// @version      1.0.0
// @description  GPlinks: auto-picks "Continue with ads" (never pays), then on the 15-second step pages boosts the countdown (via Venom Shield), clicks VERIFY, scrolls and clicks CONTINUE for you.
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @noframes
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const H = location.hostname.replace(/^www\./, '').toLowerCase();
  const D = document, W = window;
  const toast = msg => {
    try {
      if (!D.body) return;
      let t = D.getElementById('__vgp'); 
      if (!t) { t = D.createElement('div'); t.id = '__vgp'; t.style.cssText = 'all:initial;position:fixed;left:50%;top:14px;transform:translateX(-50%);background:#2b7fff;color:#fff;font:600 13px system-ui;padding:7px 14px;border-radius:18px;z-index:2147483647;pointer-events:none'; D.body.appendChild(t); }
      t.textContent = 'GP: ' + msg; clearTimeout(t._h); t._h = setTimeout(() => t.remove(), 2500);
    } catch (e) {}
  };
  const visible = el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && (el.offsetParent !== null || cs.position === 'fixed' || el.getClientRects().length > 0); };
  const enabled = el => { const cs = getComputedStyle(el); return !(el.disabled || el.getAttribute('aria-disabled') === 'true' || /(^|\s)disabled(\s|$)/i.test(el.className || '') || cs.pointerEvents === 'none' || parseFloat(cs.opacity) < 0.5); };
  const safeHref = el => { const h = el.getAttribute && el.getAttribute('href'); if (!h || h === '#' || /^javascript:/i.test(h)) return true; try { const u = new URL(h, location.href); return u.hostname === location.hostname || /(^|\.)gplinks\.(co|com)$/.test(u.hostname); } catch (e) { return false; } };
  function findByText(re, root) {
    const els = (root || D).querySelectorAll('button,a,input[type=button],input[type=submit],[role=button],div,span');
    for (const el of els) {
      if (el.children.length > 2) continue;
      const t = ((el.value || el.textContent) || '').trim();
      if (t.length < 2 || t.length > 40 || !re.test(t)) continue;
      if ([...el.children].some(c => (c.textContent || '').trim() === t)) continue; // prefer the innermost element
      if (visible(el)) return el;
    }
    return null;
  }

  // ---------- A. GPlinks paywall page → "Continue with ads" ----------
  if (/^gplinks\.(co|com)$/.test(H)) {
    let tries = 0, done = false;
    const iv = setInterval(() => {
      if (done || ++tries > 120) return clearInterval(iv);
      const a = D.querySelector('a[href*="skip_sub=1"]');
      if (a) { done = true; toast('Continue with ads'); location.replace(a.href); return; }
      const t = D.body && D.body.textContent || '';
      if (tries > 15 && /Continue with ads/i.test(t) && !/skip_sub=/.test(location.search)) {
        done = true; const u = new URL(location.href); u.searchParams.set('skip_sub', '1'); toast('Continue with ads'); location.replace(u.href);
      }
    }, 150);
    return;
  }

  // ---------- A2. plain "I'M NOT ROBOT" button pages (a styled button, not a real captcha) ----------
  const EXE = /(^|\.)(exe\.io|exey\.io|exey\.app|exeygo\.com|exey\.go|exe-links\.com|exeo\.app|exego\.app|cuty\.io|cuttty\.com|ouo\.io|ouo\.press|uii\.io|ouo\.today|bc\.vc|bcvc\.xyz|bcvc\.live|bcvcgo\.xyz|tpi\.li|oii\.la|tei\.ai|tii\.ai|iir\.ai|oko\.sh)$/;
  const REAL_CAPTCHA = 'iframe[src*="recaptcha"],iframe[src*="hcaptcha"],iframe[src*="turnstile"],iframe[src*="challenges.cloudflare"],.g-recaptcha,.h-captcha,.cf-turnstile';
  let robotDone = false;
  function notRobot() {
    if (robotDone || EXE.test(H) || D.querySelector(REAL_CAPTCHA)) return;
    const b = findByText(/^i['’]?\s*m\s*not\s*(a\s*)?robot$|^i\s*am\s*not\s*(a\s*)?robot$/i);
    if (b && enabled(b) && safeHref(b)) { robotDone = true; toast("I'M NOT ROBOT"); setTimeout(() => b.click(), 600); }
  }

  // ---------- B. step pages: "Please wait 15 Seconds…  VERIFY … CONTINUE" ----------
  const MARK = /Verify\s*&\s*Scroll down to Continue|Please wait\s*\d+\s*Seconds?\s*\.{0,3}/i;
  let boosted = false, verified = false, lastClick = 0, ticks = 0, imgDone = false, cfgShown = false;
  // "Click on any image, then come back and wait" pages (best effort): tap the first image link without leaving, then fire the "you came back" events.
  const IMGSTEP = /click\s+on\s+any\b.{0,25}images?.{0,60}(back|wait)/i;
  function imageStep() {
    if (imgDone) return; imgDone = true;
    const root = D.querySelector('article,.entry-content,.post-content,main,#content') || D.body;
    const a = [...root.querySelectorAll('a')].find(x => x.querySelector('img') && visible(x));
    if (!a) { imgDone = false; return; }
    const stop = e => { if (!e.isTrusted && e.target.closest && e.target.closest('a') === a) e.preventDefault(); };
    D.addEventListener('click', stop, true);
    a.click(); toast('image step');
    setTimeout(() => {
      try { W.dispatchEvent(new Event('blur')); D.dispatchEvent(new Event('visibilitychange')); W.dispatchEvent(new Event('focus')); D.dispatchEvent(new Event('visibilitychange')); W.dispatchEvent(new Event('pageshow')); } catch (e) {}
      D.removeEventListener('click', stop, true);
    }, 1500);
  }
  function tick() {
    if (!D.body) return;
    notRobot();
    const text = (D.body.innerText || D.body.textContent || '').slice(0, 6000);
    if (!cfgShown && W.gpfConfig && W.gpfConfig.steps) { cfgShown = true; toast('GPlinks flow: ' + W.gpfConfig.steps + ' steps'); }
    if (IMGSTEP.test(text)) imageStep();
    if (!MARK.test(text)) return;
    const verifyBtn = findByText(/^verify$/i), contBtn = findByText(/^(continue|get\s*link|click here to continue|go to link)$/i);
    if (!verifyBtn && !contBtn) return;
    if (!boosted) { boosted = true; try { W.__venomShield && W.__venomShield.boost('gplinks step'); } catch (e) {} toast('step page found'); }
    const m = text.match(/Please\s*wait\s*(\d+)\s*Seconds?/i);
    if (m && +m[1] > 0 && !verified) return;                       // still counting down
    const now = Date.now();
    if (!verified && verifyBtn && enabled(verifyBtn) && safeHref(verifyBtn)) { verifyBtn.click(); verified = true; lastClick = now; toast('VERIFY'); return; }
    if (verified || !verifyBtn) {
      W.scrollTo(0, D.documentElement.scrollHeight); W.dispatchEvent(new Event('scroll')); D.dispatchEvent(new Event('scroll'));
      if (contBtn && enabled(contBtn) && safeHref(contBtn) && now - lastClick > 1500) { lastClick = now; toast('CONTINUE'); contBtn.click(); }
    }
  }
  const start = () => { const iv = setInterval(() => { if (++ticks > 900) return clearInterval(iv); try { tick(); } catch (e) {} }, 400); };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
