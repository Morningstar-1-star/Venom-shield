// ==UserScript==
// @name         Venom Shield – Wall Killer, Anti-Freeze & Countdown Boost
// @namespace    venom.shield
// @version      1.0.0
// @description  Removes "disable adblock", 18+, cookie, newsletter & notification walls (only when detected), unlocks scrolling, stops sites from freezing timers when the tab loses focus, speeds up shortlink countdowns, blocks pop-under window.open, hides ad-network boxes.
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';
  const W = window, D = document, H = location.hostname.replace(/^www\./, '').toLowerCase();
  // never touch captcha frames or login/payment pages
  if (/(^|\.)(recaptcha\.net|hcaptcha\.com|challenges\.cloudflare\.com|accounts\.google\.com|paypal\.com|stripe\.com|login\.live\.com|login\.microsoftonline\.com)$/.test(H)) return;
  if (/^google\.[a-z.]+$/.test(H) && /recaptcha/.test(location.pathname)) return;

  const get = (k, d) => { try { return typeof GM_getValue === 'function' ? GM_getValue(k, d) : d; } catch (e) { return d; } };
  const put = (k, v) => { try { GM_setValue(k, v); } catch (e) {} };
  const menu = (n, f) => { try { GM_registerMenuCommand(n, f); } catch (e) {} };
  const off = get('vs_off', {});
  const OFF = !!off[H];
  const popOff = !!get('vs_popoff', {})[H];
  menu(popOff ? 'Venom Shield: pop-up guard ON for this site' : 'Venom Shield: pop-up guard OFF for this site (allow pop-ups)', () => { const m = get('vs_popoff', {}); m[H] = !popOff; put('vs_popoff', m); location.reload(); });
  menu(OFF ? 'Venom Shield: turn ON for this site' : 'Venom Shield: turn OFF for this site', () => { off[H] = !OFF; put('vs_off', off); location.reload(); });
  if (OFF) return;

  // On sites ugibypass handles itself (Exe.io, Ouo, bc.vc, tpi.li families) run ONLY the countdown boost, nothing else.
  const LITE = /(^|\.)(exe\.io|exey\.io|exey\.app|exeygo\.com|exey\.go|exe-links\.com|exeo\.app|exego\.app|cuty\.io|cuttty\.com|ouo\.io|ouo\.press|uii\.io|ouo\.today|bc\.vc|bcvc\.xyz|bcvc\.live|bcvcgo\.xyz|tpi\.li|oii\.la|tei\.ai|tii\.ai|iir\.ai|oko\.sh)$/.test(H);
  const log = [];
  let SPEED = +get('vs_speed', 10) || 10;

  // ---------- stealth: patched functions look native ----------
  const nat = new WeakMap(), fts = Function.prototype.toString;
  const mark = (f, n) => { nat.set(f, 'function ' + n + '() { [native code] }'); return f; };
  const ts = function toString() { return nat.has(this) ? nat.get(this) : fts.call(this); };
  nat.set(ts, 'function toString() { [native code] }');
  if (!LITE) try { Function.prototype.toString = ts; } catch (e) {}
  const getter = (o, p, v) => { try { Object.defineProperty(o, p, { get: mark(function () { return v; }, 'get ' + p), set: undefined, configurable: true }); } catch (e) {} };

  if (!LITE) {
  // ---------- 1. tab-focus / visibility freeze protection ----------
  getter(Document.prototype, 'hidden', false); getter(Document.prototype, 'webkitHidden', false);
  getter(Document.prototype, 'visibilityState', 'visible'); getter(Document.prototype, 'webkitVisibilityState', 'visible');
  try { D.hasFocus = mark(function hasFocus() { return true; }, 'hasFocus'); } catch (e) {}
  const stopEv = e => { if (e.target === W || e.target === D) e.stopImmediatePropagation(); };
  ['blur'].forEach(n => { W.addEventListener(n, stopEv, true); D.addEventListener(n, stopEv, true); });
  try { Object.defineProperty(W, 'onblur', { get: () => null, set() {}, configurable: true }); Object.defineProperty(D, 'onvisibilitychange', { get: () => null, set() {}, configurable: true }); } catch (e) {}

  // ---------- 2. anti-adblock bait stubs ----------
  W.canRunAds = true;
  function Stub() {}
  Object.assign(Stub.prototype, {
    onDetected() { return this; }, onNotDetected(f) { try { typeof f === 'function' && setTimeout(f, 0); } catch (e) {} return this; },
    on(d, f) { if (!d) try { setTimeout(f, 0); } catch (e) {} return this; }, check() { return true; },
    setOption() { return this; }, emitEvent() { return this; }, clearEvent() { return this; }
  });
  ['FuckAdBlock', 'BlockAdBlock'].forEach(n => { if (!(n in W)) W[n] = Stub; });
  ['fuckAdBlock', 'blockAdBlock'].forEach(n => { if (!(n in W)) W[n] = new Stub(); });

  // ---------- 2b. size-based anti-adblock checks: "bait" elements never report 0 size ----------
  ['adBlockActive', 'AdBlockActive', 'adblock', 'isAdBlocked', 'adBlockDetected', 'AdBlockDetected', 'adbDetected', 'hasAdBlocker', 'adBlockEnabled', 'ab_detected', 'ad_block_detected', 'adblock_detected'].forEach(k => { if (!(k in W)) try { W[k] = false; } catch (e) {} });
  ['adsAllowed', 'adAllowed', 'adsEnabled', 'killads', 'adsLoaded', 'allowads'].forEach(k => { if (!(k in W)) try { W[k] = true; } catch (e) {} });
  const BAIT = /(^|[\s_-])(adsbox|ads-box|ad-banner|banner-ads|ad-placement|ad-slot|ads-container|afs_ads|advertisement|adsbygoogle|doubleclick|textads|pub_300x250|ad_unit)($|[\s_-])/i;
  const isBait = el => { try { return BAIT.test((typeof el.className === 'string' ? el.className : '') + ' ' + (el.id || '')); } catch (e) { return false; } };
  ['offsetHeight', 'offsetWidth', 'clientHeight', 'clientWidth'].forEach(prop => {
    const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop) || Object.getOwnPropertyDescriptor(Element.prototype, prop);
    if (d && d.get) { try { Object.defineProperty(d === Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop) ? HTMLElement.prototype : Element.prototype, prop, { get: mark(function () { const v = d.get.call(this); return v === 0 && isBait(this) ? 11 : v; }, 'get ' + prop), configurable: true }); } catch (e) {} }
  });
  const gbcr = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = mark(function getBoundingClientRect() {
    const r = gbcr.call(this);
    return (r.width === 0 || r.height === 0) && isBait(this) ? { x: r.x, y: r.y, top: r.top, left: r.left, width: 11, height: 11, right: r.left + 11, bottom: r.top + 11, toJSON() {} } : r;
  }, 'getBoundingClientRect');
  // detector libraries are neutralised by name (script tags and fetch/XHR)
  const DET = /(fuckadblock|blockadblock|detectadblock|adblockdetect|antiadblock|adblock-?detector|ad-?block-?check)/i;
  const setAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = mark(function setAttribute(n, v) { if (this.tagName === 'SCRIPT' && /^src$/i.test(n) && DET.test(String(v))) { log.push('blocked detector script: ' + String(v).slice(0, 80)); return setAttr.call(this, n, 'data:text/javascript,'); } return setAttr.apply(this, arguments); }, 'setAttribute');
  const rf = W.fetch; if (rf) W.fetch = mark(function fetch(u) { if (DET.test(String(u && u.url || u))) return Promise.resolve(new Response('', { status: 200 })); return rf.apply(this, arguments); }, 'fetch');

  // ---------- 3. pop-under guard: window.open only right after a real tap/click ----------
  let gesture = 0;
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(n => W.addEventListener(n, e => { if (e.isTrusted) gesture = Date.now(); }, true));
  const realOpen = W.open;
  if (!popOff) W.open = mark(function open() {
    if (Date.now() - gesture < 1200) return realOpen.apply(W, arguments);
    log.push('blocked pop-up: ' + String(arguments[0]).slice(0, 80)); toast('Blocked a pop-up');
    return { closed: true, close() {}, focus() {}, blur() {}, postMessage() {}, location: {}, document: {} };
  }, 'open');

  }

  // ---------- 4. timers: registry + countdown boost (pauses itself while a captcha / Cloudflare check is on screen) ----------
  const RT = { st: W.setTimeout, si: W.setInterval, ct: W.clearTimeout, ci: W.clearInterval };
  const rnow = Date.now.bind(Date), rperf = performance.now.bind(performance);
  const reg = new Map(); let nid = 1000000, fast = false, wanted = false, paused = false, tickSeen = false, offT = 0, offP = 0, wr = 0, pr = 0, workersWrapped = 0, bc = null;
  // page time never jumps backwards: switching the boost off keeps the time already gained
  const vnow = () => fast ? Math.floor(rnow() + offT + (rnow() - wr) * (SPEED - 1)) : rnow() + offT;
  const vperf = () => fast ? rperf() + offP + (rperf() - pr) * (SPEED - 1) : rperf() + offP;
  const inRange = d => d >= 300 && d <= 45000;
  const eff = d => (fast && inRange(d)) ? Math.max(15, d / SPEED) : d;
  function start(id, e, leftV) {
    const d = leftV == null ? e.delay : leftV;
    e.due = vnow() + d;
    e.h = (e.iv ? RT.si : RT.st).call(W, function () { if (!e.iv) reg.delete(id); else e.due = vnow() + e.delay; return e.fn.apply(W, e.args); }, eff(e.iv ? e.delay : d));
    reg.set(id, e);
  }
  function mk(iv) {
    return mark(function (fn, delay) {
      if (typeof fn !== 'function') return (iv ? RT.si : RT.st).apply(W, arguments);
      delay = +delay || 0;
      if (delay >= 900 && delay <= 1100) tickSeen = true;
      const id = ++nid; start(id, { iv, fn, args: [].slice.call(arguments, 2), delay }, delay);
      return id;
    }, iv ? 'setInterval' : 'setTimeout');
  }
  const clr = mark(function (id) { const e = reg.get(id); if (e) { (e.iv ? RT.ci : RT.ct).call(W, e.h); reg.delete(id); } else RT.ct.call(W, id); }, 'clearTimeout');
  W.setTimeout = mk(false); W.setInterval = mk(true); W.clearTimeout = clr; W.clearInterval = clr;
  Date.now = mark(function now() { return vnow(); }, 'now');
  performance.now = mark(function now() { return vperf(); }, 'now');
  const raf = W.requestAnimationFrame;
  if (raf && !LITE) W.requestAnimationFrame = mark(function requestAnimationFrame(cb) { return typeof cb === 'function' ? raf.call(W, function (t) { return cb(fast ? vperf() : t); }) : raf.apply(W, arguments); }, 'requestAnimationFrame');

  // timers that live inside Web Workers (only for workers created while the boost is on)
  if (!LITE && W.Worker) {
    const RW = W.Worker;
    W.Worker = mark(function Worker(url, opts) {
      if (!fast || (opts && opts.type === 'module')) return new RW(url, opts);
      try {
        const abs = new URL(url, location.href).href;
        const pre = '(function(){var S=' + SPEED + ',f=true,st=self.setTimeout,si=self.setInterval;try{var bc=new BroadcastChannel("__vs_fast");bc.onmessage=function(e){f=!!e.data}}catch(e){}' +
          'var sc=function(d){return f&&d>=300&&d<=45000?Math.max(15,d/S):d};' +
          'self.setTimeout=function(fn,d){var a=[].slice.call(arguments);a[1]=sc(+d||0);return st.apply(self,a)};' +
          'self.setInterval=function(fn,d){var a=[].slice.call(arguments);a[1]=sc(+d||0);return si.apply(self,a)};})();importScripts(' + JSON.stringify(abs) + ');';
        const w = new RW(URL.createObjectURL(new Blob([pre], { type: 'text/javascript' })), opts);
        workersWrapped++; log.push('boosted a background worker'); return w;
      } catch (e) { return new RW(url, opts); }
    }, 'Worker');
    W.Worker.prototype = RW.prototype;
  }

  function setFast(on) {
    if (on === fast) return;
    if (on) { wr = rnow(); pr = rperf(); fast = true; }
    else { offT += (rnow() - wr) * (SPEED - 1); offP += (rperf() - pr) * (SPEED - 1); fast = false; }
    [...reg.entries()].forEach(([id, e]) => {
      if (!inRange(e.delay)) return;
      (e.iv ? RT.ci : RT.ct).call(W, e.h);
      start(id, e, Math.max(0, e.due - vnow()));
    });
    if (workersWrapped) { try { bc = bc || new BroadcastChannel('__vs_fast'); bc.postMessage(on); } catch (e) {} }
  }

  // a real captcha / Cloudflare check that is on screen and not finished yet -> run at normal speed so it can complete
  const CAP = '.cf-turnstile,iframe[src*="challenges.cloudflare.com"],.g-recaptcha,iframe[src*="recaptcha"],.h-captcha,iframe[src*="hcaptcha"]';
  const TOK = 'input[name="cf-turnstile-response"],textarea[name="g-recaptcha-response"],textarea[name="h-captcha-response"],input[name="h-captcha-response"]';
  function captchaPending() {
    const els = D.querySelectorAll(CAP); if (!els.length) return false;
    let shown = false;
    for (const el of els) { const r = el.getBoundingClientRect(); if (r.width > 40 && r.height > 20 && getComputedStyle(el).visibility !== 'hidden') { shown = true; break; } }
    if (!shown) return false;
    for (const t of D.querySelectorAll(TOK)) if (t.value) return false;
    return true;
  }
  let gateIv = 0, gateN = 0;
  function gate() {
    if (!wanted) return;
    if (++gateN > 3000) { RT.ci.call(W, gateIv); return; }
    const hold = captchaPending();
    if (hold && fast) { setFast(false); paused = true; log.push('boost paused: verification in progress'); toast('Boost paused while verifying'); }
    else if (!hold && !fast) { const was = paused; setFast(true); paused = false; if (was) { log.push('boost resumed'); } toast((was ? 'Boost resumed x' : 'Countdown boost x') + SPEED); }
  }
  function boost(why) {
    if (wanted) return; wanted = true;
    log.push('countdown boost x' + SPEED + ' (' + why + ')');
    if (!LITE) { scrollFix = true; unlock(); }
    gate(); gateIv = RT.si.call(W, gate, 400);
  }
  const CD = /(please\s+)?wait\s*(for\s*)?\d+|\d+\s*(seconds?|secs?)\s*(left|remaining|to\s+continue)|(continue|redirect(ing)?|skip|proceed|unlock|link|download)[^.\n]{0,25}\bin\s*\d+|get\s*link\s*in|your\s+link\s+(is|will\s+be)\s+(ready|generated)|please\s+wait\s+while|generating\s+(your\s+)?link|verifying\s+(you|the\s+link)/i;
  const PHRASE = /click\s+on\s+any\b.{0,25}images?.{0,80}(wait|back)|wait\s+for\s+the\s+link/i;
  function countdownVisible() {
    const b = D.body; if (!b) return false;
    const t = (b.innerText || b.textContent || '').slice(0, 4000);
    if (PHRASE.test(t)) return 'phrase';
    if (CD.test(t)) return true;
    const els = D.querySelectorAll('[id*="count" i],[class*="count" i],[id*="timer" i],[class*="timer" i],[id*="wait" i],[id*="second" i],[class*="second" i]');
    for (const el of els) { if (/^\s*\d{1,3}\s*(s|sec|secs|seconds)?\s*$/i.test(el.textContent || '')) return true; }
    return false;
  }
  // timer inspector: shows what the page is really running, so stuck countdowns can be diagnosed
  function showTimers() {
    const rows = [...reg.entries()].map(([id, e]) => (e.iv ? 'interval ' : 'timeout  ') + String(e.delay).padStart(6) + ' ms  left ' + String(Math.max(0, Math.round(e.due - vnow()))).padStart(6) + '  ' + String(e.fn).replace(/\s+/g, ' ').slice(0, 70));
    const head = 'boost=' + (fast ? 'ON' : 'off') + '  wanted=' + wanted + '  paused=' + paused + '  captcha-pending=' + captchaPending() + '  speed=x' + SPEED + '  timers=' + reg.size + '  workers-boosted=' + workersWrapped + '  1s-ticker=' + tickSeen;
    const old = D.getElementById('__vs_panel'); if (old) old.remove();
    const p = D.createElement('div'); p.id = '__vs_panel';
    p.style.cssText = 'all:initial;position:fixed;left:0;right:0;top:0;max-height:75vh;overflow:auto;background:#0b0b10;color:#9fe8b8;font:11px/1.35 monospace;z-index:2147483647;padding:8px;white-space:pre-wrap;word-break:break-all';
    p.textContent = head + '\n\n' + (rows.join('\n') || '(no timers registered)') + '\n\n' + log.slice(-12).join('\n') + '\n\n[tap to close]';
    p.onclick = () => p.remove(); (D.body || D.documentElement).appendChild(p);
  }
  try { Object.defineProperty(W, '__venomShield', { value: { boost, showTimers }, enumerable: false }); } catch (e) {}
  menu('Venom Shield: boost countdown NOW', () => boost('manual'));
  menu('Venom Shield: show timers (diagnose)', showTimers);
  menu('Venom Shield: boost speed x' + SPEED + ' (tap to cycle 5/10/25)', () => { put('vs_speed', SPEED === 5 ? 10 : SPEED === 10 ? 25 : 5); alert('Speed changed. Reload the page.'); });
  menu('Venom Shield: show what was removed', () => alert(log.join('\n') || 'Nothing removed yet.'));

  // ---------- 5. scroll-freeze fix (only after a wall / countdown is found) ----------
  let scrollFix = false;
  const SCR = /^(wheel|mousewheel|DOMMouseScroll|touchmove|scroll)$/;
  const pd = Event.prototype.preventDefault;
  if (!LITE) Event.prototype.preventDefault = mark(function preventDefault() {
    if (scrollFix && SCR.test(this.type)) { const t = this.target; if (!(t && t.closest && t.closest('canvas,[class*="map" i],[class*="swiper" i],[class*="slider" i],[class*="carousel" i],input[type=range]'))) return; }
    return pd.apply(this, arguments);
  }, 'preventDefault');
  const LOCK = /^(modal-open|no-?scroll|overflow-hidden|scroll-?lock(ed)?|is-locked|lock-?scroll|disable-?scroll|has-?popup|popup-open|stop-?scrolling|noscroll|fixed|locked|overlay-open|menu-open-lock)$/i;
  function unlock() {
    [D.documentElement, D.body].forEach(el => {
      if (!el) return;
      [...el.classList].forEach(c => { if (LOCK.test(c)) el.classList.remove(c); });
      const cs = getComputedStyle(el);
      if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') { el.style.setProperty('overflow', 'auto', 'important'); el.style.setProperty('overflow-y', 'auto', 'important'); }
      if (el === D.body && cs.position === 'fixed') { el.style.setProperty('position', 'static', 'important'); }
      if (cs.pointerEvents === 'none') el.style.setProperty('pointer-events', 'auto', 'important');
      if (cs.filter && cs.filter !== 'none') el.style.setProperty('filter', 'none', 'important');
      el.style.setProperty('touch-action', 'auto', 'important');
    });
    D.querySelectorAll('[style*="blur"],[class*="blur" i]').forEach(c => { if (getComputedStyle(c).filter !== 'none') c.style.setProperty('filter', 'none', 'important'); });
    if (D.body) [...D.body.children].forEach(c => { if (c.tagName !== 'SCRIPT') { const f = getComputedStyle(c).filter; if (f && /blur/.test(f)) c.style.setProperty('filter', 'none', 'important'); } });
  }

  // ---------- 6. wall detection (runs only when something is on screen) ----------
  const AD = /ad[\s-]?block|ads?[\s-]?blocker|disable (your |the )?(ads?|ad[\s-]?block)|turn(ing)? off (your |the )?(ads?|ad[\s-]?block)|pause (your )?ad|(allow|whitelist|white-list) (us|this site|our site|ads)|support (us|our site|this site) by (disabling|allowing|whitelisting)|anti[\s-]?adblock|brave shield|ublock|adguard|detected (an? )?ad/i;
  const AGE = /\b(18|21)\s*\+|(are you|must be|be|over|above|at least|older than)\s*(over\s*)?(the age of\s*)?(18|21)\b|adults?[\s-]?only|age[\s-]?(verification|check|gate|confirmation)|verify (your )?age|(i am|i'm|im)\s*(over|at least|above)?\s*(18|21)|enter\s+(the\s+)?site|(18|21)\s*(years|yrs)|legal age|mature content|explicit content/i;
  const CK = /(we|this (web)?site|our (web)?site) uses? cookies|cookies? (consent|policy|settings|preferences|notice)|accept (all )?cookies|gdpr|manage (your )?(privacy|consent|preferences)|your privacy (choices|matters)/i;
  const NEWS = /subscribe to (our )?newsletter|sign up (for|to) (our )?(newsletter|updates|alerts)|join (our )?(mailing list|newsletter)/i;
  const PUSH = /(allow|enable) (push )?notifications|click (on )?"?allow"?|turn on notifications|show notifications/i;
  const KINDS = [['adblock wall', AD], ['18+ gate', AGE], ['cookie banner', CK], ['newsletter popup', NEWS], ['notification prompt', PUSH]];
  const SAFE = 'iframe[src*="recaptcha"],iframe[src*="hcaptcha"],iframe[src*="turnstile"],iframe[src*="challenges.cloudflare"],.g-recaptcha,.h-captcha,.cf-turnstile,input[type=password]';
  const CAND = '[class*="modal" i],[class*="popup" i],[class*="overlay" i],[class*="consent" i],[class*="cookie" i],[class*="adblock" i],[class*="gdpr" i],[class*="dialog" i],[id*="modal" i],[id*="popup" i],[id*="overlay" i],[id*="consent" i],[id*="cookie" i],[id*="adblock" i],[role=dialog],[aria-modal=true],dialog[open]';
  const done = new WeakSet(); let killed = 0;

  function overlayLike(el) {
    const cs = getComputedStyle(el), pos = cs.position;
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (pos !== 'fixed' && pos !== 'absolute' && pos !== 'sticky') return false;
    const r = el.getBoundingClientRect(), vw = W.innerWidth || 1, vh = W.innerHeight || 1;
    const area = (r.width * r.height) / (vw * vh), z = parseInt(cs.zIndex, 10) || 0;
    return area >= 0.25 || (z >= 50 && area >= 0.01);
  }
  function check(el) {
    if (!el || done.has(el) || el === D.body || el === D.documentElement || el.tagName === 'SCRIPT' || el.tagName === 'IFRAME' || el.tagName === 'VIDEO') return;
    done.add(el);
    const text = (el.innerText || el.textContent || '').trim();
    if (text.length < 15 || text.length > 2500) return;
    const kind = KINDS.find(k => k[1].test(text)); if (!kind) return;
    if (el.matches(SAFE) || el.querySelector(SAFE)) return;
    if (!overlayLike(el)) return;
    if (kind[0] === '18+ gate' && tryAccept(el)) { killed++; log.push('accepted 18+ gate'); toast('Accepted 18+ gate'); RT.st.call(W, () => { if (el.isConnected && getComputedStyle(el).display !== 'none') { el.style.setProperty('display', 'none', 'important'); } backdrops(); scrollFix = true; unlock(); }, 900); return; }
    el.style.setProperty('display', 'none', 'important'); el.setAttribute('data-venom-hidden', kind[0]);
    killed++; log.push('removed ' + kind[0] + ': ' + text.slice(0, 60).replace(/\s+/g, ' '));
    toast('Removed ' + kind[0]);
    backdrops(); scrollFix = true; unlock();
  }
  const ACCEPT = /^(i\s*(am|'m|’m)\s*(over|above|at least)?\s*(18|21)\+?.*|(18|21)\s*\+?\s*(years?)?\s*(or older|and over)?|enter(\s+(site|here|now))?|yes(,?\s*i('m|\s*am).*)?|i\s*agree|agree|accept|continue|confirm|ok(ay)?|proceed|i\s*am\s*of\s*(legal\s*)?age)$/i;
  const DECLINE = /exit|leave|no\b|under|decline|cancel|not\s+(yet|old)|minor|close\s+site|back/i;
  function tryAccept(el) {
    const cands = el.querySelectorAll('button,a,input[type=button],input[type=submit],[role=button],div,span');
    let best = null;
    for (const c of cands) {
      if (c.children.length > 2) continue;
      const t = ((c.value || c.textContent) || '').trim();
      if (t.length < 2 || t.length > 45 || DECLINE.test(t) || !ACCEPT.test(t)) continue;
      if ([...c.children].some(k => (k.textContent || '').trim() === t)) continue;
      const strong = /18|21|enter|agree|yes/i.test(t);
      if (!best || (strong && !best.strong)) best = { c, strong };
    }
    if (!best) return false;
    try {
      const c = best.c;
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach(n => c.dispatchEvent(new MouseEvent(n, { bubbles: true, cancelable: true, view: W })));
      c.click();
      el.querySelectorAll('input[type=checkbox]').forEach(k => { if (!k.checked) k.click(); });
      return true;
    } catch (e) { return false; }
  }
  function backdrops() {
    const list = [...(D.body ? D.body.children : []), ...D.querySelectorAll('[class*="backdrop" i],[class*="overlay" i],[class*="mask" i],[class*="curtain" i],[class*="blocker" i]')];
    list.forEach(el => {
      if (done.has(el) || el.tagName === 'SCRIPT' || el.tagName === 'VIDEO' || el.tagName === 'IFRAME') return;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.display === 'none') return;
      const r = el.getBoundingClientRect();
      if (r.width * r.height < 0.5 * (W.innerWidth || 1) * (W.innerHeight || 1)) return;
      if (((el.textContent || '').trim().length) > 30 || el.querySelector('video,canvas,img,input,button,a')) return;
      done.add(el); el.style.setProperty('display', 'none', 'important'); log.push('removed backdrop');
    });
  }
  function forceClear() {
    let n = 0; const vw = W.innerWidth || 1, vh = W.innerHeight || 1;
    const els = [...(D.body ? D.body.children : []), ...D.querySelectorAll('div,section,aside,dialog,[class*="overlay" i],[class*="modal" i],[class*="popup" i]')];
    els.forEach(el => {
      if (el.tagName === 'SCRIPT' || el.tagName === 'VIDEO' || el.tagName === 'IFRAME' || el.id === '__vs_toast') return;
      const cs = getComputedStyle(el); if (cs.display === 'none' || (cs.position !== 'fixed' && cs.position !== 'absolute')) return;
      const r = el.getBoundingClientRect(); if (r.width * r.height < 0.35 * vw * vh) return;
      if (el.matches(SAFE) || el.querySelector(SAFE) || el.querySelector('video')) return;
      el.style.setProperty('display', 'none', 'important'); n++;
    });
    scrollFix = true; unlock(); toast(n ? 'Cleared ' + n + ' overlay(s)' : 'No overlay found'); log.push('force-clear: ' + n);
  }
  menu('Venom Shield: clear overlay / unfreeze NOW', forceClear);
  function scan() {
    if (!D.body) return;
    [...D.body.children].forEach(check);
    D.querySelectorAll(CAND).forEach(check);
  }
  let timer = 0, last = 0;
  function sched() { if (timer) return; const wait = Math.max(250, 700 - (rnow() - last)); timer = RT.st.call(W, () => { timer = 0; last = rnow(); try { scan(); } catch (e) {} }, wait); }

  // ---------- 7. cosmetic ad-network boxes (specific selectors only, to avoid tripping bait checks) ----------
  const st = D.createElement('style');
  st.textContent = 'ins.adsbygoogle,[id^="google_ads_iframe"],[id^="div-gpt-ad"],iframe[src*="doubleclick.net"],iframe[src*="googlesyndication.com"],iframe[src*="adsterra"],iframe[src*="exoclick"],iframe[src*="popads"],[data-google-query-id],[id*="taboola" i],[class*="taboola" i],[id^="outbrain"],.OUTBRAIN,[data-ad-slot],[data-ad-client]{display:none!important}';
  if (!LITE) (D.head || D.documentElement).appendChild(st);

  // ---------- toast ----------
  function toast(msg) {
    try {
      if (!D.body) return;
      let t = D.getElementById('__vs_toast');
      if (!t) { t = D.createElement('div'); t.id = '__vs_toast'; t.style.cssText = 'all:initial;position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#14b878;color:#04130c;font:600 13px system-ui;padding:7px 14px;border-radius:18px;z-index:2147483647;pointer-events:none;opacity:.95'; D.body.appendChild(t); }
      t.textContent = 'Venom: ' + msg; clearTimeout(t._h); t._h = RT.st.call(W, () => t.remove(), 2200);
    } catch (e) {}
  }

  // ---------- wiring ----------
  function init() {
    if (!LITE) {
      sched();
      [300, 1000, 2500, 5000, 9000].forEach(ms => RT.st.call(W, sched, ms));
      try { new MutationObserver(sched).observe(D.body, { childList: true }); } catch (e) {}
      try {
        new MutationObserver(() => { if (killed || wanted) unlock(); }).observe(D.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
        new MutationObserver(() => { if (killed || wanted) unlock(); }).observe(D.body, { attributes: true, attributeFilter: ['class', 'style'] });
      } catch (e) {}
    }
    let n = 0;
    const iv = RT.si.call(W, () => { if (wanted || ++n > 240) return RT.ci.call(W, iv); const c = countdownVisible(); if (c === 'phrase' || (c && tickSeen)) boost(c === 'phrase' ? 'wait-for-link page' : 'countdown detected'); }, 500);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
